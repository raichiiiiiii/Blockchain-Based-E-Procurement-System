import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryOrganizationNetworkRepository } from '../../organization-network/infrastructure/in-memory-organization-network-repository.js';
import { InMemoryProductivityStateRepository } from '../infrastructure/in-memory-productivity-state-repository.js';

async function createSession(
  repository: InMemoryAuthSessionRepository,
  input: {
    token: string;
    actorUserId: string;
    actorOrganizationId: string;
    actorRoleCodes: string[];
  },
) {
  await repository.save({
    sessionId: `session-${input.actorUserId}`,
    tokenHash: hashToken(input.token),
    actorUserId: input.actorUserId,
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
  });
}

async function createProductivityContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const organizationNetworkRepository = new InMemoryOrganizationNetworkRepository();
  const productivityStateRepository = new InMemoryProductivityStateRepository();

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'demo-buyer-user',
    actorOrganizationId: 'demo-buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'outsider-token',
    actorUserId: 'outsider-user',
    actorOrganizationId: 'demo-platform-org',
    actorRoleCodes: ['unsupportedRole'],
  });

  const server = createTestableServer({
    sessionRepository,
    organizationNetworkRepository,
    productivityStateRepository,
  });
  await server.ready();

  return { server };
}

test('productivity summary exposes money tracker, action inbox, scorecard, and evidence checklist', async () => {
  const { server } = await createProductivityContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/company-productivity/summary',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(response.statusCode, 200);
  const summary = response.json().data;
  assert.equal(summary.moneyTracker.currency, 'MYR');
  assert.match(summary.moneyTracker.safeAmountLabel, /no payment execution/i);
  assert.ok(summary.pipeline.some((item: { stage: string }) => item.stage === 'deliveryEvidenceSubmitted'));
  assert.ok(summary.actionInbox.length >= 1);
  assert.ok(summary.supplierScorecards.length >= 1);
  assert.ok(summary.evidenceChecklist.length >= 1);
});

test('productivity tasks can be completed and saved views can be created', async () => {
  const { server } = await createProductivityContext();

  const taskResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/productivity/tasks',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(taskResponse.statusCode, 200);
  const task = taskResponse.json().data.items[0];

  const completeResponse = await server.inject({
    method: 'PATCH',
    url: `/api/v1/productivity/tasks/${task.taskId}`,
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(completeResponse.statusCode, 200);
  assert.equal(completeResponse.json().data.status, 'completed');

  const viewResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/productivity/saved-views',
    headers: {
      authorization: 'Bearer buyer-token',
    },
    payload: {
      name: 'Proof exceptions',
      filter: 'proofStatus in failed,mismatch,unavailable',
    },
  });

  assert.equal(viewResponse.statusCode, 201);
  assert.equal(viewResponse.json().data.name, 'Proof exceptions');
});

test('company ledger export returns safe manifest hash and notifications are scoped', async () => {
  const { server } = await createProductivityContext();

  const exportResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/company-ledger/exports',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(exportResponse.statusCode, 201);
  const manifest = exportResponse.json().data;
  assert.match(manifest.manifestHash, /^sha256:[0-9a-f]{64}$/);
  assert.match(manifest.safeSummary, /does not include raw documents/);

  const notificationResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/notifications',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(notificationResponse.statusCode, 200);
  assert.ok(Array.isArray(notificationResponse.json().data.items));
});

test('productivity routes reject anonymous and unsupported actors', async () => {
  const { server } = await createProductivityContext();

  const anonymousResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/company-productivity/summary',
  });
  assert.equal(anonymousResponse.statusCode, 401);

  const unsupportedResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/company-productivity/summary',
    headers: {
      authorization: 'Bearer outsider-token',
    },
  });
  assert.equal(unsupportedResponse.statusCode, 403);
});
