import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { registerExportBundleRoutes } from './export-bundle.routes.js';
import { InMemoryExportBundleRepository } from '../infrastructure/in-memory-export-bundle-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import { createAccessAuditEvent } from '../../shared/application/access-audit-event-builder.js';
import type { ProcureToPayLifecycleEvent } from '../../procurement/application/procure-to-pay-lifecycle-event.js';
import type { ExportSigningPort } from '../application/export-signing-port.js';
import { LocalSoftwareKeyExportSigningAdapter } from '../infrastructure/local-software-key-export-signing-adapter.js';

function authorizedHeaders(role = 'regulator'): Record<string, string> {
  return {
    'x-actor-id': `${role}-user`,
    'x-actor-role': role,
  };
}

function lifecycleEvent(overrides: Partial<ProcureToPayLifecycleEvent> = {}): ProcureToPayLifecycleEvent {
  return {
    eventId: 'ptp-event-1',
    schemaVersion: 'procure-to-pay-lifecycle-event.v1',
    occurredAt: '2026-05-25T04:01:00.000Z',
    recordedAt: '2026-05-25T04:01:03.000Z',
    requestId: 'req-ptp-1',
    correlationId: 'corr-ptp-1',
    caseId: 'case-ptp-1',
    lifecycleStage: 'purchaseOrder',
    eventType: 'purchaseOrderAccepted',
    actorUserId: 'supplier-user',
    actorSource: 'actorContext',
    targetType: 'purchaseOrder',
    targetId: 'po-1',
    outcome: 'success',
    immutableReference: {
      payloadHash: `sha256:${'1'.repeat(64)}`,
      canonicalization: 'json-stable-v1',
    },
    ...overrides,
  };
}

async function createApp(options: {
  accessRepository?: InMemoryAccessAuditEventRepository;
  lifecycleRepository?: InMemoryProcureToPayLifecycleEventRepository;
  anchorRepository?: InMemoryBlockchainAnchorMetadataRepository;
  exportRepository?: InMemoryExportBundleRepository;
  signingPort?: ExportSigningPort;
} = {}) {
  const app = fastify();
  app.register(actorContextPlugin);
  app.register(registerExportBundleRoutes, {
    repository: options.exportRepository ?? new InMemoryExportBundleRepository(),
    accessAuditEventRepository: options.accessRepository,
    lifecycleEventRepository: options.lifecycleRepository,
    blockchainAnchorMetadataRepository: options.anchorRepository,
    signingPort: options.signingPort ?? new LocalSoftwareKeyExportSigningAdapter({
      now: () => '2026-05-26T10:00:00.000Z',
    }),
  });
  await app.ready();
  return app;
}

async function createSeededRepositories() {
  const accessRepository = new InMemoryAccessAuditEventRepository();
  await accessRepository.save(createAccessAuditEvent({
    eventId: 'access-event-1',
    requestId: 'req-access-1',
    actorUserId: 'admin-user',
    action: 'changeRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'assign-1',
    outcome: 'success',
    module: 'access-control',
    route: '/api/v1/role-assignments/assign-1',
    method: 'PATCH',
    occurredAt: '2026-05-25T04:00:00.000Z',
  }));

  const lifecycleRepository = new InMemoryProcureToPayLifecycleEventRepository();
  await lifecycleRepository.save(lifecycleEvent());

  const anchorRepository = new InMemoryBlockchainAnchorMetadataRepository([{
    eventId: 'ptp-event-1',
    payloadHash: `sha256:${'1'.repeat(64)}`,
    caseIdHash: `sha256:${'a'.repeat(64)}`,
    anchorStatus: 'anchored',
    blockchainNetwork: 'fabric-local',
    channelName: 'procurement-channel',
    chaincodeName: 'audit-anchor',
    transactionId: 'fabric-tx-1',
    anchoredAt: '2026-05-25T04:02:00.000Z',
    createdAt: '2026-05-25T04:02:01.000Z',
    updatedAt: '2026-05-25T04:02:01.000Z',
  }]);

  return {
    accessRepository,
    lifecycleRepository,
    anchorRepository,
    exportRepository: new InMemoryExportBundleRepository(),
  };
}

