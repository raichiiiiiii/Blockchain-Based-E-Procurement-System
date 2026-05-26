import { randomUUID } from 'node:crypto';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import type { AccessAuditEvent } from '../../shared/application/access-audit-event.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import type { ProcureToPayLifecycleEvent } from '../../procurement/application/procure-to-pay-lifecycle-event.js';
import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
} from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { ExportBundleRepository } from './export-bundle-repository.js';
import type {
  ExportBundleManifest,
  ExportBundleRecord,
  ExportBundleRecordReference,
  ExportBundleScope,
  ExportBundleVerificationResult,
} from '../domain/export-bundle.js';
import { hashExportValue } from './export-canonicalization.js';

export const allowedExportBundleScopes: readonly ExportBundleScope[] = [
  'accessHistory',
  'procureToPay',
  'combinedAudit',
];

export type CreateExportBundleInput = {
  scope: ExportBundleScope;
  purpose: string;
  requestedByUserId: string;
  occurredFrom?: string;
  occurredTo?: string;
};

export type CreateExportBundleDependencies = {
  repository: ExportBundleRepository;
  accessAuditEventRepository?: AccessAuditEventRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  now?: () => string;
};

function isWithinDateRange(
  occurredAt: string | undefined,
  occurredFrom: string | undefined,
  occurredTo: string | undefined,
): boolean {
  if (!occurredAt) {
    return true;
  }

  if (occurredFrom && occurredAt < occurredFrom) {
    return false;
  }

  if (occurredTo && occurredAt > occurredTo) {
    return false;
  }

  return true;
}

function includeAccessHistory(scope: ExportBundleScope): boolean {
  return scope === 'accessHistory' || scope === 'combinedAudit';
}

function includeProcureToPay(scope: ExportBundleScope): boolean {
  return scope === 'procureToPay' || scope === 'combinedAudit';
}

function toAccessRecordReference(event: AccessAuditEvent): ExportBundleRecordReference {
  return {
    recordType: 'accessAuditEvent',
    recordId: event.eventId,
    occurredAt: event.occurredAt,
    payloadHash: event.evidence.payloadHash,
    source: 'access-history',
  };
}

function toLifecycleRecordReference(event: ProcureToPayLifecycleEvent): ExportBundleRecordReference {
  return {
    recordType: 'procureToPayLifecycleEvent',
    recordId: event.eventId,
    occurredAt: event.occurredAt,
    payloadHash: event.immutableReference.payloadHash,
    source: 'transaction-history',
  };
}

function toAnchorRecordReference(metadata: BlockchainAnchorMetadata): ExportBundleRecordReference {
  return {
    recordType: 'blockchainAnchorMetadata',
    recordId: metadata.eventId,
    occurredAt: metadata.anchoredAt ?? metadata.updatedAt,
    payloadHash: metadata.payloadHash,
    anchorStatus: metadata.anchorStatus,
    source: 'blockchain-proof',
  };
}

async function collectAccessRecords(
  repository: AccessAuditEventRepository | undefined,
  input: CreateExportBundleInput,
): Promise<{
  available: boolean;
  records: ExportBundleRecordReference[];
  eventIds: Set<string>;
}> {
  if (!includeAccessHistory(input.scope)) {
    return {
      available: true,
      records: [],
      eventIds: new Set(),
    };
  }

  if (!repository) {
    return {
      available: false,
      records: [],
      eventIds: new Set(),
    };
  }

  const events = (await repository.list())
    .filter(event => isWithinDateRange(event.occurredAt, input.occurredFrom, input.occurredTo))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));

  return {
    available: true,
    records: events.map(toAccessRecordReference),
    eventIds: new Set(events.map(event => event.eventId)),
  };
}

async function collectLifecycleRecords(
  repository: ProcureToPayLifecycleEventRepository | undefined,
  input: CreateExportBundleInput,
): Promise<{
  available: boolean;
  records: ExportBundleRecordReference[];
  eventIds: Set<string>;
}> {
  if (!includeProcureToPay(input.scope)) {
    return {
      available: true,
      records: [],
      eventIds: new Set(),
    };
  }

  if (!repository) {
    return {
      available: false,
      records: [],
      eventIds: new Set(),
    };
  }

  const events = (await repository.list())
    .filter(event => isWithinDateRange(event.occurredAt, input.occurredFrom, input.occurredTo))
    .sort((left, right) => left.occurredAt.localeCompare(right.occurredAt) || left.eventId.localeCompare(right.eventId));

  return {
    available: true,
    records: events.map(toLifecycleRecordReference),
    eventIds: new Set(events.map(event => event.eventId)),
  };
}

