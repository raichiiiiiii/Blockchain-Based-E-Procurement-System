import { randomUUID } from 'node:crypto';
import type { EscrowRepository } from '../../escrow/application/escrow-repository.js';
import { recordProcureToPayLifecycleEvent } from '../../procurement/application/record-procure-to-pay-lifecycle-event.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import type { PaymentAdapterName, PaymentInstruction, PaymentInstructionStatus } from '../domain/payment-instruction.js';
import type { PaymentInstructionRepository } from './payment-instruction-repository.js';
import type { PaymentPort } from './payment-port.js';

export type PaymentActor = {
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type CreatePaymentInstructionInput = PaymentActor & {
  escrowId?: string;
  amount?: string;
  currency?: string;
  debtorOrganizationId?: string;
  creditorOrganizationId?: string;
  paymentReference?: string;
  adapterName?: PaymentAdapterName;
  sandboxStatus?: PaymentInstructionStatus;
  requestId: string;
};

export type ReconcilePaymentInstructionInput = PaymentActor & {
  paymentInstructionId?: string;
  status?: PaymentInstructionStatus;
  requestId: string;
};

export type PaymentInstructionResult =
  | { status: 'created' | 'updated'; instruction: PaymentInstruction }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: string }
  | { status: 'notFound' }
  | { status: 'conflict'; reason: string };

export type PaymentInstructionServiceDependencies = {
  repository: PaymentInstructionRepository;
  escrowRepository: EscrowRepository;
  adapters: Record<PaymentAdapterName, PaymentPort>;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  now?: () => string;
};

const validStatuses = new Set<PaymentInstructionStatus>([
  'pending',
  'accepted',
  'failed',
  'settled',
  'cancelled',
]);

function trim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function hasRole(actor: PaymentActor, roles: string[]): boolean {
  return actor.actorRoleCodes?.some(role => roles.includes(role)) ?? false;
}

