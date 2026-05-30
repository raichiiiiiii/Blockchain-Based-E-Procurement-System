import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { ExportBundleRecord } from '../domain/export-bundle.js';
import { PostgresExportBundleRepository } from './postgres-export-bundle-repository.js';

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakePostgresExecutor implements PostgresExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly responses: QueryResultRow[][]) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) {
    this.queries.push({ text, values });
    const rows = (this.responses.shift() ?? []) as T[];
    return {
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }
}

const bundle: ExportBundleRecord = {
  bundleId: 'bundle-demo-001',
  status: 'generated',
  scope: 'combinedAudit',
  purpose: 'Supervisor evidence export',
  requestedByUserId: 'demo-regulator-user',
  requestedAt: '2026-05-23T10:00:00.000Z',
  generatedAt: '2026-05-23T10:00:00.000Z',
  manifest: {
    manifestId: 'manifest-bundle-demo-001',
    scope: 'combinedAudit',
    generatedAt: '2026-05-23T10:00:00.000Z',
    requestedByUserId: 'demo-regulator-user',
    dateRange: {},
    recordCount: 1,
    accessEventCount: 0,
    lifecycleEventCount: 1,
    anchorMetadataCount: 0,
    records: [
      {
        recordType: 'procureToPayLifecycleEvent',
        recordId: 'demo-ptp-event-001',
        occurredAt: '2026-05-23T09:00:00.000Z',
        payloadHash: 'sha256:demo-ptp-event-hash',
        source: 'transaction-history',
      },
    ],
  },
  integrity: {
    canonicalization: 'json-stable-v1',
    proofType: 'mvp-manifest-hash',
    manifestHash: 'sha256:demo-manifest-hash',
    bundleHash: 'sha256:demo-bundle-hash',
  },
  signature: {
    signatureId: 'signature-demo-001',
    bundleId: 'bundle-demo-001',
    signingProfileId: 'local-software-key',
    algorithm: 'Ed25519',
    keyId: 'local-key-001',
    keyStatus: 'active',
    status: 'signed',
    manifestHash: 'sha256:demo-manifest-hash',
    bundleHash: 'sha256:demo-bundle-hash',
    signedPayloadHash: 'sha256:demo-signed-payload-hash',
    signature: 'base64-demo-signature',
    signedAt: '2026-05-23T10:01:00.000Z',
    publicKeyPem: '-----BEGIN PUBLIC KEY----- demo -----END PUBLIC KEY-----',
    verificationInstructions: 'Verify locally for MVP evidence review only.',
    offlineVerificationPackage: {
      manifestFileName: 'manifest.json',
      signatureFileName: 'bundle-demo-001.manifest.sig',
      publicKeyFileName: 'bundle-demo-001.public-key.pem',
      instructionsFileName: 'VERIFY_SIGNATURE.txt',
    },
    claimBoundary: 'localSoftwareKeyOnly',
  },
  download: {
    available: true,
    reference: 'export-bundles/bundle-demo-001.json',
    contentType: 'application/json',
  },
};

const bundleRow = {
  bundle_id: bundle.bundleId,
  status: bundle.status,
  scope: bundle.scope,
  purpose: bundle.purpose,
  requested_by_user_id: bundle.requestedByUserId,
  requested_at: new Date(bundle.requestedAt),
  generated_at: new Date(bundle.generatedAt),
  failure_reason: null,
  manifest: bundle.manifest,
  integrity: bundle.integrity,
  signature: bundle.signature,
  download: bundle.download,
};

test('PostgresExportBundleRepository saves manifest and signature metadata without private keys', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresExportBundleRepository(db);

  await repository.save(bundle);

  assert.match(db.queries[0].text, /INSERT INTO export_bundles/);
  assert.strictEqual(db.queries[0].values?.[0], bundle.bundleId);
  assert.strictEqual(db.queries[0].values?.[10], JSON.stringify(bundle.signature));
  assert.strictEqual((bundle.signature as typeof bundle.signature & { privateKeyPem?: unknown }).privateKeyPem, undefined);
});

test('PostgresExportBundleRepository maps signed bundle rows for verification reads', async () => {
  const db = new FakePostgresExecutor([[bundleRow]]);
  const repository = new PostgresExportBundleRepository(db);

  const found = await repository.findById(bundle.bundleId);

  assert.strictEqual(found?.bundleId, bundle.bundleId);
  assert.strictEqual(found?.integrity.bundleHash, 'sha256:demo-bundle-hash');
  assert.strictEqual(found?.signature?.claimBoundary, 'localSoftwareKeyOnly');
  assert.strictEqual(found?.requestedAt, bundle.requestedAt);
});

test('PostgresExportBundleRepository lists bundles in stable requested order', async () => {
  const db = new FakePostgresExecutor([[bundleRow]]);
  const repository = new PostgresExportBundleRepository(db);

  const bundles = await repository.list();

  assert.strictEqual(bundles[0]?.bundleId, bundle.bundleId);
  assert.match(db.queries[0].text, /ORDER BY requested_at ASC, bundle_id ASC/);
});

test('PostgresExportBundleRepository returns null for missing bundle', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresExportBundleRepository(db);

  const found = await repository.findById('missing-bundle');

  assert.strictEqual(found, null);
});
