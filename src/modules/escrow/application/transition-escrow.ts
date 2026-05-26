import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import { anchorProcureToPayLifecycleEvent } from '../../blockchain/application/anchor-procure-to-pay-lifecycle-event.js';
import type { DeliveryEvidenceRepository } from '../../procurement/application/delivery-evidence-repository.js';
import { recordProcureToPayLifecycleEvent } from '../../procurement/application/record-procure-to-pay-lifecycle-event.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import type { ProcurementEligibilityGateway } from '../../procurement/application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import type {
  EscrowBlockchainAnchor,
  EscrowRecord,
  EscrowStatus,
} from '../domain/escrow.js';
import type { EscrowRepository } from './escrow-repository.js';

export type EscrowTransitionAction =
  | 'fund'
  | 'requestRelease'
  | 'approveRelease'
  | 'hold'
  | 'openDispute'
  | 'recordArbitrationDecision';

export type EscrowArbitrationOutcome = 'approveRelease' | 'refund' | 'cancel';

export type EscrowReleaseConditionSummary = {
  acceptedOrder: boolean;
  deliveryEvidenceRecorded: boolean;
  eligibilitySatisfied: boolean;
  disputeFree: boolean;
};

export type TransitionEscrowInput = {
  escrowId?: string;
  action: EscrowTransitionAction;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
  reason?: string;
  arbitrationOutcome?: EscrowArbitrationOutcome;
  requestId: string;
};

export type TransitionEscrowResult =
  | { status: 'transitioned'; escrow: EscrowRecord; releaseConditions: EscrowReleaseConditionSummary }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: string }
  | { status: 'notFound' }
  | { status: 'conflict'; reason: string; currentStatus: EscrowStatus; releaseConditions?: EscrowReleaseConditionSummary };

export type TransitionEscrowDependencies = {
  escrowRepository: EscrowRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  orderRepository?: ProcurementOrderRepository;
  deliveryEvidenceRepository?: DeliveryEvidenceRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  now?: () => string;
};

type TransitionSpec = {
  nextStatus: EscrowStatus;
  eventType: string;
  requireReleaseConditions?: boolean;
  requireReason?: boolean;
};

const releaseConditionActions = new Set<EscrowTransitionAction>(['requestRelease', 'approveRelease']);

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function roles(input: TransitionEscrowInput): string[] {
  return input.actorRoleCodes ?? [];
}

function hasRole(input: TransitionEscrowInput, allowed: readonly string[]): boolean {
  return roles(input).some(role => allowed.includes(role));
}

function validateInput(input: TransitionEscrowInput): Array<{ path: string; message: string }> {
  const issues: Array<{ path: string; message: string }> = [];
  if (!trimOptional(input.escrowId)) {
    issues.push({ path: 'escrowId', message: 'Escrow id is required' });
  }
  if (!input.requestId || input.requestId.trim().length === 0) {
    issues.push({ path: 'requestId', message: 'Request id is required' });
  }
  if (input.action === 'recordArbitrationDecision' && !input.arbitrationOutcome) {
    issues.push({ path: 'arbitrationOutcome', message: 'Arbitration outcome is required' });
  }
  if (
    input.arbitrationOutcome !== undefined &&
    !['approveRelease', 'refund', 'cancel'].includes(input.arbitrationOutcome)
  ) {
    issues.push({ path: 'arbitrationOutcome', message: 'Arbitration outcome is not supported' });
  }

  return issues;
}

function canActorPerform(input: TransitionEscrowInput, escrow: EscrowRecord): boolean {
  const actorOrg = input.actorOrganizationId;
  switch (input.action) {
    case 'fund':
      return hasRole(input, ['buyer', 'financier']) && (
        actorOrg === escrow.buyerOrganizationId || actorOrg === escrow.financierOrganizationId
      );
    case 'requestRelease':
      return hasRole(input, ['supplier', 'buyer']) && (
        actorOrg === escrow.supplierOrganizationId || actorOrg === escrow.buyerOrganizationId
      );
    case 'approveRelease':
      return hasRole(input, ['buyer']) && actorOrg === escrow.buyerOrganizationId;
    case 'hold':
      return hasRole(input, ['buyer', 'administrator', 'securityOperator']) && (
        actorOrg === escrow.buyerOrganizationId || hasRole(input, ['administrator', 'securityOperator'])
      );
    case 'openDispute':
      return hasRole(input, ['buyer', 'supplier']) && (
        actorOrg === escrow.buyerOrganizationId || actorOrg === escrow.supplierOrganizationId
      );
    case 'recordArbitrationDecision':
      return hasRole(input, ['administrator', 'auditor']);
  }
}