function amountValid(value: string): boolean {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function currencyValid(value: string): boolean {
  return /^[A-Z]{3}$/.test(value);
}

function canCreate(actor: PaymentActor, escrow: Awaited<ReturnType<EscrowRepository['findById']>>): boolean {
  if (!escrow || !actor.actorOrganizationId) {
    return false;
  }

  if (hasRole(actor, ['administrator'])) {
    return true;
  }

  if (hasRole(actor, ['buyer']) && actor.actorOrganizationId === escrow.buyerOrganizationId) {
    return true;
  }

  return hasRole(actor, ['financier']) && actor.actorOrganizationId === escrow.financierOrganizationId;
}

function canRead(actor: PaymentActor, instruction: PaymentInstruction): boolean {
  if (hasRole(actor, ['administrator', 'auditor', 'regulator', 'securityOperator'])) {
    return true;
  }

  return Boolean(
    actor.actorOrganizationId &&
    [instruction.debtorOrganizationId, instruction.creditorOrganizationId].includes(actor.actorOrganizationId),
  );
}

function canReconcile(actor: PaymentActor, instruction: PaymentInstruction): boolean {
  if (hasRole(actor, ['administrator'])) {
    return true;
  }

  return Boolean(
    actor.actorOrganizationId &&
    hasRole(actor, ['financier', 'buyer']) &&
    actor.actorOrganizationId === instruction.debtorOrganizationId,
  );
}

function lifecycleEventTypeForStatus(status: PaymentInstructionStatus): 'settlementInitiated' | 'settlementCompleted' | 'settlementFailed' {
  if (status === 'settled') {
    return 'settlementCompleted';
  }

  if (status === 'failed') {
    return 'settlementFailed';
  }

  return 'settlementInitiated';
}

export async function createPaymentInstruction(
  input: CreatePaymentInstructionInput,
  dependencies: PaymentInstructionServiceDependencies,
): Promise<PaymentInstructionResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  const escrowId = trim(input.escrowId);
  const amount = trim(input.amount);
  const currency = trim(input.currency);
  const adapterName = input.adapterName ?? 'localSandbox';
  const issues: Array<{ path: string; message: string }> = [];

  if (!escrowId) {
    issues.push({ path: 'escrowId', message: 'Escrow id is required' });
  }
  if (!amount || !amountValid(amount)) {
    issues.push({ path: 'amount', message: 'Amount must be greater than zero' });
  }
  if (!currency || !currencyValid(currency)) {
    issues.push({ path: 'currency', message: 'Currency must be a 3-letter uppercase code' });
  }
  if (!dependencies.adapters[adapterName]) {
    issues.push({ path: 'adapterName', message: 'Payment adapter is not supported' });
  }
  if (input.sandboxStatus && !validStatuses.has(input.sandboxStatus)) {
    issues.push({ path: 'sandboxStatus', message: 'Sandbox status is not supported' });
  }

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const escrow = await dependencies.escrowRepository.findById(escrowId as string);
  if (!escrow) {
    return { status: 'notFound' };
  }

  if (!canCreate(input, escrow)) {
    return { status: 'forbidden', reason: 'roleOrOrganizationDenied' };
  }

  if (escrow.status !== 'settlementInstructionReady') {
    return { status: 'conflict', reason: 'escrowNotReadyForPaymentInstruction' };
  }

  const existing = await dependencies.repository.findActiveByEscrowId(escrow.escrowId);
  if (existing) {
    return { status: 'conflict', reason: 'activePaymentInstructionExists' };
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const paymentInstructionId = `payment_${randomUUID()}`;
  const debtorOrganizationId = trim(input.debtorOrganizationId) ?? escrow.financierOrganizationId ?? escrow.buyerOrganizationId;
  const creditorOrganizationId = trim(input.creditorOrganizationId) ?? escrow.supplierOrganizationId;
  const paymentReference = trim(input.paymentReference) ?? `escrow:${escrow.escrowId}`;
  const adapter = dependencies.adapters[adapterName];
  const adapterResult = await adapter.createPaymentInstruction({
    paymentInstructionId,
    escrowId: escrow.escrowId,
    amount: amount as string,
    currency: currency as string,
    debtorOrganizationId,
    creditorOrganizationId,
    paymentReference,
    requestedStatus: input.sandboxStatus,
  });

  const lifecycleEvent = await recordProcureToPayLifecycleEvent(dependencies.lifecycleEventRepository, {
    requestId: input.requestId,
    correlationId: escrow.acceptedOrderReference ?? escrow.orderId,
    caseId: escrow.orderId,
    lifecycleStage: 'settlement',
    eventType: lifecycleEventTypeForStatus(adapterResult.status),
    actorUserId: input.actorUserId,
    targetType: 'paymentInstruction',
    targetId: paymentInstructionId,
    outcome: adapterResult.status === 'failed' ? 'failed' : 'success',
    occurredAt: now,
    recordedAt: now,
    sourceRecordRef: escrow.escrowId,
    metadata: {
      adapterName,
      escrowId: escrow.escrowId,
      paymentExecution: 'sandboxOrManualOnly',
      status: adapterResult.status,
    },
  });

  const instruction: PaymentInstruction = {
    paymentInstructionId,
    escrowId: escrow.escrowId,
    amount: amount as string,
    currency: currency as string,
    debtorOrganizationId,
    creditorOrganizationId,
    status: adapterResult.status,
    paymentReference,
    adapterName,
    adapterReference: adapterResult.adapterReference,
    failureReason: adapterResult.failureReason,
    createdByUserId: input.actorUserId,
    createdAt: now,
    updatedAt: now,
    lifecycleEventIds: lifecycleEvent ? [lifecycleEvent.eventId] : [],
  };

  return {
    status: 'created',
    instruction: await dependencies.repository.save(instruction),
  };
}

export async function getPaymentInstruction(
  paymentInstructionId: string | undefined,
  actor: PaymentActor,
  dependencies: Pick<PaymentInstructionServiceDependencies, 'repository'>,
): Promise<PaymentInstructionResult> {
  const id = trim(paymentInstructionId);
  if (!id) {
    return { status: 'invalidInput', issues: [{ path: 'paymentInstructionId', message: 'Payment instruction id is required' }] };
  }

  const instruction = await dependencies.repository.findById(id);
  if (!instruction) {
    return { status: 'notFound' };
  }

  if (!canRead(actor, instruction)) {
    return { status: 'forbidden', reason: 'roleOrOrganizationDenied' };
  }

  return { status: 'updated', instruction };
}

export async function reconcilePaymentInstruction(
  input: ReconcilePaymentInstructionInput,
  dependencies: PaymentInstructionServiceDependencies,
): Promise<PaymentInstructionResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  const id = trim(input.paymentInstructionId);
  if (!id) {
    return { status: 'invalidInput', issues: [{ path: 'paymentInstructionId', message: 'Payment instruction id is required' }] };
  }

  if (input.status && !validStatuses.has(input.status)) {
    return { status: 'invalidInput', issues: [{ path: 'status', message: 'Payment status is not supported' }] };
  }

  const instruction = await dependencies.repository.findById(id);
  if (!instruction) {
    return { status: 'notFound' };
  }

  if (!canReconcile(input, instruction)) {
    return { status: 'forbidden', reason: 'roleOrOrganizationDenied' };
  }

  const adapter = dependencies.adapters[instruction.adapterName];
  const adapterResult = await adapter.reconcilePaymentStatus(instruction, input.status);
  const now = dependencies.now?.() ?? new Date().toISOString();
  const lifecycleEvent = await recordProcureToPayLifecycleEvent(dependencies.lifecycleEventRepository, {
    requestId: input.requestId,
    correlationId: instruction.escrowId,
    caseId: instruction.escrowId,
    lifecycleStage: 'settlement',
    eventType: lifecycleEventTypeForStatus(adapterResult.status),
    actorUserId: input.actorUserId,
    targetType: 'paymentInstruction',
    targetId: instruction.paymentInstructionId,
    outcome: adapterResult.status === 'failed' ? 'failed' : 'success',
    occurredAt: now,
    recordedAt: now,
    sourceRecordRef: instruction.paymentInstructionId,
    metadata: {
      adapterName: instruction.adapterName,
      previousStatus: instruction.status,
      nextStatus: adapterResult.status,
      paymentExecution: 'sandboxOrManualOnly',
    },
  });

  return {
    status: 'updated',
    instruction: await dependencies.repository.update({
      ...instruction,
      status: adapterResult.status,
      adapterReference: adapterResult.adapterReference ?? instruction.adapterReference,
      failureReason: adapterResult.failureReason,
      updatedAt: now,
      lifecycleEventIds: lifecycleEvent
        ? [...instruction.lifecycleEventIds, lifecycleEvent.eventId]
        : [...instruction.lifecycleEventIds],
    }),
  };
}