describe('Export bundle routes', () => {
  it('creates a regulator export bundle with manifest and integrity metadata', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const response = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('regulator'),
      payload: {
        scope: 'combinedAudit',
        purpose: 'supervisory review',
        occurredFrom: '2026-05-25T00:00:00.000Z',
        occurredTo: '2026-05-26T00:00:00.000Z',
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(body.data.status, 'generated');
    assert.strictEqual(body.data.scope, 'combinedAudit');
    assert.strictEqual(body.data.manifest.recordCount, 3);
    assert.strictEqual(body.data.manifest.accessEventCount, 1);
    assert.strictEqual(body.data.manifest.lifecycleEventCount, 1);
    assert.strictEqual(body.data.manifest.anchorMetadataCount, 1);
    assert.strictEqual(body.data.integrity.proofType, 'mvp-manifest-hash');
    assert.match(body.data.integrity.bundleHash, /^sha256:/);
    assert.strictEqual(body.data.manifest.records[0].rawPayload, undefined);
  });

  it('rejects invalid export scope', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const response = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('regulator'),
      payload: {
        scope: 'allPrivateDocuments',
        purpose: 'supervisory review',
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.issues.some((issue: { path: string }) => issue.path === 'scope'));
  });

  it('denies unauthorized export requesters', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const response = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('buyer'),
      payload: {
        scope: 'combinedAudit',
        purpose: 'supervisory review',
      },
    });

    const body = JSON.parse(response.body);
    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(body.error.code, 'FORBIDDEN');
  });

  it('retrieves and verifies a generated bundle', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('auditor'),
      payload: {
        scope: 'procureToPay',
        purpose: 'audit review',
      },
    });

    const created = JSON.parse(createResponse.body).data;
    const getResponse = await app.inject({
      method: 'GET',
      url: `/export-bundles/${created.bundleId}`,
      headers: authorizedHeaders('auditor'),
    });
    const getBody = JSON.parse(getResponse.body);
    assert.strictEqual(getResponse.statusCode, 200);
    assert.strictEqual(getBody.data.bundleId, created.bundleId);

    const verifyResponse = await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/verify`,
      headers: authorizedHeaders('auditor'),
      payload: {
        bundleHash: created.integrity.bundleHash,
      },
    });
    const verifyBody = JSON.parse(verifyResponse.body);
    assert.strictEqual(verifyResponse.statusCode, 200);
    assert.strictEqual(verifyBody.data.verificationStatus, 'verified');
    assert.strictEqual(verifyBody.data.bundleHash, created.integrity.bundleHash);
  });

  it('signs a generated bundle and verifies the detached signature without leaking private key material', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('regulator'),
      payload: {
        scope: 'combinedAudit',
        purpose: 'signature review',
      },
    });
    const created = JSON.parse(createResponse.body).data;

    const signResponse = await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/sign`,
      headers: authorizedHeaders('regulator'),
    });
    const signatureBody = JSON.parse(signResponse.body);

    assert.strictEqual(signResponse.statusCode, 200);
    assert.strictEqual(signatureBody.data.bundleId, created.bundleId);
    assert.strictEqual(signatureBody.data.algorithm, 'Ed25519');
    assert.strictEqual(signatureBody.data.keyStatus, 'active');
    assert.strictEqual(signatureBody.data.status, 'signed');
    assert.strictEqual(signatureBody.data.manifestHash, created.integrity.manifestHash);
    assert.strictEqual(signatureBody.data.claimBoundary, 'localSoftwareKeyOnly');
    assert.match(signatureBody.data.publicKeyPem, /BEGIN PUBLIC KEY/);
    assert.doesNotMatch(JSON.stringify(signatureBody.data), /PRIVATE KEY/);
    assert.strictEqual(signatureBody.data.offlineVerificationPackage.manifestFileName, 'manifest.json');

    const getSignatureResponse = await app.inject({
      method: 'GET',
      url: `/export-bundles/${created.bundleId}/signature`,
      headers: authorizedHeaders('auditor'),
    });
    assert.strictEqual(getSignatureResponse.statusCode, 200);
    assert.strictEqual(JSON.parse(getSignatureResponse.body).data.signatureId, signatureBody.data.signatureId);

    const verifySignatureResponse = await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/verify-signature`,
      headers: authorizedHeaders('auditor'),
      payload: {
        manifestHash: created.integrity.manifestHash,
      },
    });
    const verifySignatureBody = JSON.parse(verifySignatureResponse.body);
    assert.strictEqual(verifySignatureResponse.statusCode, 200);
    assert.strictEqual(verifySignatureBody.data.verificationStatus, 'verified');
    assert.strictEqual(verifySignatureBody.data.keyId, signatureBody.data.keyId);
  });

  it('returns invalid signature verification for a tampered manifest hash', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('regulator'),
      payload: {
        scope: 'combinedAudit',
        purpose: 'tamper check',
      },
    });
    const created = JSON.parse(createResponse.body).data;

    await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/sign`,
      headers: authorizedHeaders('regulator'),
    });

    const verifySignatureResponse = await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/verify-signature`,
      headers: authorizedHeaders('regulator'),
      payload: {
        manifestHash: `sha256:${'0'.repeat(64)}`,
      },
    });
    const body = JSON.parse(verifySignatureResponse.body);

    assert.strictEqual(verifySignatureResponse.statusCode, 200);
    assert.strictEqual(body.data.verificationStatus, 'invalid');
    assert.strictEqual(body.data.reason, 'signatureMismatch');
  });

  it('rejects signing when the local signing profile is inactive', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp({
      ...repositories,
      signingPort: new LocalSoftwareKeyExportSigningAdapter({
        now: () => '2026-05-26T10:00:00.000Z',
        initialStatus: 'revoked',
      }),
    });

    const createResponse = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('regulator'),
      payload: {
        scope: 'combinedAudit',
        purpose: 'inactive key check',
      },
    });
    const created = JSON.parse(createResponse.body).data;

    const signResponse = await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/sign`,
      headers: authorizedHeaders('regulator'),
    });
    const body = JSON.parse(signResponse.body);

    assert.strictEqual(signResponse.statusCode, 409);
    assert.strictEqual(body.error.details.reason, 'signingProfileInactive');
  });

  it('returns mismatch and notFound verification states distinctly', async () => {
    const repositories = await createSeededRepositories();
    const app = await createApp(repositories);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/export-bundles',
      headers: authorizedHeaders('regulator'),
      payload: {
        scope: 'accessHistory',
        purpose: 'access review',
      },
    });

    const created = JSON.parse(createResponse.body).data;
    const mismatchResponse = await app.inject({
      method: 'POST',
      url: `/export-bundles/${created.bundleId}/verify`,
      headers: authorizedHeaders('regulator'),
      payload: {
        bundleHash: `sha256:${'0'.repeat(64)}`,
      },
    });
    const mismatchBody = JSON.parse(mismatchResponse.body);
    assert.strictEqual(mismatchResponse.statusCode, 200);
    assert.strictEqual(mismatchBody.data.verificationStatus, 'mismatch');

    const missingResponse = await app.inject({
      method: 'POST',
      url: '/export-bundles/missing-bundle/verify',
      headers: authorizedHeaders('regulator'),
      payload: {},
    });
    const missingBody = JSON.parse(missingResponse.body);
    assert.strictEqual(missingResponse.statusCode, 200);
    assert.strictEqual(missingBody.data.verificationStatus, 'notFound');
  });
});
