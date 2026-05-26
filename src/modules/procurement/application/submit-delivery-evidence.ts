import { createHash, randomUUID } from 'node:crypto';
import {
  anchorProcureToPayLifecycleEvent,
  type AnchorProcureToPayLifecycleEventDependencies,
} from '../../blockchain/application/anchor-procure-to-pay-lifecycle-event.js';
import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import type {
  DeliveryEvidenceBlockchainAnchor,
  DeliveryEvidenceRecord,
  DeliveryEvidenceType,
} from '../domain/delivery-evidence.js';
import { isDeliveryEvidenceType } from '../domain/delivery-evidence.js';
import type { DeliveryEvidenceRepository } from './delivery-evidence-repository.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPaySourceEvent } from './procure-to-pay-lifecycle-source-integration.js';
import type { ProcurementOrderRepository } from './procurement-order-repository.js';

export type SubmitDeliveryEvidenceInput = {
  orderId?: string;
  evidenceType?: string;
  evidenceReference?: string;
  evidenceHash?: string;
  notes?: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
  requestId: string;
};

export type DeliveryEvidenceValidationIssue = {
  path: string;
  message: string;
};

export type SubmitDeliveryEvidenceResult =
  | { status: 'submitted'; evidence: DeliveryEvidenceRecord }
  | { status: 'invalidInput'; issues: DeliveryEvidenceValidationIssue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden'; reason: 'supplierRoleRequired' | 'supplierOrganizationMismatch' }
  | { status: 'orderNotFound' }
  | { status: 'orderNotAccepted'; orderStatus: string };

export type SubmitDeliveryEvidenceDependencies = {
  orderRepository: ProcurementOrderRepository;
  evidenceRepository: DeliveryEvidenceRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  now?: () => string;
  idGenerator?: () => string;
};

type NormalizedSubmitDeliveryEvidenceInput = {
  orderId: string;
  evidenceType: DeliveryEvidenceType;
  evidenceReference?: string;
  evidenceHash?: string;
  notes?: string;
  actorUserId: string;
  actorOrganizationId: string;
  actorRoleCodes: string[];
  requestId: string;
};

const HASH_WITH_PREFIX_PATTERN = /^sha256:[a-f0-9]{64}$/;
const HEX_HASH_PATTERN = /^[a-f0-9]{64}$/;

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeHash(value: string): string {
  const normalized = value.trim().toLowerCase();
  return HEX_HASH_PATTERN.test(normalized) ? `sha256:${normalized}` : normalized;
}

function validateEvidenceHash(value: string | undefined): DeliveryEvidenceValidationIssue | null {
  const trimmed = trimOptional(value);
  if (!trimmed) {
    return null;
  }

  const normalized = trimmed.toLowerCase();
  if (HASH_WITH_PREFIX_PATTERN.test(normalized) || HEX_HASH_PATTERN.test(normalized)) {
    return null;
  }

  return {
    path: 'evidenceHash',
    message: 'Evidence hash must be a SHA-256 hex value with optional sha256: prefix',
  };
}

function normalizeInput(input: SubmitDeliveryEvidenceInput): {
  normalized?: NormalizedSubmitDeliveryEvidenceInput;
  issues: DeliveryEvidenceValidationIssue[];
} {
  const issues: DeliveryEvidenceValidationIssue[] = [];
  const orderId = trimOptional(input.orderId);
  const evidenceType = trimOptional(input.evidenceType);
  const evidenceReference = trimOptional(input.evidenceReference);
  const evidenceHash = trimOptional(input.evidenceHash);
  const notes = trimOptional(input.notes);

  if (!orderId) {
    issues.push({ path: 'orderId', message: 'Order is required' });
  }

  if (!evidenceType) {
    issues.push({ path: 'evidenceType', message: 'Evidence type is required' });
  } else if (!isDeliveryEvidenceType(evidenceType)) {
    issues.push({ path: 'evidenceType', message: 'Evidence type is not supported' });
  }

  if (!evidenceReference && !notes) {
    issues.push({
      path: 'evidenceReference',
      message: 'Evidence reference or notes are required',
    });
  }

  const hashIssue = validateEvidenceHash(evidenceHash);
  if (hashIssue) {
    issues.push(hashIssue);
  }

  if (!input.actorUserId || !input.actorOrganizationId) {
    issues.push({
      path: 'actorContext',
      message: 'Authenticated actor context is required',
    });
  }

  if (!input.requestId || input.requestId.trim().length === 0) {
    issues.push({ path: 'requestId', message: 'Request id is required' });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues: [],
    normalized: {
      orderId: orderId as string,
      evidenceType: evidenceType as DeliveryEvidenceType,
      evidenceReference,
      evidenceHash: evidenceHash ? normalizeHash(evidenceHash) : undefined,
      notes,
      actorUserId: input.actorUserId as string,
      actorOrganizationId: input.actorOrganizationId as string,
      actorRoleCodes: input.actorRoleCodes ?? [],
      requestId: input.requestId.trim(),
    },
  };
}

function buildEvidenceHash(input: {
  orderId: string;
  supplierOrganizationId: string;
  submittedByUserId: string;
  evidenceType: DeliveryEvidenceType;
  evidenceReference?: string;
  notes?: string;
  submittedAt: string;
}): string {
  const canonical = JSON.stringify({
    evidenceReference: input.evidenceReference,
    evidenceType: input.evidenceType,
    notes: input.notes,
    orderId: input.orderId,
    submittedAt: input.submittedAt,
    submittedByUserId: input.submittedByUserId,
    supplierOrganizationId: input.supplierOrganizationId,
  });

  return `sha256:${createHash('sha256').update(canonical).digest('hex')}`;
}

async function resolvePreviousEventHash(
  repository: ProcureToPayLifecycleEventRepository | undefined,
  candidateHash: string | undefined,
): Promise<string | undefined> {
  if (!repository || !candidateHash) {
    return undefined;
  }

  const events = await repository.list();
  return events.some(event => event.immutableReference.payloadHash === candidateHash)
    ? candidateHash
    : undefined;
}

function toDeliveryEvidenceBlockchainAnchor(
  lifecycleEventId: string | undefined,
  lifecycleEventHash: string | undefined,
  metadata: BlockchainAnchorMetadata | null,
): DeliveryEvidenceBlockchainAnchor | undefined {
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

export async function submitDeliveryEvidence(
  input: SubmitDeliveryEvidenceInput,
  dependencies: SubmitDeliveryEvidenceDependencies,
): Promise<SubmitDeliveryEvidenceResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  if (!input.actorRoleCodes?.includes('supplier')) {
    return { status: 'forbidden', reason: 'supplierRoleRequired' };
  }

  const { normalized, issues } = normalizeInput(input);
  if (!normalized) {
    return { status: 'invalidInput', issues };
  }

  const order = await dependencies.orderRepository.findById(normalized.orderId);
  if (!order) {
    return { status: 'orderNotFound' };
  }

  if (order.supplierOrganizationId !== normalized.actorOrganizationId) {
    return { status: 'forbidden', reason: 'supplierOrganizationMismatch' };
  }

  if (order.status !== 'accepted') {
    return { status: 'orderNotAccepted', orderStatus: order.status };
  }

  const submittedAt = dependencies.now?.() ?? new Date().toISOString();
  const evidenceId = dependencies.idGenerator?.() ?? `delivery_evidence_${randomUUID()}`;
  const evidenceHash = normalized.evidenceHash ?? buildEvidenceHash({
    orderId: order.orderId,
    supplierOrganizationId: order.supplierOrganizationId,
    submittedByUserId: normalized.actorUserId,
    evidenceType: normalized.evidenceType,
    evidenceReference: normalized.evidenceReference,
    notes: normalized.notes,
    submittedAt,
  });

  const baseRecord: DeliveryEvidenceRecord = {
    evidenceId,
    orderId: order.orderId,
    buyerOrganizationId: order.buyerOrganizationId,
    supplierOrganizationId: order.supplierOrganizationId,
    submittedByUserId: normalized.actorUserId,
    evidenceType: normalized.evidenceType,
    evidenceReference: normalized.evidenceReference,
    evidenceHash,
    notes: normalized.notes,
    submittedAt,
    verificationStatus: 'metadataRecorded',
  };

  await dependencies.evidenceRepository.save(baseRecord);

  const previousEventHash = await resolvePreviousEventHash(
    dependencies.lifecycleEventRepository,
    order.latestLifecyclePayloadHash,
  );

  const lifecycleEvent = await recordProcureToPaySourceEvent(dependencies.lifecycleEventRepository, {
    requestId: normalized.requestId,
    actorUserId: normalized.actorUserId,
    correlationId: order.orderId,
    caseId: order.orderId,
    sourceId: evidenceId,
    sourceAction: 'deliveryEvidenceSubmitted',
    outcome: 'success',
    previousEventHash,
    sourcePayloadRef: normalized.evidenceReference,
    sourceRecordRef: evidenceId,
    metadata: {
      orderId: order.orderId,
      buyerOrganizationId: order.buyerOrganizationId,
      supplierOrganizationId: order.supplierOrganizationId,
      evidenceId,
      evidenceType: normalized.evidenceType,
      evidenceHash,
      verificationStatus: 'metadataRecorded',
    },
  });

  let anchorMetadata: BlockchainAnchorMetadata | null = null;
  if (lifecycleEvent) {
    const anchorDependencies: AnchorProcureToPayLifecycleEventDependencies = {
      gateway: dependencies.blockchainAnchorGateway,
      metadataRepository: dependencies.blockchainAnchorMetadataRepository,
      now: dependencies.now,
    };
    anchorMetadata = await anchorProcureToPayLifecycleEvent(lifecycleEvent, anchorDependencies);
  }

  const finalRecord: DeliveryEvidenceRecord = {
    ...baseRecord,
    lifecycleEventId: lifecycleEvent?.eventId,
    lifecycleEventHash: lifecycleEvent?.immutableReference.payloadHash,
    blockchainAnchor: toDeliveryEvidenceBlockchainAnchor(
      lifecycleEvent?.eventId,
      lifecycleEvent?.immutableReference.payloadHash,
      anchorMetadata,
    ),
  };

  return {
    status: 'submitted',
    evidence: await dependencies.evidenceRepository.save(finalRecord),
  };
}