async function evaluateReleaseConditions(
  escrow: EscrowRecord,
  dependencies: TransitionEscrowDependencies,
): Promise<EscrowReleaseConditionSummary> {
  const order = dependencies.orderRepository
    ? await dependencies.orderRepository.findById(escrow.orderId)
    : null;
  const deliveryEvidence = dependencies.deliveryEvidenceRepository
    ? await dependencies.deliveryEvidenceRepository.listByOrderId(escrow.orderId)
    : [];
  const buyerEligibility = dependencies.eligibilityGateway
    ? await dependencies.eligibilityGateway.checkOrganizationEligibility(escrow.buyerOrganizationId)
    : null;
  const supplierEligibility = dependencies.eligibilityGateway
    ? await dependencies.eligibilityGateway.checkOrganizationEligibility(escrow.supplierOrganizationId)
    : null;

  return {
    acceptedOrder: order?.status === 'accepted' || Boolean(escrow.acceptedOrderReference),
    deliveryEvidenceRecorded: deliveryEvidence.length > 0,
    eligibilitySatisfied: Boolean(
      buyerEligibility?.eligibility === 'eligible' &&
      supplierEligibility?.eligibility === 'eligible',
    ),
    disputeFree: !['disputeOpen', 'arbitration', 'onHold', 'disputed'].includes(escrow.status),
  };
}

function releaseConditionsSatisfied(conditions: EscrowReleaseConditionSummary): boolean {
  return conditions.acceptedOrder &&
    conditions.deliveryEvidenceRecorded &&
    conditions.eligibilitySatisfied &&
    conditions.disputeFree;
}

function transitionSpec(input: TransitionEscrowInput, escrow: EscrowRecord): TransitionSpec | null {
  switch (input.action) {
    case 'fund':
      return escrow.status === 'escrowCreated'
        ? { nextStatus: 'funded', eventType: 'escrowFunded' }
        : null;
    case 'requestRelease':
      return ['funded', 'awaitingProof', 'releasePending', 'releaseReady'].includes(escrow.status)
        ? { nextStatus: 'releaseRequested', eventType: 'escrowReleaseRequested', requireReleaseConditions: true }
        : null;
    case 'approveRelease':
      return escrow.status === 'releaseRequested'
        ? {
            nextStatus: 'settlementInstructionReady',
            eventType: 'escrowReleaseApproved',
            requireReleaseConditions: true,
          }
        : null;
    case 'hold':
      return ['escrowCreated', 'funded', 'awaitingProof', 'releasePending', 'releaseReady', 'releaseRequested'].includes(escrow.status)
        ? { nextStatus: 'onHold', eventType: 'escrowHeld', requireReason: true }
        : null;
    case 'openDispute':
      return ['escrowCreated', 'funded', 'awaitingProof', 'releasePending', 'releaseReady', 'releaseRequested', 'onHold'].includes(escrow.status)
        ? { nextStatus: 'disputeOpen', eventType: 'escrowDisputeOpened', requireReason: true }
        : null;
    case 'recordArbitrationDecision':
      if (!['disputeOpen', 'arbitration', 'onHold', 'disputed'].includes(escrow.status)) {
        return null;
      }
      if (input.arbitrationOutcome === 'approveRelease') {
        return { nextStatus: 'settlementInstructionReady', eventType: 'escrowArbitrationDecisionRecorded' };
      }
      if (input.arbitrationOutcome === 'refund') {
        return { nextStatus: 'refunded', eventType: 'escrowArbitrationDecisionRecorded' };
      }
      return { nextStatus: 'cancelled', eventType: 'escrowArbitrationDecisionRecorded' };
  }
}

