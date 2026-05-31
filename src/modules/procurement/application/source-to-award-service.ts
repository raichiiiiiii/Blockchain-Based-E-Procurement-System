import { randomUUID } from 'node:crypto';
import type { ProcurementOrder } from '../domain/procurement-order.js';
import type {
  SourceToAwardCase,
  SourceToAwardQuotation,
  SourceToAwardRfq,
} from '../domain/source-to-award.js';
import { createProcurementOrder } from './create-procurement-order.js';
import type { ProcurementEligibilityGateway } from './procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import {
  recordProcureToPaySourceEvent,
  type ProcureToPaySourceAction,
} from './procure-to-pay-lifecycle-source-integration.js';
import type { SourceToAwardRepository } from './source-to-award-repository.js';

export type SourceToAwardActor = {
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type SourceToAwardValidationIssue = {
  path: string;
  message: string;
};

export type SourceToAwardResult =
  | { status: 'ok'; sourceCase: SourceToAwardCase; order?: ProcurementOrder }
  | { status: 'list'; sourceCases: SourceToAwardCase[] }
  | { status: 'invalidInput'; issues: SourceToAwardValidationIssue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: string }
  | { status: 'notFound'; reason: string }
  | { status: 'conflict'; reason: string };

export type SourceToAwardDependencies = {
  sourceToAwardRepository: SourceToAwardRepository;
  orderRepository: ProcurementOrderRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  now?: () => string;
  idGenerator?: () => string;
};

type CreateRequisitionInput = SourceToAwardActor & {
  title?: string;
  description?: string;
  estimatedAmount?: string;
  currency?: string;
  requestId: string;
};

type ApproveRequisitionInput = SourceToAwardActor & {
  requisitionId?: string;
  requestId: string;
};

type CreateRfqInput = SourceToAwardActor & {
  requisitionId?: string;
  supplierOrganizationIds?: string[];
  responseDeadline?: string;
  requestId: string;
};

type SubmitQuotationInput = SourceToAwardActor & {
  rfqId?: string;
  amount?: string;
  currency?: string;
  deliveryDays?: number;
  notes?: string;
  requestId: string;
};

type AwardRfqInput = SourceToAwardActor & {
  rfqId?: string;
  quotationId?: string;
  rationale?: string;
  requestId: string;
};

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isBuyer(actor: SourceToAwardActor): boolean {
  return actor.actorRoleCodes?.includes('buyer') === true;
}

function isSupplier(actor: SourceToAwardActor): boolean {
  return actor.actorRoleCodes?.includes('supplier') === true;
}

function isPrivilegedReader(actor: SourceToAwardActor): boolean {
  return actor.actorRoleCodes?.some(role => ['administrator', 'auditor', 'regulator', 'securityOperator'].includes(role)) === true;
}

function requireActor(actor: SourceToAwardActor): SourceToAwardResult | null {
  if (!actor.actorUserId || !actor.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  return null;
}

function sourceCaseVisibleToActor(sourceCase: SourceToAwardCase, actor: SourceToAwardActor): boolean {
  if (isPrivilegedReader(actor)) {
    return true;
  }

  if (!actor.actorOrganizationId) {
    return false;
  }

  return sourceCase.buyerOrganizationId === actor.actorOrganizationId ||
    sourceCase.rfq?.supplierOrganizationIds.includes(actor.actorOrganizationId) === true;
}

function nextId(prefix: string, dependencies: SourceToAwardDependencies): string {
  return `${prefix}_${dependencies.idGenerator?.() ?? randomUUID()}`;
}

async function appendSourceEvent(
  sourceCase: SourceToAwardCase,
  action: ProcureToPaySourceAction,
  targetId: string,
  actorUserId: string,
  requestId: string,
  dependencies: SourceToAwardDependencies,
  metadata?: Record<string, unknown>,
): Promise<SourceToAwardCase> {
  const event = await recordProcureToPaySourceEvent(dependencies.lifecycleEventRepository, {
    requestId,
    actorUserId,
    correlationId: sourceCase.caseId,
    caseId: sourceCase.caseId,
    sourceId: targetId,
    sourceAction: action,
    outcome: 'success',
    previousEventHash: sourceCase.latestLifecyclePayloadHash,
    sourceRecordRef: targetId,
    metadata,
  });

  return event
    ? {
      ...sourceCase,
      lifecycleEventIds: [...sourceCase.lifecycleEventIds, event.eventId],
      latestLifecyclePayloadHash: event.immutableReference.payloadHash,
    }
    : sourceCase;
}

export async function createSourceToAwardRequisition(
  input: CreateRequisitionInput,
  dependencies: SourceToAwardDependencies,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(input);
  if (actorError) return actorError;
  if (!isBuyer(input)) return { status: 'forbidden', reason: 'buyerRoleRequired' };

  const title = trimOptional(input.title);
  const estimatedAmount = trimOptional(input.estimatedAmount);
  const currency = trimOptional(input.currency)?.toUpperCase();
  const description = trimOptional(input.description);
  const issues: SourceToAwardValidationIssue[] = [];

  if (!title) issues.push({ path: 'title', message: 'Requisition title is required' });
  if (!estimatedAmount) issues.push({ path: 'estimatedAmount', message: 'Estimated amount is required' });
  if (!currency) issues.push({ path: 'currency', message: 'Currency is required' });
  if (issues.length > 0) return { status: 'invalidInput', issues };

  const now = dependencies.now?.() ?? new Date().toISOString();
  const caseId = nextId('sta_case', dependencies);
  const requisitionId = nextId('req', dependencies);
  const sourceCase: SourceToAwardCase = {
    caseId,
    buyerOrganizationId: input.actorOrganizationId as string,
    status: 'requisitionPendingApproval',
    requisition: {
      requisitionId,
      title: title as string,
      ...(description !== undefined && { description }),
      estimatedAmount: estimatedAmount as string,
      currency: currency as string,
      requestedByUserId: input.actorUserId as string,
      createdAt: now,
    },
    quotations: [],
    lifecycleEventIds: [],
    createdAt: now,
    updatedAt: now,
  };

  const withEvent = await appendSourceEvent(sourceCase, 'requisitionCreated', requisitionId, input.actorUserId as string, input.requestId, dependencies, {
    buyerOrganizationId: sourceCase.buyerOrganizationId,
    estimatedAmount,
    currency,
  });

  return {
    status: 'ok',
    sourceCase: await dependencies.sourceToAwardRepository.save(withEvent),
  };
}

export async function approveSourceToAwardRequisition(
  input: ApproveRequisitionInput,
  dependencies: SourceToAwardDependencies,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(input);
  if (actorError) return actorError;
  if (!isBuyer(input)) return { status: 'forbidden', reason: 'buyerRoleRequired' };

  const requisitionId = trimOptional(input.requisitionId);
  if (!requisitionId) return { status: 'invalidInput', issues: [{ path: 'requisitionId', message: 'Requisition is required' }] };

  const sourceCase = await dependencies.sourceToAwardRepository.findByRequisitionId(requisitionId);
  if (!sourceCase) return { status: 'notFound', reason: 'requisitionNotFound' };
  if (sourceCase.buyerOrganizationId !== input.actorOrganizationId) return { status: 'forbidden', reason: 'buyerOrganizationMismatch' };
  if (sourceCase.status !== 'requisitionPendingApproval') return { status: 'conflict', reason: 'requisitionAlreadyReviewed' };

  const now = dependencies.now?.() ?? new Date().toISOString();
  const approved: SourceToAwardCase = {
    ...sourceCase,
    status: 'requisitionApproved',
    requisition: {
      ...sourceCase.requisition,
      approvedByUserId: input.actorUserId as string,
      approvedAt: now,
    },
    updatedAt: now,
  };

  const withEvent = await appendSourceEvent(approved, 'requisitionApproved', requisitionId, input.actorUserId as string, input.requestId, dependencies, {
    approvedByUserId: input.actorUserId,
  });

  return { status: 'ok', sourceCase: await dependencies.sourceToAwardRepository.save(withEvent) };
}

export async function issueSourceToAwardRfq(
  input: CreateRfqInput,
  dependencies: SourceToAwardDependencies,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(input);
  if (actorError) return actorError;
  if (!isBuyer(input)) return { status: 'forbidden', reason: 'buyerRoleRequired' };

  const requisitionId = trimOptional(input.requisitionId);
  const supplierOrganizationIds = [...new Set((input.supplierOrganizationIds ?? []).map(id => id.trim()).filter(Boolean))];
  const issues: SourceToAwardValidationIssue[] = [];
  if (!requisitionId) issues.push({ path: 'requisitionId', message: 'Requisition is required' });
  if (supplierOrganizationIds.length === 0) issues.push({ path: 'supplierOrganizationIds', message: 'At least one supplier is required' });
  if (issues.length > 0) return { status: 'invalidInput', issues };

  const sourceCase = await dependencies.sourceToAwardRepository.findByRequisitionId(requisitionId as string);
  if (!sourceCase) return { status: 'notFound', reason: 'requisitionNotFound' };
  if (sourceCase.buyerOrganizationId !== input.actorOrganizationId) return { status: 'forbidden', reason: 'buyerOrganizationMismatch' };
  if (sourceCase.status !== 'requisitionApproved') return { status: 'conflict', reason: 'requisitionMustBeApproved' };

  const now = dependencies.now?.() ?? new Date().toISOString();
  const rfq: SourceToAwardRfq = {
    rfqId: nextId('rfq', dependencies),
    requisitionId: requisitionId as string,
    supplierOrganizationIds,
    issuedByUserId: input.actorUserId as string,
    issuedAt: now,
    responseDeadline: trimOptional(input.responseDeadline),
  };

  const nextCase: SourceToAwardCase = {
    ...sourceCase,
    status: 'rfqIssued',
    rfq,
    updatedAt: now,
  };
  const withEvent = await appendSourceEvent(nextCase, 'rfqIssued', rfq.rfqId, input.actorUserId as string, input.requestId, dependencies, {
    supplierOrganizationIds,
    responseDeadline: rfq.responseDeadline,
  });

  return { status: 'ok', sourceCase: await dependencies.sourceToAwardRepository.save(withEvent) };
}

export async function submitSourceToAwardQuotation(
  input: SubmitQuotationInput,
  dependencies: SourceToAwardDependencies,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(input);
  if (actorError) return actorError;
  if (!isSupplier(input)) return { status: 'forbidden', reason: 'supplierRoleRequired' };

  const rfqId = trimOptional(input.rfqId);
  const amount = trimOptional(input.amount);
  const currency = trimOptional(input.currency)?.toUpperCase();
  const notes = trimOptional(input.notes);
  const issues: SourceToAwardValidationIssue[] = [];
  if (!rfqId) issues.push({ path: 'rfqId', message: 'RFQ is required' });
  if (!amount) issues.push({ path: 'amount', message: 'Quotation amount is required' });
  if (!currency) issues.push({ path: 'currency', message: 'Currency is required' });
  if (input.deliveryDays !== undefined && (!Number.isInteger(input.deliveryDays) || input.deliveryDays <= 0)) {
    issues.push({ path: 'deliveryDays', message: 'Delivery days must be a positive integer' });
  }
  if (issues.length > 0) return { status: 'invalidInput', issues };

  const sourceCase = await dependencies.sourceToAwardRepository.findByRfqId(rfqId as string);
  if (!sourceCase?.rfq) return { status: 'notFound', reason: 'rfqNotFound' };
  if (!sourceCase.rfq.supplierOrganizationIds.includes(input.actorOrganizationId as string)) {
    return { status: 'forbidden', reason: 'supplierNotInvited' };
  }
  if (sourceCase.award) return { status: 'conflict', reason: 'rfqAlreadyAwarded' };

  const now = dependencies.now?.() ?? new Date().toISOString();
  const quotation: SourceToAwardQuotation = {
    quotationId: nextId('quote', dependencies),
    rfqId: rfqId as string,
    supplierOrganizationId: input.actorOrganizationId as string,
    submittedByUserId: input.actorUserId as string,
    amount: amount as string,
    currency: currency as string,
    ...(input.deliveryDays !== undefined && { deliveryDays: input.deliveryDays }),
    ...(notes !== undefined && { notes }),
    submittedAt: now,
  };

  const nextCase: SourceToAwardCase = {
    ...sourceCase,
    status: 'quotationReceived',
    quotations: [...sourceCase.quotations.filter(item => item.supplierOrganizationId !== quotation.supplierOrganizationId), quotation],
    updatedAt: now,
  };
  const withEvent = await appendSourceEvent(nextCase, 'quotationSubmitted', quotation.quotationId, input.actorUserId as string, input.requestId, dependencies, {
    rfqId,
    supplierOrganizationId: quotation.supplierOrganizationId,
    amount,
    currency,
  });

  return { status: 'ok', sourceCase: await dependencies.sourceToAwardRepository.save(withEvent) };
}

export async function awardSourceToAwardRfq(
  input: AwardRfqInput,
  dependencies: SourceToAwardDependencies,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(input);
  if (actorError) return actorError;
  if (!isBuyer(input)) return { status: 'forbidden', reason: 'buyerRoleRequired' };

  const rfqId = trimOptional(input.rfqId);
  const quotationId = trimOptional(input.quotationId);
  if (!rfqId || !quotationId) {
    return {
      status: 'invalidInput',
      issues: [
        ...(!rfqId ? [{ path: 'rfqId', message: 'RFQ is required' }] : []),
        ...(!quotationId ? [{ path: 'quotationId', message: 'Quotation is required' }] : []),
      ],
    };
  }

  const sourceCase = await dependencies.sourceToAwardRepository.findByRfqId(rfqId);
  if (!sourceCase?.rfq) return { status: 'notFound', reason: 'rfqNotFound' };
  if (sourceCase.buyerOrganizationId !== input.actorOrganizationId) return { status: 'forbidden', reason: 'buyerOrganizationMismatch' };
  if (sourceCase.award) return { status: 'conflict', reason: 'rfqAlreadyAwarded' };

  const quotation = sourceCase.quotations.find(candidate => candidate.quotationId === quotationId);
  if (!quotation) return { status: 'notFound', reason: 'quotationNotFound' };

  const now = dependencies.now?.() ?? new Date().toISOString();
  const awardId = nextId('award', dependencies);
  const awarded: SourceToAwardCase = {
    ...sourceCase,
    status: 'awarded',
    award: {
      awardId,
      rfqId,
      quotationId,
      supplierOrganizationId: quotation.supplierOrganizationId,
      selectedByUserId: input.actorUserId as string,
      selectedAt: now,
      rationale: trimOptional(input.rationale),
    },
    updatedAt: now,
  };

  const withAwardEvent = await appendSourceEvent(awarded, 'awardSelected', awardId, input.actorUserId as string, input.requestId, dependencies, {
    rfqId,
    quotationId,
    supplierOrganizationId: quotation.supplierOrganizationId,
  });

  const orderResult = await createProcurementOrder({
    supplierOrganizationId: quotation.supplierOrganizationId,
    title: sourceCase.requisition.title,
    description: sourceCase.requisition.description,
    amount: quotation.amount,
    currency: quotation.currency,
    actorUserId: input.actorUserId,
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes,
    requestId: input.requestId,
  }, {
    orderRepository: dependencies.orderRepository,
    lifecycleEventRepository: dependencies.lifecycleEventRepository,
    eligibilityGateway: dependencies.eligibilityGateway,
  });

  if (orderResult.status !== 'created') {
    return { status: 'conflict', reason: `purchaseOrderNotGenerated:${orderResult.status}` };
  }

  const completed: SourceToAwardCase = {
    ...withAwardEvent,
    status: 'purchaseOrderGenerated',
    generatedOrderId: orderResult.order.orderId,
    award: {
      ...(withAwardEvent.award as NonNullable<SourceToAwardCase['award']>),
      generatedOrderId: orderResult.order.orderId,
    },
    updatedAt: now,
  };
  const withOrderEvent = await appendSourceEvent(completed, 'purchaseOrderGenerated', orderResult.order.orderId, input.actorUserId as string, input.requestId, dependencies, {
    orderId: orderResult.order.orderId,
    quotationId,
    supplierOrganizationId: quotation.supplierOrganizationId,
  });

  return {
    status: 'ok',
    sourceCase: await dependencies.sourceToAwardRepository.save(withOrderEvent),
    order: orderResult.order,
  };
}

export async function getSourceToAwardCase(
  caseId: string,
  actor: SourceToAwardActor,
  dependencies: Pick<SourceToAwardDependencies, 'sourceToAwardRepository'>,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;

  const sourceCase = await dependencies.sourceToAwardRepository.findByCaseId(caseId);
  if (!sourceCase) return { status: 'notFound', reason: 'caseNotFound' };
  if (!sourceCaseVisibleToActor(sourceCase, actor)) return { status: 'forbidden', reason: 'caseNotVisible' };

  return { status: 'ok', sourceCase };
}

export async function listSourceToAwardCases(
  actor: SourceToAwardActor,
  dependencies: Pick<SourceToAwardDependencies, 'sourceToAwardRepository'>,
): Promise<SourceToAwardResult> {
  const actorError = requireActor(actor);
  if (actorError) return actorError;

  if (isBuyer(actor)) {
    return {
      status: 'list',
      sourceCases: await dependencies.sourceToAwardRepository.listByBuyerOrganization(actor.actorOrganizationId as string),
    };
  }

  if (isSupplier(actor)) {
    return {
      status: 'list',
      sourceCases: await dependencies.sourceToAwardRepository.listBySupplierOrganization(actor.actorOrganizationId as string),
    };
  }

  if (isPrivilegedReader(actor)) {
    return {
      status: 'list',
      sourceCases: await dependencies.sourceToAwardRepository.listAll(),
    };
  }

  return { status: 'forbidden', reason: 'sourceToAwardReadRoleRequired' };
}
