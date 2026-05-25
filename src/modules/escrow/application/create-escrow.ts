import { randomUUID } from 'node:crypto';
import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import {
  anchorProcureToPayLifecycleEvent,
  type AnchorProcureToPayLifecycleEventDependencies,
} from '../../blockchain/application/anchor-procure-to-pay-lifecycle-event.js';
import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPayLifecycleEvent } from '../../procurement/application/record-procure-to-pay-lifecycle-event.js';
import {
  canPerformProcurementAction,
  type ProcurementEligibilityGateway,
  type ProcurementEligibilityResult,
} from '../../procurement/application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import type { ProcurementOrderStatus } from '../../procurement/domain/procurement-order.js';
import type { EscrowBlockchainAnchor, EscrowRecord } from '../domain/escrow.js';
import type { EscrowRepository } from './escrow-repository.js';

export type CreateEscrowInput = {
  orderId?: string;
  buyerOrganizationId?: string;
  supplierOrganizationId?: string;
  financierOrganizationId?: string;
  termsHash?: string;
  acceptedOrderReference?: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
  requestId?: string;
};

export type EscrowValidationIssue = {
  path: string;
  message: string;
};

export type CreateEscrowResult =
  | { status: 'created'; escrow: EscrowRecord }
  | { status: 'invalidInput'; issues: EscrowValidationIssue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: 'buyerRoleRequired' | 'buyerOrganizationMismatch' | 'orderOrganizationMismatch' }
  | { status: 'notEligible'; party: 'buyer' | 'supplier'; eligibility: ProcurementEligibilityResult }
  | { status: 'orderNotFound'; orderId: string }
  | { status: 'orderNotAccepted'; orderId: string; orderStatus: ProcurementOrderStatus }
  | { status: 'duplicateActiveEscrow'; existingEscrowId: string };

export type CreateEscrowDependencies = {
  escrowRepository: EscrowRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  orderRepository?: ProcurementOrderRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  now?: () => string;
  idGenerator?: () => string;
};

type NormalizedCreateEscrowInput = Required<
  Pick<CreateEscrowInput,
    | 'orderId'
    | 'buyerOrganizationId'
    | 'supplierOrganizationId'
    | 'termsHash'
    | 'actorUserId'
    | 'requestId'
  >
> & Pick<CreateEscrowInput, 'financierOrganizationId' | 'acceptedOrderReference' | 'actorOrganizationId' | 'actorRoleCodes'>;

function requiredString(value: string | undefined, path: string, label: string): EscrowValidationIssue | null {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return {
      path,
      message: `${label} is required and cannot be blank`,
    };
  }

  return null;
}

function normalizeCreateEscrowInput(input: CreateEscrowInput): {
  normalized?: NormalizedCreateEscrowInput;
  issues: EscrowValidationIssue[];
} {
  const issues = [
    requiredString(input.orderId, 'orderId', 'orderId'),
    requiredString(input.buyerOrganizationId, 'buyerOrganizationId', 'buyerOrganizationId'),
    requiredString(input.supplierOrganizationId, 'supplierOrganizationId', 'supplierOrganizationId'),
    requiredString(input.termsHash, 'termsHash', 'termsHash'),
    requiredString(input.actorUserId, 'actorUserId', 'actorUserId'),
    requiredString(input.requestId, 'requestId', 'requestId'),
  ].filter((issue): issue is EscrowValidationIssue => issue !== null);

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues: [],
    normalized: {
      orderId: input.orderId!.trim(),
      buyerOrganizationId: input.buyerOrganizationId!.trim(),
      supplierOrganizationId: input.supplierOrganizationId!.trim(),
      financierOrganizationId: input.financierOrganizationId?.trim() || undefined,
      termsHash: input.termsHash!.trim(),
      acceptedOrderReference: input.acceptedOrderReference?.trim() || undefined,
      actorUserId: input.actorUserId!.trim(),
      actorOrganizationId: input.actorOrganizationId?.trim() || undefined,
      actorRoleCodes: input.actorRoleCodes ?? [],
      requestId: input.requestId!.trim(),
    },
  };
}

function toEscrowBlockchainAnchor(
  lifecycleEventId: string | undefined,
  metadata: BlockchainAnchorMetadata | null,
): EscrowBlockchainAnchor | undefined {
  if (!metadata) {
    return undefined;
  }

  return {
    eventId: lifecycleEventId,
    payloadHash: metadata.payloadHash,
    anchorStatus: metadata.anchorStatus,
    blockchainNetwork: metadata.blockchainNetwork,
    transactionId: metadata.transactionId,
    blockNumber: metadata.blockNumber,
    channelName: metadata.channelName,
    chaincodeName: metadata.chaincodeName,
    anchoredAt: metadata.anchoredAt,
    failureReason: metadata.failureReason,
  };
}

function canCreateEscrow(actorRoleCodes: readonly string[]): boolean {
  return actorRoleCodes.includes('buyer');
}

function hasExplicitDemoAcceptedReference(input: NormalizedCreateEscrowInput): boolean {
  return Boolean(
    input.acceptedOrderReference?.startsWith('accepted-order-demo-') ||
    input.orderId.startsWith('demo-order-'),
  );
}