function toEscrowBlockchainAnchor(
  lifecycleEventId: string | undefined,
  lifecycleEventHash: string | undefined,
  metadata: BlockchainAnchorMetadata | null,
): EscrowBlockchainAnchor | undefined {
  if (metadata) {
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

  if (!lifecycleEventId) {
    return undefined;
  }

  return {
    eventId: lifecycleEventId,
    payloadHash: lifecycleEventHash,
    anchorStatus: 'notAnchored',
  };
}

export async function transitionEscrow(
  input: TransitionEscrowInput,
  dependencies: TransitionEscrowDependencies,
): Promise<TransitionEscrowResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  const issues = validateInput(input);
  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const escrowId = trimOptional(input.escrowId) as string;
  const escrow = await dependencies.escrowRepository.findById(escrowId);
  if (!escrow) {
    return { status: 'notFound' };
  }

  if (!canActorPerform(input, escrow)) {
    return { status: 'forbidden', reason: 'roleOrOrganizationDenied' };
  }

  const spec = transitionSpec(input, escrow);
  if (!spec) {
    return {
      status: 'conflict',
      reason: 'transitionNotAllowed',
      currentStatus: escrow.status,
    };
  }

  const reason = trimOptional(input.reason);
  if (spec.requireReason && !reason) {
    return {
      status: 'invalidInput',
      issues: [{ path: 'reason', message: 'Reason is required for this escrow transition' }],
    };
  }

  const releaseConditions = releaseConditionActions.has(input.action)
    ? await evaluateReleaseConditions(escrow, dependencies)
    : {
        acceptedOrder: true,
        deliveryEvidenceRecorded: true,
        eligibilitySatisfied: true,
        disputeFree: !['disputeOpen', 'arbitration', 'onHold', 'disputed'].includes(escrow.status),
      };

  if (spec.requireReleaseConditions && !releaseConditionsSatisfied(releaseConditions)) {
    return {
      status: 'conflict',
      reason: 'releaseConditionsNotMet',
      currentStatus: escrow.status,
      releaseConditions,
    };
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const lifecycleEvent = await recordProcureToPayLifecycleEvent(dependencies.lifecycleEventRepository, {
    requestId: input.requestId,
    correlationId: escrow.acceptedOrderReference ?? escrow.orderId,
    caseId: escrow.orderId,
    lifecycleStage: 'escrow',
    eventType: spec.eventType,
    actorUserId: input.actorUserId,
    targetType: 'escrow',
    targetId: escrow.escrowId,
    outcome: 'success',
    occurredAt: now,
    recordedAt: now,
    previousEventHash: escrow.lifecycleEventHash,
    sourceRecordRef: escrow.escrowId,
    metadata: {
      action: input.action,
      previousStatus: escrow.status,
      nextStatus: spec.nextStatus,
      arbitrationOutcome: input.arbitrationOutcome,
      reason,
      releaseConditions,
      paymentExecution: spec.nextStatus === 'settlementInstructionReady' ? 'notExecuted' : undefined,
    },
  });

  let anchorMetadata: BlockchainAnchorMetadata | null = null;
  if (lifecycleEvent) {
    anchorMetadata = await anchorProcureToPayLifecycleEvent(lifecycleEvent, {
      gateway: dependencies.blockchainAnchorGateway,
      metadataRepository: dependencies.blockchainAnchorMetadataRepository,
      now: dependencies.now,
    });
  }

  const nextEscrow: EscrowRecord = {
    ...escrow,
    status: spec.nextStatus,
    updatedAt: now,
    lifecycleEventId: lifecycleEvent?.eventId ?? escrow.lifecycleEventId,
    lifecycleEventHash: lifecycleEvent?.immutableReference.payloadHash ?? escrow.lifecycleEventHash,
    blockchainAnchor: toEscrowBlockchainAnchor(
      lifecycleEvent?.eventId ?? escrow.lifecycleEventId,
      lifecycleEvent?.immutableReference.payloadHash ?? escrow.lifecycleEventHash,
      anchorMetadata,
    ) ?? escrow.blockchainAnchor,
    statusReason: reason,
    releaseConditionSummary: releaseConditions,
  };

  return {
    status: 'transitioned',
    escrow: await dependencies.escrowRepository.update(nextEscrow),
    releaseConditions,
  };
}
