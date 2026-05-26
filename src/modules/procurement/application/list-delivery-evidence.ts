import type { DeliveryEvidenceRecord } from '../domain/delivery-evidence.js';
import type { DeliveryEvidenceRepository } from './delivery-evidence-repository.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';

export type ListDeliveryEvidenceInput = {
  orderId?: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type ListDeliveryEvidenceResult =
  | { status: 'found'; items: DeliveryEvidenceRecord[] }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'orderNotFound' };

export type ListDeliveryEvidenceDependencies = {
  orderRepository: ProcurementOrderRepository;
  evidenceRepository: DeliveryEvidenceRepository;
};

const auditReadRoles = new Set(['administrator', 'auditor', 'regulator', 'securityOperator']);

function canReadDeliveryEvidence(input: Required<ListDeliveryEvidenceInput>, order: {
  buyerOrganizationId: string;
  supplierOrganizationId: string;
}): boolean {
  if (input.actorRoleCodes.some(role => auditReadRoles.has(role))) {
    return true;
  }

  return (
    (input.actorRoleCodes.includes('buyer') && input.actorOrganizationId === order.buyerOrganizationId) ||
    (input.actorRoleCodes.includes('supplier') && input.actorOrganizationId === order.supplierOrganizationId)
  );
}

export async function listDeliveryEvidence(
  input: ListDeliveryEvidenceInput,
  dependencies: ListDeliveryEvidenceDependencies,
): Promise<ListDeliveryEvidenceResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  const orderId = input.orderId?.trim();
  if (!orderId) {
    return {
      status: 'invalidInput',
      issues: [{ path: 'orderId', message: 'Order is required' }],
    };
  }

  const normalizedInput: Required<ListDeliveryEvidenceInput> = {
    orderId,
    actorUserId: input.actorUserId,
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes ?? [],
  };

  const order = await dependencies.orderRepository.findById(orderId);
  if (!order) {
    return { status: 'orderNotFound' };
  }

  if (!canReadDeliveryEvidence(normalizedInput, order)) {
    return { status: 'forbidden' };
  }

  return {
    status: 'found',
    items: await dependencies.evidenceRepository.listByOrderId(orderId),
  };
}
