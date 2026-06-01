import { randomUUID } from 'node:crypto';
import type { ProcurementOrder } from '../domain/procurement-order.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPaySourceEvent } from './procure-to-pay-lifecycle-source-integration.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';
import {
  canPerformProcurementAction,
  type ProcurementEligibilityGateway,
  type ProcurementEligibilityResult,
} from './procurement-eligibility-gateway.js';

export type CreateProcurementOrderInput = {
  supplierOrganizationId?: string;
  title?: string;
  description?: string;
  amount?: string;
  currency?: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
  requestId: string;
};

export type CreateProcurementOrderDependencies = {
  orderRepository: ProcurementOrderRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
};

export type CreateProcurementOrderResult =
  | { status: 'created'; order: ProcurementOrder }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: 'buyerRoleRequired' }
  | { status: 'notEligible'; eligibility: ProcurementEligibilityResult };

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function createProcurementOrder(
  input: CreateProcurementOrderInput,
  dependencies: CreateProcurementOrderDependencies,
): Promise<CreateProcurementOrderResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  if (!input.actorRoleCodes?.some(role => ['buyer', 'procurementOfficer', 'sourceToAwardManager'].includes(role))) {
    return { status: 'forbidden', reason: 'buyerRoleRequired' };
  }

  if (dependencies.eligibilityGateway) {
    const eligibility = await dependencies.eligibilityGateway.checkOrganizationEligibility(input.actorOrganizationId);
    if (!canPerformProcurementAction(eligibility)) {
      return {
        status: 'notEligible',
        eligibility,
      };
    }
  }

  const supplierOrganizationId = trimOptional(input.supplierOrganizationId);
  const title = trimOptional(input.title);
  const amount = trimOptional(input.amount);
  const currency = trimOptional(input.currency);
  const description = trimOptional(input.description);

  const issues: Array<{ path: string; message: string }> = [];
  if (!supplierOrganizationId) {
    issues.push({ path: 'supplierOrganizationId', message: 'Supplier organization is required' });
  }
  if (!title) {
    issues.push({ path: 'title', message: 'Order title is required' });
  }
  if (!amount) {
    issues.push({ path: 'amount', message: 'Order amount is required' });
  }
  if (!currency) {
    issues.push({ path: 'currency', message: 'Currency is required' });
  }

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const validSupplierOrganizationId = supplierOrganizationId as string;
  const validTitle = title as string;
  const validAmount = amount as string;
  const validCurrency = currency as string;

  const now = new Date().toISOString();
  const orderId = `order_${randomUUID()}`;
  const order: ProcurementOrder = {
    orderId,
    buyerOrganizationId: input.actorOrganizationId,
    supplierOrganizationId: validSupplierOrganizationId,
    title: validTitle,
    ...(description !== undefined && { description }),
    amount: validAmount,
    currency: validCurrency,
    status: 'created',
    createdBy: input.actorUserId,
    createdAt: now,
    updatedAt: now,
    lifecycleEventIds: [],
  };

  const event = await recordProcureToPaySourceEvent(dependencies.lifecycleEventRepository, {
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    correlationId: orderId,
    caseId: orderId,
    sourceId: orderId,
    sourceAction: 'purchaseOrderCreated',
    outcome: 'success',
    metadata: {
      buyerOrganizationId: order.buyerOrganizationId,
      supplierOrganizationId: order.supplierOrganizationId,
      amount: order.amount,
      currency: order.currency,
    },
  });

  const orderWithEvent: ProcurementOrder = event
    ? {
      ...order,
      lifecycleEventIds: [event.eventId],
      latestLifecyclePayloadHash: event.immutableReference.payloadHash,
    }
    : order;

  const savedOrder = await dependencies.orderRepository.save(orderWithEvent);
  return {
    status: 'created',
    order: savedOrder,
  };
}
