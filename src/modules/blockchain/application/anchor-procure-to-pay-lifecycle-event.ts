import { createHash } from 'node:crypto';
import type { ProcureToPayLifecycleEvent } from '../../procurement/application/procure-to-pay-lifecycle-event.js';
import type { BlockchainAnchorMetadata, BlockchainAnchorMetadataRepository } from './blockchain-anchor-metadata-repository.js';
import type { BlockchainAnchorGateway, AnchorEventInput, AnchorEventResult } from './blockchain-anchor-gateway.js';

export type AnchorProcureToPayLifecycleEventDependencies = {
  gateway?: BlockchainAnchorGateway;
  metadataRepository?: BlockchainAnchorMetadataRepository;
  now?: () => string;
};

const HASH_WITH_PREFIX_PATTERN = /^sha256:[a-f0-9]{64}$/;
const HEX_HASH_PATTERN = /^[a-f0-9]{64}$/;

function hashOpaqueIdentifier(value: string): string {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function toBlockchainHash(value: string): string {
  const normalized = value.toLowerCase();

  if (HASH_WITH_PREFIX_PATTERN.test(normalized)) {
    return normalized;
  }

  if (HEX_HASH_PATTERN.test(normalized)) {
    return `sha256:${normalized}`;
  }

  return normalized;
}

function safeFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return 'blockchain_anchor_failed';
  }

  return 'blockchain_anchor_unavailable';
}

function toAnchorInput(event: ProcureToPayLifecycleEvent): AnchorEventInput {
  return {
    eventId: event.eventId,
    caseIdHash: hashOpaqueIdentifier(event.caseId),
    eventType: event.eventType,
    payloadHash: toBlockchainHash(event.immutableReference.payloadHash),
    schemaVersion: event.schemaVersion,
    canonicalization: 'json-canonical-v1',
    occurredAt: event.occurredAt,
    ...(event.immutableReference.previousEventHash !== undefined && {
      previousEventHash: toBlockchainHash(event.immutableReference.previousEventHash),
    }),
  };
}

function metadataFromAnchorResult(
  input: AnchorEventInput,
  result: AnchorEventResult,
  now: string,
): BlockchainAnchorMetadata {
  return {
    eventId: input.eventId,
    payloadHash: input.payloadHash,
    caseIdHash: input.caseIdHash,
    anchorStatus: result.anchorStatus,
    blockchainNetwork: result.blockchainNetwork,
    channelName: result.channelName,
    chaincodeName: result.chaincodeName,
    transactionId: result.transactionId,
    blockNumber: result.blockNumber,
    anchoredAt: result.anchoredAt,
    failureReason: result.failureReason,
    createdAt: now,
    updatedAt: now,
  };
}

function failedMetadata(
  input: AnchorEventInput,
  now: string,
  failureReason: string,
): BlockchainAnchorMetadata {
  return {
    eventId: input.eventId,
    payloadHash: input.payloadHash,
    caseIdHash: input.caseIdHash,
    anchorStatus: 'failed',
    failureReason,
    createdAt: now,
    updatedAt: now,
  };
}

export async function anchorProcureToPayLifecycleEvent(
  event: ProcureToPayLifecycleEvent,
  dependencies: AnchorProcureToPayLifecycleEventDependencies,
): Promise<BlockchainAnchorMetadata | null> {
  const { gateway, metadataRepository } = dependencies;
  if (!gateway || !metadataRepository) {
    return null;
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const input = toAnchorInput(event);

  try {
    const anchorResult = await gateway.anchorEvent(input);
    return metadataRepository.save(metadataFromAnchorResult(input, anchorResult, now));
  } catch (error) {
    try {
      return await metadataRepository.save(failedMetadata(input, now, safeFailureReason(error)));
    } catch {
      return null;
    }
  }
}

export const blockchainAnchorHashing = {
  hashOpaqueIdentifier,
  toBlockchainHash,
};
