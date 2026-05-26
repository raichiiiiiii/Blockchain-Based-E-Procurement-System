import type { PaymentInstructionRepository } from '../../payments/application/payment-instruction-repository.js';
import type { ProcurementContractRepository } from '../../contracts/application/contract-repository.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import type { ErpAccountingPort } from './erp-accounting-port.js';
import type { ErpIntegrationJob, ErpProfileType } from '../domain/erp-accounting.js';

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ExportErpArtifactInput = {
  profileType?: ErpProfileType;
  sourceId?: string;
  actorUserId?: string;
  idempotencyKey?: string;
};

export type ImportErpArtifactInput = {
  profileType?: ErpProfileType;
  payload?: Record<string, unknown>;
  actorUserId?: string;
  idempotencyKey?: string;
};

export type ErpServiceResult =
  | { status: 'completed'; job: ErpIntegrationJob }
  | { status: 'invalidInput'; issues: ValidationIssue[] }
  | { status: 'notFound' }
  | { status: 'unsupportedProfile' };

type Dependencies = {
  adapter: ErpAccountingPort;
  orderRepository: ProcurementOrderRepository;
  paymentInstructionRepository: PaymentInstructionRepository;
  contractRepository: ProcurementContractRepository;
};

const exportProfiles = new Set<ErpProfileType>([
  'ublOrder',
  'ublInvoice',
  'ublDespatchAdvice',
  'paymentStatus',
  'journalEvent',
  'ocdsReleasePackage',
]);

const importProfiles = new Set<ErpProfileType>([
  'ublOrder',
  'ublInvoice',
]);

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

function validateExportInput(input: ExportErpArtifactInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!trimmed(input.profileType)) {
    issues.push(issue('profileType', 'profileType is required'));
  }
  if (!trimmed(input.sourceId)) {
    issues.push(issue('sourceId', 'sourceId is required'));
  }
  if (!trimmed(input.actorUserId)) {
    issues.push(issue('actorUserId', 'authenticated actor is required'));
  }
  return issues;
}

function validateImportInput(input: ImportErpArtifactInput): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!trimmed(input.profileType)) {
    issues.push(issue('profileType', 'profileType is required'));
  }
  if (!input.payload || typeof input.payload !== 'object' || Array.isArray(input.payload)) {
    issues.push(issue('payload', 'payload object is required'));
  }
  if (!trimmed(input.actorUserId)) {
    issues.push(issue('actorUserId', 'authenticated actor is required'));
  }
  return issues;
}

export async function exportErpArtifact(
  input: ExportErpArtifactInput,
  dependencies: Dependencies,
): Promise<ErpServiceResult> {
  const issues = validateExportInput(input);
  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const profileType = input.profileType as ErpProfileType;
  if (!exportProfiles.has(profileType)) {
    return { status: 'unsupportedProfile' };
  }

  const context = {
    actorUserId: trimmed(input.actorUserId),
    idempotencyKey: trimmed(input.idempotencyKey) || undefined,
  };
  const sourceId = trimmed(input.sourceId);

  const existing = context.idempotencyKey
    ? await dependencies.adapter.getJobByIdempotencyKey(profileType, context.idempotencyKey)
    : null;
  if (existing) {
    return { status: 'completed', job: existing };
  }

  if (profileType === 'paymentStatus' || profileType === 'journalEvent') {
    const instruction = await dependencies.paymentInstructionRepository.findById(sourceId);
    if (!instruction) {
      return { status: 'notFound' };
    }

    return {
      status: 'completed',
      job: profileType === 'paymentStatus'
        ? await dependencies.adapter.exportPaymentStatus(instruction, context)
        : await dependencies.adapter.exportJournalEvent(instruction, context),
    };
  }

  if (profileType === 'ocdsReleasePackage') {
    const contract = await dependencies.contractRepository.findById(sourceId);
    if (!contract) {
      return { status: 'notFound' };
    }

    return {
      status: 'completed',
      job: await dependencies.adapter.exportContractReleasePackage(contract, context),
    };
  }

  const order = await dependencies.orderRepository.findById(sourceId);
  if (!order) {
    return { status: 'notFound' };
  }

  if (profileType === 'ublInvoice') {
    return {
      status: 'completed',
      job: await dependencies.adapter.exportInvoice(order, context),
    };
  }

  if (profileType === 'ublDespatchAdvice') {
    return {
      status: 'completed',
      job: await dependencies.adapter.exportDespatchAdvice(order, context),
    };
  }

  return {
    status: 'completed',
    job: await dependencies.adapter.exportPurchaseOrder(order, context),
  };
}

export async function importErpArtifact(
  input: ImportErpArtifactInput,
  dependencies: Dependencies,
): Promise<ErpServiceResult> {
  const issues = validateImportInput(input);
  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const profileType = input.profileType as ErpProfileType;
  if (!importProfiles.has(profileType)) {
    return { status: 'unsupportedProfile' };
  }

  const context = {
    actorUserId: trimmed(input.actorUserId),
    idempotencyKey: trimmed(input.idempotencyKey) || undefined,
  };

  const existing = context.idempotencyKey
    ? await dependencies.adapter.getJobByIdempotencyKey(profileType, context.idempotencyKey)
    : null;
  if (existing) {
    return { status: 'completed', job: existing };
  }

  const payload = input.payload ?? {};
  return {
    status: 'completed',
    job: profileType === 'ublOrder'
      ? await dependencies.adapter.importPurchaseOrder(payload, context)
      : await dependencies.adapter.importInvoice(payload, context),
  };
}
