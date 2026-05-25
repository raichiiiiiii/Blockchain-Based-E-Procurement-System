import type { ProcurementOrder } from '../domain/procurement-order.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPaySourceEvent } from './procure-to-pay-lifecycle-source-integration.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';

export type AcknowledgeProcurementOrderInput = {
  orderId?: string;
  decision?: 'accept' | 'reject';
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
  requestId: string;
};

export type AcknowledgeProcurementOrderDependencies = {
  orderRepository: ProcurementOrderRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
};

export type AcknowledgeProcurementOrderResult =
  | { status: 'acknowledged'; order: ProcurementOrder }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: 'supplierRoleRequired' | 'supplierOrganizationMismatch' }
  | { status: 'notFound' }
  | { status: 'conflict'; reason: 'orderAlreadyAcknowledged' };

export async function acknowledgeProcurementOrder(
  input: AcknowledgeProcurementOrderInput,
  dependencies: AcknowledgeProcurementOrderDependencies,
): Promise<AcknowledgeProcurementOrderResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  if (!input.actorRoleCodes?.includes('supplier')) {
    return { status: 'forbidden', reason: 'supplierRoleRequired' };
  }

  const orderId = input.orderId?.trim();
  const decision = input.decision;
  const issues: Array<{ path: string; message: string }> = [];

  if (!orderId) {
    issues.push({ path: 'orderId', message: 'Order is required' });
  }
  if (decision !== 'accept' && decision !== 'reject') {
    issues.push({ path: 'decision', message: 'Decision must be accept or reject' });
  }

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const validOrderId = orderId as string;
  const validDecision = decision as 'accept' | 'reject';

  const order = await dependencies.orderRepository.findById(validOrderId);
  if (!order) {
    return { status: 'notFound' };
  }

  if (order.supplierOrganizationId !== input.actorOrganizationId) {
    return { status: 'forbidden', reason: 'supplierOrganizationMismatch' };
  }

  if (order.status !== 'created') {
    return { status: 'conflict', reason: 'orderAlreadyAcknowledged' };
  }

  const now = new Date().toISOString();
  const nextStatus = validDecision === 'accept' ? 'accepted' : 'rejected';
  const sourceAction = validDecision === 'accept' ? 'purchaseOrderAccepted' : 'purchaseOrderRejected';
  const eventOutcome = validDecision === 'accept' ? 'success' : 'rejected';

  const event = await recordProcureToPaySourceEvent(dependencies.lifecycleEventRepository, {
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    correlationId: order.orderId,
    caseId: order.orderId,
    sourceId: order.orderId,
    sourceAction,
    outcome: eventOutcome,
    previousEventHash: order.latestLifecyclePayloadHash,
    metadata: {
      buyerOrganizationId: order.buyerOrganizationId,
      supplierOrganizationId: order.supplierOrganizationId,
    },
  });

  const updatedOrder: ProcurementOrder = {
    ...order,
    status: nextStatus,
    updatedAt: now,
    ...(validDecision === 'accept'
      ? {
        acceptedBy: input.actorUserId,
        acceptedAt: now,
      }
      : {
        rejectedBy: input.actorUserId,
        rejectedAt: now,
      }),
    lifecycleEventIds: event ? [...order.lifecycleEventIds, event.eventId] : order.lifecycleEventIds,
    latestLifecyclePayloadHash: event?.immutableReference.payloadHash ?? order.latestLifecyclePayloadHash,
  };

  const savedOrder = await dependencies.orderRepository.save(updatedOrder);
  return {
    status: 'acknowledged',
    order: savedOrder,
  };
}
