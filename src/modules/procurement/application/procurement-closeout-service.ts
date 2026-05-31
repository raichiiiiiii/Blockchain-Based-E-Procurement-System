import { randomUUID } from 'node:crypto';
import type { DeliveryEvidenceRepository } from './delivery-evidence-repository.js';
import type { ProcurementCloseoutRepository } from './procurement-closeout-repository.js';
import type { ProcurementInvoiceRepository } from './invoice-repository.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';
import type { SourceToAwardRepository } from './source-to-award-repository.js';
import type {
  ProcurementCaseCloseout,
  ProcurementCaseSummary,
  SupplierPerformanceSummary,
} from '../domain/procurement-closeout.js';
import type { ProcurementOrder } from '../domain/procurement-order.js';
import type { DeliveryEvidenceRecord } from '../domain/delivery-evidence.js';
import type { ProcurementInvoice } from '../domain/invoice.js';

export type ProcurementCloseoutActor = {
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type ProcurementCloseoutResult =
  | { status: 'ok'; closeout?: ProcurementCaseCloseout; summary?: ProcurementCaseSummary; performance?: SupplierPerformanceSummary }
  | { status: 'list'; performance: SupplierPerformanceSummary[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: string }
  | { status: 'notFound'; reason: string }
  | { status: 'conflict'; reason: string };

export type ProcurementCloseoutDependencies = {
  orderRepository: ProcurementOrderRepository;
  deliveryEvidenceRepository: DeliveryEvidenceRepository;
  invoiceRepository: ProcurementInvoiceRepository;
  closeoutRepository: ProcurementCloseoutRepository;
  sourceToAwardRepository?: SourceToAwardRepository;
  now?: () => string;
  idGenerator?: () => string;
};

function hasRole(actor: ProcurementCloseoutActor, role: string): boolean {
  return actor.actorRoleCodes?.includes(role) === true;
}

function privileged(actor: ProcurementCloseoutActor): boolean {
  return actor.actorRoleCodes?.some(role => ['administrator', 'auditor', 'regulator', 'securityOperator'].includes(role)) === true;
}

function requireActor(actor: ProcurementCloseoutActor): ProcurementCloseoutResult | null {
  if (!actor.actorUserId || !actor.actorOrganizationId) {
    return { status: 'unauthorized' };
  }
  return null;
}

function proofCoverage(evidence: DeliveryEvidenceRecord[]): number {
  if (evidence.length === 0) {
    return 0;
  }

  const withProof = evidence.filter(record => {
    const status = record.blockchainAnchor?.anchorStatus;
    return status === 'anchored' || status === 'pending' || status === 'notAnchored' || status === 'failed';
  }).length;
  return Math.round((withProof / evidence.length) * 100);
}

function invoiceExceptions(invoices: ProcurementInvoice[]): number {
  return invoices.filter(invoice => invoice.status === 'matchFailed' || invoice.matchResult.status === 'failed').length;
}

function scoreFor(input: {
  orders: ProcurementOrder[];
  evidence: DeliveryEvidenceRecord[];
  invoices: ProcurementInvoice[];
  closeouts: ProcurementCaseCloseout[];
}): SupplierPerformanceSummary {
  const orderCount = input.orders.length;
  const deliveryEvidenceCount = input.evidence.length;
  const invoiceCount = input.invoices.length;
  const invoiceExceptionCount = invoiceExceptions(input.invoices);
  const proofCoveragePercent = proofCoverage(input.evidence);
  const base = 70;
  const deliveryBonus = orderCount > 0 ? Math.min(15, Math.round((deliveryEvidenceCount / orderCount) * 15)) : 0;
  const proofBonus = Math.round(proofCoveragePercent * 0.1);
  const exceptionPenalty = invoiceExceptionCount * 10;
  const closeoutBonus = input.closeouts.length > 0 ? 5 : 0;

  return {
    supplierOrganizationId: input.orders[0]?.supplierOrganizationId ?? input.closeouts[0]?.supplierOrganizationId ?? 'unknown',
    orderCount,
    deliveryEvidenceCount,
    invoiceCount,
    invoiceExceptionCount,
    proofCoveragePercent,
    closeoutCount: input.closeouts.length,
    score: Math.max(0, Math.min(100, base + deliveryBonus + proofBonus + closeoutBonus - exceptionPenalty)),
    lastUpdatedAt: [
      ...input.orders.map(order => order.updatedAt),
      ...input.evidence.map(record => record.submittedAt),
      ...input.invoices.map(invoice => invoice.updatedAt),
      ...input.closeouts.map(closeout => closeout.closedAt),
    ].sort().pop(),
  };
}

async function resolveCaseOrder(
  caseId: string,
  dependencies: ProcurementCloseoutDependencies,
): Promise<{ order: ProcurementOrder | null; sourceToAwardCaseId?: string }> {
  const order = await dependencies.orderRepository.findById(caseId);
  if (order) {
    return { order };
  }

  const sourceCase = await dependencies.sourceToAwardRepository?.findByCaseId(caseId);
  if (sourceCase?.generatedOrderId) {
    return {
      order: await dependencies.orderRepository.findById(sourceCase.generatedOrderId),
      sourceToAwardCaseId: sourceCase.caseId,
    };
  }

  return { order: null };
}

export async function getProcurementCaseSummary(
  caseId: string,
  actor: ProcurementCloseoutActor,
  dependencies: ProcurementCloseoutDependencies,
): Promise<ProcurementCloseoutResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;

  const { order, sourceToAwardCaseId } = await resolveCaseOrder(caseId, dependencies);
  if (!order) return { status: 'notFound', reason: 'caseNotFound' };

  const canRead = privileged(actor) ||
    (hasRole(actor, 'buyer') && actor.actorOrganizationId === order.buyerOrganizationId) ||
    (hasRole(actor, 'supplier') && actor.actorOrganizationId === order.supplierOrganizationId);
  if (!canRead) return { status: 'forbidden', reason: 'caseNotVisible' };

  const evidence = await dependencies.deliveryEvidenceRepository.listByOrderId(order.orderId);
  const invoices = await dependencies.invoiceRepository.listByOrderId(order.orderId);
  const closeout = await dependencies.closeoutRepository.findByCaseId(caseId);

  return {
    status: 'ok',
    summary: {
      caseId,
      orderId: order.orderId,
      sourceToAwardCaseId,
      buyerOrganizationId: order.buyerOrganizationId,
      supplierOrganizationId: order.supplierOrganizationId,
      deliveryEvidenceCount: evidence.length,
      invoiceCount: invoices.length,
      invoiceExceptionCount: invoiceExceptions(invoices),
      proofCoveragePercent: proofCoverage(evidence),
      ...(closeout !== null && { closeout }),
    },
  };
}

export async function closeProcurementCase(
  caseId: string,
  actor: ProcurementCloseoutActor & { notes?: string },
  dependencies: ProcurementCloseoutDependencies,
): Promise<ProcurementCloseoutResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;
  if (!hasRole(actor, 'buyer') && !hasRole(actor, 'auditor')) return { status: 'forbidden', reason: 'buyerOrAuditorRequired' };

  const { order } = await resolveCaseOrder(caseId, dependencies);
  if (!order) return { status: 'notFound', reason: 'caseNotFound' };
  if (hasRole(actor, 'buyer') && actor.actorOrganizationId !== order.buyerOrganizationId) {
    return { status: 'forbidden', reason: 'buyerOrganizationMismatch' };
  }
  if (order.status !== 'accepted') return { status: 'conflict', reason: 'orderMustBeAccepted' };

  const evidence = await dependencies.deliveryEvidenceRepository.listByOrderId(order.orderId);
  if (evidence.length === 0) return { status: 'conflict', reason: 'deliveryEvidenceRequired' };

  const invoices = await dependencies.invoiceRepository.listByOrderId(order.orderId);
  const closeouts = await dependencies.closeoutRepository.listBySupplierOrganization(order.supplierOrganizationId);
  const metrics = scoreFor({
    orders: [order],
    evidence,
    invoices,
    closeouts,
  });
  const closedAt = dependencies.now?.() ?? new Date().toISOString();
  const closeout: ProcurementCaseCloseout = {
    closeoutId: `closeout_${dependencies.idGenerator?.() ?? randomUUID()}`,
    caseId,
    orderId: order.orderId,
    buyerOrganizationId: order.buyerOrganizationId,
    supplierOrganizationId: order.supplierOrganizationId,
    closedByUserId: actor.actorUserId as string,
    closedAt,
    status: 'closed',
    notes: actor.notes?.trim() || undefined,
    metrics,
  };

  return { status: 'ok', closeout: await dependencies.closeoutRepository.save(closeout) };
}

export async function getSupplierPerformance(
  supplierOrganizationId: string,
  actor: ProcurementCloseoutActor,
  dependencies: ProcurementCloseoutDependencies,
): Promise<ProcurementCloseoutResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;
  const canRead = privileged(actor) ||
    (hasRole(actor, 'supplier') && actor.actorOrganizationId === supplierOrganizationId) ||
    hasRole(actor, 'buyer');
  if (!canRead) return { status: 'forbidden', reason: 'performanceNotVisible' };

  const orders = (await dependencies.orderRepository.listAll())
    .filter(order => order.supplierOrganizationId === supplierOrganizationId);
  if (orders.length === 0) return { status: 'notFound', reason: 'supplierHasNoOrders' };

  const evidence = (await Promise.all(orders.map(order => dependencies.deliveryEvidenceRepository.listByOrderId(order.orderId)))).flat();
  const invoices = (await Promise.all(orders.map(order => dependencies.invoiceRepository.listByOrderId(order.orderId)))).flat();
  const closeouts = await dependencies.closeoutRepository.listBySupplierOrganization(supplierOrganizationId);

  return {
    status: 'ok',
    performance: scoreFor({
      orders,
      evidence,
      invoices,
      closeouts,
    }),
  };
}
