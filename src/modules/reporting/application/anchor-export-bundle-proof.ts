import type {
  AnchorEventInput,
  AnchorEventResult,
  BlockchainAnchorGateway,
} from '../../blockchain/application/blockchain-anchor-gateway.js';
import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import { blockchainAnchorHashing } from '../../blockchain/application/anchor-procure-to-pay-lifecycle-event.js';
import type {
  ExportBundleBlockchainAnchor,
  ExportBundleRecord,
} from '../domain/export-bundle.js';

export type AnchorExportBundleProofDependencies = {
  gateway?: BlockchainAnchorGateway;
  metadataRepository?: BlockchainAnchorMetadataRepository;
  now?: () => string;
};

const EXPORT_BUNDLE_GENERATED_EVENT_TYPE = 'exportBundleGenerated';
const EXPORT_BUNDLE_SCHEMA_VERSION = 'export-bundle-proof.v1';

export function getExportBundleGeneratedAnchorEventId(bundleId: string): string {
  return `exportBundleGenerated-${bundleId}`;
}

function safeFailureReason(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return 'blockchain_anchor_failed';
  }

  return 'blockchain_anchor_unavailable';
}

function toAnchorInput(bundle: ExportBundleRecord): AnchorEventInput {
  return {
    eventId: getExportBundleGeneratedAnchorEventId(bundle.bundleId),
    caseIdHash: blockchainAnchorHashing.hashOpaqueIdentifier(`exportBundle:${bundle.bundleId}`),
    eventType: EXPORT_BUNDLE_GENERATED_EVENT_TYPE,
    payloadHash: blockchainAnchorHashing.toBlockchainHash(bundle.integrity.bundleHash),
    schemaVersion: EXPORT_BUNDLE_SCHEMA_VERSION,
    canonicalization: 'json-canonical-v1',
    occurredAt: bundle.generatedAt,
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

function toExportBundleAnchor(metadata: BlockchainAnchorMetadata): ExportBundleBlockchainAnchor {
  return {
    eventId: metadata.eventId,
    payloadHash: metadata.payloadHash,
    anchorStatus: metadata.anchorStatus,
    blockchainNetwork: metadata.blockchainNetwork,
    channelName: metadata.channelName,
    chaincodeName: metadata.chaincodeName,
    transactionId: metadata.transactionId,
    blockNumber: metadata.blockNumber,
    anchoredAt: metadata.anchoredAt,
    failureReason: metadata.failureReason,
  };
}

export async function anchorExportBundleGeneratedEvent(
  bundle: ExportBundleRecord,
  dependencies: AnchorExportBundleProofDependencies,
): Promise<ExportBundleBlockchainAnchor | null> {
  const { gateway, metadataRepository } = dependencies;
  if (!gateway || !metadataRepository) {
    return null;
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const input = toAnchorInput(bundle);

  try {
    const anchorResult = await gateway.anchorEvent(input);
    const metadata = await metadataRepository.save(metadataFromAnchorResult(input, anchorResult, now));
    return toExportBundleAnchor(metadata);
  } catch (error) {
    try {
      const metadata = await metadataRepository.save(failedMetadata(input, now, safeFailureReason(error)));
      return toExportBundleAnchor(metadata);
    } catch {
      return null;
    }
  }
}

export const exportBundleProofAnchoring = {
  getExportBundleGeneratedAnchorEventId,
};