export async function createEscrow(
  input: CreateEscrowInput,
  dependencies: CreateEscrowDependencies,
): Promise<CreateEscrowResult> {
  if (!input.actorUserId || input.actorUserId.trim().length === 0) {
    return { status: 'unauthorized' };
  }

  if (!canCreateEscrow(input.actorRoleCodes ?? [])) {
    return { status: 'forbidden', reason: 'buyerRoleRequired' };
  }

  const { normalized, issues } = normalizeCreateEscrowInput(input);
  if (!normalized) {
    return { status: 'invalidInput', issues };
  }

  if (
    normalized.actorOrganizationId &&
    normalized.actorOrganizationId !== normalized.buyerOrganizationId
  ) {
    return { status: 'forbidden', reason: 'buyerOrganizationMismatch' };
  }

  if (dependencies.orderRepository) {
    const acceptedOrder = await dependencies.orderRepository.findById(normalized.orderId);
    if (!acceptedOrder) {
      if (!hasExplicitDemoAcceptedReference(normalized)) {
        return { status: 'orderNotFound', orderId: normalized.orderId };
      }
    } else {
      if (acceptedOrder.status !== 'accepted') {
        return {
          status: 'orderNotAccepted',
          orderId: acceptedOrder.orderId,
          orderStatus: acceptedOrder.status,
        };
      }

      if (
        acceptedOrder.buyerOrganizationId !== normalized.buyerOrganizationId ||
        acceptedOrder.supplierOrganizationId !== normalized.supplierOrganizationId
      ) {
        return { status: 'forbidden', reason: 'orderOrganizationMismatch' };
      }
    }
  }

  if (dependencies.eligibilityGateway) {
    const buyerEligibility = await dependencies.eligibilityGateway.checkOrganizationEligibility(
      normalized.buyerOrganizationId,
    );
    if (!canPerformProcurementAction(buyerEligibility)) {
      return { status: 'notEligible', party: 'buyer', eligibility: buyerEligibility };
    }

    const supplierEligibility = await dependencies.eligibilityGateway.checkOrganizationEligibility(
      normalized.supplierOrganizationId,
    );
    if (!canPerformProcurementAction(supplierEligibility)) {
      return { status: 'notEligible', party: 'supplier', eligibility: supplierEligibility };
    }
  }

  const existingEscrow = await dependencies.escrowRepository.findActiveByOrderId(normalized.orderId);
  if (existingEscrow) {
    return {
      status: 'duplicateActiveEscrow',
      existingEscrowId: existingEscrow.escrowId,
    };
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const escrowId = dependencies.idGenerator?.() ?? randomUUID();

  const escrow: EscrowRecord = {
    escrowId,
    orderId: normalized.orderId,
    buyerOrganizationId: normalized.buyerOrganizationId,
    supplierOrganizationId: normalized.supplierOrganizationId,
    financierOrganizationId: normalized.financierOrganizationId,
    termsHash: normalized.termsHash,
    status: 'escrowCreated',
    acceptedOrderReference: normalized.acceptedOrderReference,
    createdBy: normalized.actorUserId,
    createdAt: now,
    updatedAt: now,
  };

  const createdEscrow = await dependencies.escrowRepository.create(escrow);
  const lifecycleEvent = await recordProcureToPayLifecycleEvent(
    dependencies.lifecycleEventRepository,
    {
      requestId: normalized.requestId,
      correlationId: normalized.acceptedOrderReference ?? normalized.orderId,
      caseId: normalized.orderId,
      lifecycleStage: 'escrow',
      eventType: 'escrowCreated',
      actorUserId: normalized.actorUserId,
      targetType: 'escrow',
      targetId: escrowId,
      outcome: 'success',
      sourceRecordRef: escrowId,
      metadata: {
        orderId: normalized.orderId,
        buyerOrganizationId: normalized.buyerOrganizationId,
        supplierOrganizationId: normalized.supplierOrganizationId,
        financierOrganizationId: normalized.financierOrganizationId,
        acceptedOrderReference: normalized.acceptedOrderReference,
        termsHash: normalized.termsHash,
      },
    },
  );

  let anchorMetadata: BlockchainAnchorMetadata | null = null;
  if (lifecycleEvent) {
    const anchorDependencies: AnchorProcureToPayLifecycleEventDependencies = {
      gateway: dependencies.blockchainAnchorGateway,
      metadataRepository: dependencies.blockchainAnchorMetadataRepository,
      now: dependencies.now,
    };
    anchorMetadata = await anchorProcureToPayLifecycleEvent(lifecycleEvent, anchorDependencies);
  }

  const updatedEscrow: EscrowRecord = {
    ...createdEscrow,
    updatedAt: dependencies.now?.() ?? new Date().toISOString(),
    lifecycleEventId: lifecycleEvent?.eventId,
    lifecycleEventHash: lifecycleEvent?.immutableReference.payloadHash,
    blockchainAnchor: toEscrowBlockchainAnchor(lifecycleEvent?.eventId, anchorMetadata),
  };

  return {
    status: 'created',
    escrow: await dependencies.escrowRepository.update(updatedEscrow),
  };
}