async function collectAnchorRecords(
  repository: BlockchainAnchorMetadataRepository | undefined,
  selectedEventIds: Set<string>,
): Promise<ExportBundleRecordReference[]> {
  if (!repository || selectedEventIds.size === 0) {
    return [];
  }

  const records = await repository.list();
  return records
    .filter(metadata => selectedEventIds.has(metadata.eventId))
    .sort((left, right) => left.updatedAt.localeCompare(right.updatedAt) || left.eventId.localeCompare(right.eventId))
    .map(toAnchorRecordReference);
}

export async function createExportBundle(
  input: CreateExportBundleInput,
  dependencies: CreateExportBundleDependencies,
): Promise<ExportBundleRecord> {
  const requestedAt = dependencies.now?.() ?? new Date().toISOString();
  const generatedAt = requestedAt;
  const bundleId = `bundle-${randomUUID()}`;

  const accessRecords = await collectAccessRecords(dependencies.accessAuditEventRepository, input);
  const lifecycleRecords = await collectLifecycleRecords(dependencies.lifecycleEventRepository, input);
  const selectedEventIds = new Set([
    ...accessRecords.eventIds,
    ...lifecycleRecords.eventIds,
  ]);
  const anchorRecords = await collectAnchorRecords(
    dependencies.blockchainAnchorMetadataRepository,
    selectedEventIds,
  );

  const records = [
    ...accessRecords.records,
    ...lifecycleRecords.records,
    ...anchorRecords,
  ].sort((left, right) => (
    (left.occurredAt ?? '').localeCompare(right.occurredAt ?? '') ||
    left.recordType.localeCompare(right.recordType) ||
    left.recordId.localeCompare(right.recordId)
  ));

  const unavailableSources = [
    accessRecords.available ? undefined : 'access_history_unavailable',
    lifecycleRecords.available ? undefined : 'procure_to_pay_history_unavailable',
  ].filter((source): source is string => Boolean(source));

  const status = unavailableSources.length === 0
    ? 'generated'
    : records.length > 0
      ? 'partial'
      : 'failed';

  const manifest: ExportBundleManifest = {
    manifestId: `manifest-${bundleId}`,
    scope: input.scope,
    generatedAt,
    requestedByUserId: input.requestedByUserId,
    dateRange: {
      occurredFrom: input.occurredFrom,
      occurredTo: input.occurredTo,
    },
    recordCount: records.length,
    accessEventCount: accessRecords.records.length,
    lifecycleEventCount: lifecycleRecords.records.length,
    anchorMetadataCount: anchorRecords.length,
    records,
  };

  const manifestHash = hashExportValue(manifest);
  const bundleHash = hashExportValue({
    bundleId,
    status,
    scope: input.scope,
    purpose: input.purpose,
    requestedByUserId: input.requestedByUserId,
    requestedAt,
    generatedAt,
    manifestHash,
  });

  const bundle: ExportBundleRecord = {
    bundleId,
    status,
    scope: input.scope,
    purpose: input.purpose,
    requestedByUserId: input.requestedByUserId,
    requestedAt,
    generatedAt,
    ...(unavailableSources.length > 0 && {
      failureReason: unavailableSources.join(','),
    }),
    manifest,
    integrity: {
      canonicalization: 'json-stable-v1',
      proofType: 'mvp-manifest-hash',
      manifestHash,
      bundleHash,
    },
    download: {
      available: status !== 'failed',
      reference: `export-bundles/${bundleId}.json`,
      contentType: 'application/json',
    },
  };

  return dependencies.repository.save(bundle);
}

export async function verifyExportBundle(
  repository: ExportBundleRepository | undefined,
  bundleId: string,
  submittedBundleHash: string | undefined,
  now: () => string = () => new Date().toISOString(),
): Promise<ExportBundleVerificationResult> {
  if (!repository) {
    return {
      bundleId,
      verificationStatus: 'unavailable',
      submittedBundleHash,
    };
  }

  const bundle = await repository.findById(bundleId);
  if (!bundle) {
    return {
      bundleId,
      verificationStatus: 'notFound',
      submittedBundleHash,
    };
  }

  const hashToVerify = submittedBundleHash ?? bundle.integrity.bundleHash;

  return {
    bundleId,
    verificationStatus: hashToVerify === bundle.integrity.bundleHash ? 'verified' : 'mismatch',
    submittedBundleHash: hashToVerify,
    bundleHash: bundle.integrity.bundleHash,
    manifestHash: bundle.integrity.manifestHash,
    verifiedAt: now(),
  };
}
