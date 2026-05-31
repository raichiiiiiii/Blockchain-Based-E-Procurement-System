import { BackendApiError } from './errors';
import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import { createLocalDemoFallbackDisabledError, isLocalDemoFallbackEnabled } from '../lib/runtime-config';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type ExportBundleScope = 'accessHistory' | 'procureToPay' | 'combinedAudit';
export type ExportBundleStatus = 'generated' | 'partial' | 'failed';
export type ExportBundleVerificationStatus = 'verified' | 'mismatch' | 'notFound' | 'unavailable';
export type ExportBundleSignatureVerificationStatus =
  | 'verified'
  | 'invalid'
  | 'notFound'
  | 'unavailable'
  | 'keyInactive';

export type ExportBundleRecordReference = {
  recordType: 'accessAuditEvent' | 'procureToPayLifecycleEvent' | 'blockchainAnchorMetadata';
  recordId: string;
  occurredAt?: string;
  payloadHash?: string;
  anchorStatus?: string;
  source: 'access-history' | 'transaction-history' | 'blockchain-proof';
};

export type ExportBundleBlockchainAnchor = {
  eventId: string;
  payloadHash: string;
  anchorStatus: 'notAnchored' | 'pending' | 'anchored' | 'failed';
  blockchainNetwork?: 'fabric-local' | 'fabric';
  channelName?: string;
  chaincodeName?: string;
  transactionId?: string;
  blockNumber?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export type ExportBundleRecord = {
  bundleId: string;
  status: ExportBundleStatus;
  scope: ExportBundleScope;
  purpose: string;
  requestedByUserId: string;
  requestedAt: string;
  generatedAt: string;
  failureReason?: string;
  manifest: {
    manifestId: string;
    scope: ExportBundleScope;
    generatedAt: string;
    requestedByUserId: string;
    dateRange: {
      occurredFrom?: string;
      occurredTo?: string;
    };
    recordCount: number;
    accessEventCount: number;
    lifecycleEventCount: number;
    anchorMetadataCount: number;
    records: ExportBundleRecordReference[];
  };
  integrity: {
    canonicalization: 'json-stable-v1';
    proofType: 'mvp-manifest-hash';
    manifestHash: string;
    bundleHash: string;
    exportProof?: ExportBundleBlockchainAnchor;
  };
  signature?: ExportBundleSignature;
  download: {
    available: boolean;
    reference: string;
    contentType: 'application/json';
  };
};

export type ExportBundleSignature = {
  signatureId: string;
  bundleId: string;
  signingProfileId: string;
  algorithm: 'Ed25519';
  keyId: string;
  keyStatus: 'active' | 'rotated' | 'revoked';
  status: 'signed' | 'invalid' | 'rejected';
  manifestHash: string;
  bundleHash: string;
  signedPayloadHash: string;
  signature: string;
  signedAt: string;
  publicKeyPem: string;
  verificationInstructions: string;
  offlineVerificationPackage: {
    manifestFileName: 'manifest.json';
    signatureFileName: string;
    publicKeyFileName: string;
    instructionsFileName: 'VERIFY_SIGNATURE.txt';
  };
  claimBoundary: 'localSoftwareKeyOnly';
};

export type CreateExportBundleRequest = {
  scope: ExportBundleScope;
  purpose: string;
  occurredFrom?: string;
  occurredTo?: string;
};

export type ExportBundleVerificationResult = {
  bundleId: string;
  verificationStatus: ExportBundleVerificationStatus;
  submittedBundleHash?: string;
  bundleHash?: string;
  manifestHash?: string;
  verifiedAt?: string;
};

export type ExportBundleSignatureVerificationResult = {
  bundleId: string;
  signatureId?: string;
  verificationStatus: ExportBundleSignatureVerificationStatus;
  manifestHash?: string;
  submittedManifestHash?: string;
  keyId?: string;
  algorithm?: 'Ed25519';
  verifiedAt?: string;
  reason?: string;
};

const LOCAL_EXPORT_BUNDLE_KEY = 'eprocurement.export.bundles.v1';

const localAccessRecords: ExportBundleRecordReference[] = [
  {
    recordType: 'accessAuditEvent',
    recordId: 'access-event-1',
    occurredAt: '2026-05-25T04:00:00.000Z',
    payloadHash: `sha256:${'6'.repeat(64)}`,
    source: 'access-history',
  },
  {
    recordType: 'accessAuditEvent',
    recordId: 'denied-action-1',
    occurredAt: '2026-05-25T04:04:00.000Z',
    payloadHash: `sha256:${'7'.repeat(64)}`,
    source: 'access-history',
  },
];

const localLifecycleRecords: ExportBundleRecordReference[] = [
  {
    recordType: 'procureToPayLifecycleEvent',
    recordId: 'ptp-event-1',
    occurredAt: '2026-05-25T04:01:00.000Z',
    payloadHash: `sha256:${'1'.repeat(64)}`,
    source: 'transaction-history',
  },
];

const localAnchorRecords: ExportBundleRecordReference[] = [
  {
    recordType: 'blockchainAnchorMetadata',
    recordId: 'ptp-event-1',
    occurredAt: '2026-05-25T04:02:00.000Z',
    payloadHash: `sha256:${'1'.repeat(64)}`,
    anchorStatus: 'anchored',
    source: 'blockchain-proof',
  },
];

function readLocalBundles(): ExportBundleRecord[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_EXPORT_BUNDLE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalBundles(bundles: ExportBundleRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(LOCAL_EXPORT_BUNDLE_KEY, JSON.stringify(bundles));
}

function canonicalizeValue(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalizeValue(item)).join(',')}]`;
  }

  const obj = value as Record<string, unknown>;
  return `{${Object.keys(obj)
    .sort()
    .filter(key => obj[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalizeValue(obj[key])}`)
    .join(',')}}`;
}

async function sha256(value: unknown): Promise<string> {
  const canonical = canonicalizeValue(value);
  const bytes = new TextEncoder().encode(canonical);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, '0'))
    .join('')}`;
}

function isWithinDateRange(record: ExportBundleRecordReference, request: CreateExportBundleRequest): boolean {
  if (!record.occurredAt) {
    return true;
  }

  if (request.occurredFrom && record.occurredAt < request.occurredFrom) {
    return false;
  }

  if (request.occurredTo && record.occurredAt > request.occurredTo) {
    return false;
  }

  return true;
}

function getLocalRecords(request: CreateExportBundleRequest): ExportBundleRecordReference[] {
  const records = [
    ...(request.scope === 'accessHistory' || request.scope === 'combinedAudit' ? localAccessRecords : []),
    ...(request.scope === 'procureToPay' || request.scope === 'combinedAudit' ? localLifecycleRecords : []),
    ...(request.scope === 'procureToPay' || request.scope === 'combinedAudit' ? localAnchorRecords : []),
  ];

  return records
    .filter(record => isWithinDateRange(record, request))
    .sort((left, right) => (
      (left.occurredAt ?? '').localeCompare(right.occurredAt ?? '') ||
      left.recordType.localeCompare(right.recordType) ||
      left.recordId.localeCompare(right.recordId)
    ));
}

function ensureExporter(session: AuthenticatedFrontendSession): void {
  const roles = session.actor.actorRoleCodes;
  if (!roles.includes('regulator') && !roles.includes('auditor')) {
    throw new BackendApiError('FORBIDDEN', 'Export bundle access requires reporting or audit access');
  }
}

function assertLocalFallbackEnabled(feature: string): void {
  if (!isLocalDemoFallbackEnabled()) {
    throw createLocalDemoFallbackDisabledError(feature);
  }
}

async function createLocalExportBundle(
  request: CreateExportBundleRequest,
  session: AuthenticatedFrontendSession,
): Promise<ExportBundleRecord> {
  ensureExporter(session);

  const generatedAt = new Date().toISOString();
  const bundleId = `bundle-local-${globalThis.crypto.randomUUID()}`;
  const records = getLocalRecords(request);
  const manifest = {
    manifestId: `manifest-${bundleId}`,
    scope: request.scope,
    generatedAt,
    requestedByUserId: session.actor.actorUserId,
    dateRange: {
      occurredFrom: request.occurredFrom,
      occurredTo: request.occurredTo,
    },
    recordCount: records.length,
    accessEventCount: records.filter(record => record.recordType === 'accessAuditEvent').length,
    lifecycleEventCount: records.filter(record => record.recordType === 'procureToPayLifecycleEvent').length,
    anchorMetadataCount: records.filter(record => record.recordType === 'blockchainAnchorMetadata').length,
    records,
  };
  const manifestHash = await sha256(manifest);
  const bundleHash = await sha256({
    bundleId,
    status: 'generated',
    scope: request.scope,
    purpose: request.purpose,
    requestedByUserId: session.actor.actorUserId,
    requestedAt: generatedAt,
    generatedAt,
    manifestHash,
  });

  const bundle: ExportBundleRecord = {
    bundleId,
    status: 'generated',
    scope: request.scope,
    purpose: request.purpose,
    requestedByUserId: session.actor.actorUserId,
    requestedAt: generatedAt,
    generatedAt,
    manifest,
    integrity: {
      canonicalization: 'json-stable-v1',
      proofType: 'mvp-manifest-hash',
      manifestHash,
      bundleHash,
    },
    download: {
      available: true,
      reference: `export-bundles/${bundleId}.json`,
      contentType: 'application/json',
    },
  };

  writeLocalBundles([bundle, ...readLocalBundles().filter(item => item.bundleId !== bundle.bundleId)]);
  return bundle;
}

export async function createExportBundle(
  request: CreateExportBundleRequest,
  session: AuthenticatedFrontendSession,
): Promise<ExportBundleRecord> {
  if (session.source !== 'backend') {
    assertLocalFallbackEnabled('Export bundle creation');
    return createLocalExportBundle(request, session);
  }

  try {
    return await requestJson<ExportBundleRecord>('/api/v1/export-bundles', {
      method: 'POST',
      headers: {
        ...createSessionHeaders(session),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });
  } catch (error) {
    if ((error instanceof BackendApiError || error instanceof TypeError) && isLocalDemoFallbackEnabled()) {
      return createLocalExportBundle(request, session);
    }

    throw error;
  }
}

export async function getExportBundle(
  bundleId: string,
  session: AuthenticatedFrontendSession,
): Promise<ExportBundleRecord> {
  if (session.source === 'backend') {
    try {
      return await requestJson<ExportBundleRecord>(`/api/v1/export-bundles/${encodeURIComponent(bundleId)}`, {
        headers: createSessionHeaders(session),
      });
    } catch (error) {
      if (!(error instanceof BackendApiError || error instanceof TypeError)) {
        throw error;
      }

      if (!isLocalDemoFallbackEnabled()) {
        throw error;
      }
    }
  } else {
    assertLocalFallbackEnabled('Export bundle detail');
  }

  const bundle = readLocalBundles().find(candidate => candidate.bundleId === bundleId);
  if (!bundle) {
    throw new BackendApiError('NOT_FOUND', 'Export bundle not found');
  }

  return bundle;
}

export async function verifyExportBundle(
  bundleId: string,
  session: AuthenticatedFrontendSession,
  bundleHash?: string,
): Promise<ExportBundleVerificationResult> {
  if (session.source === 'backend') {
    try {
      return await requestJson<ExportBundleVerificationResult>(
        `/api/v1/export-bundles/${encodeURIComponent(bundleId)}/verify`,
        {
          method: 'POST',
          headers: {
            ...createSessionHeaders(session),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ bundleHash }),
        },
      );
    } catch (error) {
      if (!(error instanceof BackendApiError || error instanceof TypeError)) {
        throw error;
      }

      if (!isLocalDemoFallbackEnabled()) {
        throw error;
      }
    }
  } else {
    assertLocalFallbackEnabled('Export bundle verification');
  }

  const bundle = await getExportBundle(bundleId, session);
  const submittedBundleHash = bundleHash ?? bundle.integrity.bundleHash;

  return {
    bundleId,
    verificationStatus: submittedBundleHash === bundle.integrity.bundleHash ? 'verified' : 'mismatch',
    submittedBundleHash,
    bundleHash: bundle.integrity.bundleHash,
    manifestHash: bundle.integrity.manifestHash,
    verifiedAt: new Date().toISOString(),
  };
}

function signingRequiresBackend(): never {
  throw new BackendApiError(
    'UNAVAILABLE',
    'Export signing requires the backend local software-key adapter; local fallback does not fabricate signatures',
  );
}

export async function signExportBundle(
  bundleId: string,
  session: AuthenticatedFrontendSession,
): Promise<ExportBundleSignature> {
  if (session.source !== 'backend') {
    signingRequiresBackend();
  }

  return requestJson<ExportBundleSignature>(`/api/v1/export-bundles/${encodeURIComponent(bundleId)}/sign`, {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}

export async function getExportBundleSignature(
  bundleId: string,
  session: AuthenticatedFrontendSession,
): Promise<ExportBundleSignature> {
  if (session.source !== 'backend') {
    signingRequiresBackend();
  }

  return requestJson<ExportBundleSignature>(`/api/v1/export-bundles/${encodeURIComponent(bundleId)}/signature`, {
    headers: createSessionHeaders(session),
  });
}

export async function verifyExportBundleSignature(
  bundleId: string,
  session: AuthenticatedFrontendSession,
  manifestHash?: string,
): Promise<ExportBundleSignatureVerificationResult> {
  if (session.source !== 'backend') {
    signingRequiresBackend();
  }

  return requestJson<ExportBundleSignatureVerificationResult>(
    `/api/v1/export-bundles/${encodeURIComponent(bundleId)}/verify-signature`,
    {
      method: 'POST',
      headers: {
        ...createSessionHeaders(session),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ manifestHash }),
    },
  );
}
