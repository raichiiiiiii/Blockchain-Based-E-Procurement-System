import { createHash, randomUUID } from 'node:crypto';
import type { DeliveryEvidenceRepository } from './delivery-evidence-repository.js';
import type { ProcurementInvoiceRepository } from './invoice-repository.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPaySourceEvent, type ProcureToPaySourceAction } from './procure-to-pay-lifecycle-source-integration.js';
import type { ProcurementInvoice } from '../domain/invoice.js';

export type InvoiceActor = {
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type InvoiceValidationIssue = {
  path: string;
  message: string;
};

export type InvoiceResult =
  | { status: 'ok'; invoice: ProcurementInvoice }
  | { status: 'invalidInput'; issues: InvoiceValidationIssue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: string }
  | { status: 'notFound'; reason: string }
  | { status: 'conflict'; reason: string };

export type InvoiceDependencies = {
  invoiceRepository: ProcurementInvoiceRepository;
  orderRepository: ProcurementOrderRepository;
  deliveryEvidenceRepository: DeliveryEvidenceRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  now?: () => string;
  idGenerator?: () => string;
};

export type SubmitInvoiceInput = InvoiceActor & {
  orderId?: string;
  deliveryEvidenceId?: string;
  amount?: string;
  tax?: string;
  currency?: string;
  invoiceReference?: string;
  invoiceHash?: string;
  requestId: string;
};

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHash(value: string): string {
  const normalized = value.trim().toLowerCase();
  return normalized.startsWith('sha256:') ? normalized : `sha256:${normalized}`;
}

function isHash(value: string | undefined): boolean {
  return value === undefined || /^(sha256:)?[a-f0-9]{64}$/i.test(value.trim());
}

function requireActor(actor: InvoiceActor): InvoiceResult | null {
  if (!actor.actorUserId || !actor.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  return null;
}

function hasRole(actor: InvoiceActor, role: string): boolean {
  return actor.actorRoleCodes?.includes(role) === true;
}

function hasAnyRole(actor: InvoiceActor, roles: readonly string[]): boolean {
  return actor.actorRoleCodes?.some(role => roles.includes(role)) === true;
}

function canSubmitInvoice(actor: InvoiceActor): boolean {
  return hasAnyRole(actor, ['supplier', 'invoiceManager']);
}

function canReviewInvoice(actor: InvoiceActor, invoice: ProcurementInvoice): boolean {
  if (hasRole(actor, 'financier')) {
    return true;
  }

  if (hasAnyRole(actor, ['buyer', 'invoiceManager', 'paymentReadinessApprover'])) {
    return actor.actorOrganizationId === invoice.buyerOrganizationId;
  }

  return false;
}

function canReadInvoice(actor: InvoiceActor, invoice: ProcurementInvoice): boolean {
  if (actor.actorRoleCodes?.some(role => ['administrator', 'auditor', 'regulator', 'securityOperator', 'financier'].includes(role))) {
    return true;
  }

  return (
    (hasAnyRole(actor, ['buyer', 'invoiceManager', 'paymentReadinessApprover']) && actor.actorOrganizationId === invoice.buyerOrganizationId) ||
    (hasRole(actor, 'supplier') && actor.actorOrganizationId === invoice.supplierOrganizationId)
  );
}

function buildInvoiceHash(input: {
  orderId: string;
  deliveryEvidenceId?: string;
  supplierOrganizationId: string;
  buyerOrganizationId: string;
  amount: string;
  tax?: string;
  currency: string;
  invoiceReference?: string;
  submittedAt: string;
}): string {
  const canonical = JSON.stringify(input);
  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

function nextId(prefix: string, dependencies: InvoiceDependencies): string {
  return `${prefix}_${dependencies.idGenerator?.() ?? randomUUID()}`;
}

async function appendInvoiceEvent(
  invoice: ProcurementInvoice,
  action: ProcureToPaySourceAction,
  actorUserId: string,
  requestId: string,
  dependencies: InvoiceDependencies,
  metadata?: Record<string, unknown>,
): Promise<ProcurementInvoice> {
  const event = await recordProcureToPaySourceEvent(dependencies.lifecycleEventRepository, {
    requestId,
    actorUserId,
    correlationId: invoice.orderId,
    caseId: invoice.orderId,
    sourceId: invoice.invoiceId,
    sourceAction: action,
    outcome: action === 'invoiceMatchFailed' ? 'failed' : 'success',
    previousEventHash: invoice.latestLifecyclePayloadHash,
    sourcePayloadRef: invoice.invoiceReference,
    sourceRecordRef: invoice.invoiceId,
    metadata,
  });

  return event
    ? {
      ...invoice,
      lifecycleEventIds: [...invoice.lifecycleEventIds, event.eventId],
      latestLifecyclePayloadHash: event.immutableReference.payloadHash,
    }
    : invoice;
}

export async function submitInvoice(
  input: SubmitInvoiceInput,
  dependencies: InvoiceDependencies,
): Promise<InvoiceResult> {
  const actorError = requireActor(input);
  if (actorError) return actorError;
  if (!canSubmitInvoice(input)) return { status: 'forbidden', reason: 'supplierRoleRequired' };

  const orderId = trimOptional(input.orderId);
  const amount = trimOptional(input.amount);
  const currency = trimOptional(input.currency)?.toUpperCase();
  const invoiceReference = trimOptional(input.invoiceReference);
  const deliveryEvidenceId = trimOptional(input.deliveryEvidenceId);
  const tax = trimOptional(input.tax);
  const invoiceHash = trimOptional(input.invoiceHash);
  const issues: InvoiceValidationIssue[] = [];
  if (!orderId) issues.push({ path: 'orderId', message: 'Order is required' });
  if (!amount) issues.push({ path: 'amount', message: 'Invoice amount is required' });
  if (!currency) issues.push({ path: 'currency', message: 'Currency is required' });
  if (!invoiceReference && !invoiceHash) issues.push({ path: 'invoiceReference', message: 'Invoice reference or invoice hash is required' });
  if (!isHash(invoiceHash)) issues.push({ path: 'invoiceHash', message: 'Invoice hash must be a SHA-256 hex value with optional sha256: prefix' });
  if (issues.length > 0) return { status: 'invalidInput', issues };

  const order = await dependencies.orderRepository.findById(orderId as string);
  if (!order) return { status: 'notFound', reason: 'orderNotFound' };
  if (order.supplierOrganizationId !== input.actorOrganizationId) return { status: 'forbidden', reason: 'supplierOrganizationMismatch' };
  if (order.status !== 'accepted') return { status: 'conflict', reason: 'orderMustBeAccepted' };

  if (deliveryEvidenceId) {
    const evidence = await dependencies.deliveryEvidenceRepository.findById(deliveryEvidenceId);
    if (!evidence || evidence.orderId !== order.orderId) return { status: 'notFound', reason: 'deliveryEvidenceNotFound' };
  }

  const submittedAt = dependencies.now?.() ?? new Date().toISOString();
  const normalizedHash = invoiceHash
    ? normalizeHash(invoiceHash)
    : buildInvoiceHash({
      orderId: order.orderId,
      deliveryEvidenceId,
      supplierOrganizationId: order.supplierOrganizationId,
      buyerOrganizationId: order.buyerOrganizationId,
      amount: amount as string,
      tax,
      currency: currency as string,
      invoiceReference,
      submittedAt,
    });

  const existing = await dependencies.invoiceRepository.findByInvoiceHash(normalizedHash);
  if (existing) return { status: 'conflict', reason: 'duplicateInvoiceHash' };

  const invoice: ProcurementInvoice = {
    invoiceId: nextId('invoice', dependencies),
    orderId: order.orderId,
    ...(deliveryEvidenceId !== undefined && { deliveryEvidenceId }),
    supplierOrganizationId: order.supplierOrganizationId,
    buyerOrganizationId: order.buyerOrganizationId,
    submittedByUserId: input.actorUserId as string,
    amount: amount as string,
    ...(tax !== undefined && { tax }),
    currency: currency as string,
    ...(invoiceReference !== undefined && { invoiceReference }),
    invoiceHash: normalizedHash,
    status: 'submitted',
    matchResult: {
      status: 'notChecked',
      issues: [],
    },
    submittedAt,
    updatedAt: submittedAt,
    lifecycleEventIds: [],
  };

  const withEvent = await appendInvoiceEvent(invoice, 'invoiceIssued', input.actorUserId as string, input.requestId, dependencies, {
    orderId: order.orderId,
    deliveryEvidenceId,
    invoiceHash: normalizedHash,
    amount,
    currency,
  });

  return { status: 'ok', invoice: await dependencies.invoiceRepository.save(withEvent) };
}

export async function getInvoice(
  invoiceId: string,
  actor: InvoiceActor,
  dependencies: Pick<InvoiceDependencies, 'invoiceRepository'>,
): Promise<InvoiceResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;
  const invoice = await dependencies.invoiceRepository.findById(invoiceId);
  if (!invoice) return { status: 'notFound', reason: 'invoiceNotFound' };
  if (!canReadInvoice(actor, invoice)) return { status: 'forbidden', reason: 'invoiceNotVisible' };
  return { status: 'ok', invoice };
}

export async function verifyInvoiceMatch(
  invoiceId: string,
  actor: InvoiceActor & { requestId: string },
  dependencies: InvoiceDependencies,
): Promise<InvoiceResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;

  const invoice = await dependencies.invoiceRepository.findById(invoiceId);
  if (!invoice) return { status: 'notFound', reason: 'invoiceNotFound' };
  if (!canReviewInvoice(actor, invoice)) return { status: 'forbidden', reason: 'buyerOrFinancierRequired' };

  const order = await dependencies.orderRepository.findById(invoice.orderId);
  if (!order) return { status: 'notFound', reason: 'orderNotFound' };
  const evidenceRecords = await dependencies.deliveryEvidenceRepository.listByOrderId(invoice.orderId);
  const evidence = invoice.deliveryEvidenceId
    ? evidenceRecords.find(record => record.evidenceId === invoice.deliveryEvidenceId)
    : evidenceRecords[0];

  const issues: string[] = [];
  if (order.amount !== invoice.amount) issues.push('amountMismatch');
  if (order.currency !== invoice.currency) issues.push('currencyMismatch');
  if (!evidence) issues.push('deliveryEvidenceMissing');
  if (order.status !== 'accepted') issues.push('orderNotAccepted');

  const checkedAt = dependencies.now?.() ?? new Date().toISOString();
  const passed = issues.length === 0;
  const nextInvoice: ProcurementInvoice = {
    ...invoice,
    status: passed ? 'matchPassed' : 'matchFailed',
    updatedAt: checkedAt,
    matchResult: {
      status: passed ? 'passed' : 'failed',
      checkedAt,
      checkedByUserId: actor.actorUserId,
      issues,
      orderAmount: order.amount,
      invoiceAmount: invoice.amount,
      deliveryEvidenceId: evidence?.evidenceId,
    },
  };

  const withEvent = await appendInvoiceEvent(
    nextInvoice,
    passed ? 'invoiceMatchPassed' : 'invoiceMatchFailed',
    actor.actorUserId as string,
    actor.requestId,
    dependencies,
    {
      orderId: invoice.orderId,
      invoiceId,
      matchStatus: passed ? 'passed' : 'failed',
      issues,
    },
  );

  return { status: 'ok', invoice: await dependencies.invoiceRepository.save(withEvent) };
}

export async function approveInvoicePayment(
  invoiceId: string,
  actor: InvoiceActor & { requestId: string },
  dependencies: InvoiceDependencies,
): Promise<InvoiceResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;

  const invoice = await dependencies.invoiceRepository.findById(invoiceId);
  if (!invoice) return { status: 'notFound', reason: 'invoiceNotFound' };
  if (!canReviewInvoice(actor, invoice)) return { status: 'forbidden', reason: 'buyerOrFinancierRequired' };
  if (invoice.status !== 'matchPassed') return { status: 'conflict', reason: 'matchMustPassBeforePaymentApproval' };

  const approvedAt = dependencies.now?.() ?? new Date().toISOString();
  const nextInvoice: ProcurementInvoice = {
    ...invoice,
    status: 'paymentApproved',
    paymentApprovedByUserId: actor.actorUserId,
    paymentApprovedAt: approvedAt,
    updatedAt: approvedAt,
  };

  const withEvent = await appendInvoiceEvent(nextInvoice, 'invoicePaymentApproved', actor.actorUserId as string, actor.requestId, dependencies, {
    orderId: invoice.orderId,
    invoiceId,
    readiness: 'sandboxPaymentInstructionReady',
  });

  return { status: 'ok', invoice: await dependencies.invoiceRepository.save(withEvent) };
}

export async function listInvoicesForActor(
  actor: InvoiceActor,
  dependencies: Pick<InvoiceDependencies, 'invoiceRepository'>,
): Promise<InvoiceResult | { status: 'list'; invoices: ProcurementInvoice[] }> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;
  if (hasAnyRole(actor, ['buyer', 'invoiceManager', 'paymentReadinessApprover'])) {
    return { status: 'list', invoices: await dependencies.invoiceRepository.listByBuyerOrganization(actor.actorOrganizationId as string) };
  }
  if (hasRole(actor, 'supplier')) {
    return { status: 'list', invoices: await dependencies.invoiceRepository.listBySupplierOrganization(actor.actorOrganizationId as string) };
  }
  if (actor.actorRoleCodes?.some(role => ['administrator', 'auditor', 'regulator', 'securityOperator', 'financier'].includes(role))) {
    return { status: 'list', invoices: await dependencies.invoiceRepository.listAll() };
  }
  return { status: 'forbidden', reason: 'invoiceReadRoleRequired' };
}
