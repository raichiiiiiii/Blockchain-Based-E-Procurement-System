import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { createAccessAuditEvent } from '../../shared/application/access-audit-event-builder.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../../blockchain/infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import { InMemoryOperationalIncidentRepository } from '../../ops/infrastructure/in-memory-operational-incident-repository.js';
import type { RuntimeReadiness } from '../../ops/application/runtime-readiness.js';

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

async function createSecurityAlertTestContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const accessAuditEventRepository = new InMemoryAccessAuditEventRepository();
  const operationalIncidentRepository = new InMemoryOperationalIncidentRepository();
  const blockchainAnchorMetadataRepository = new InMemoryBlockchainAnchorMetadataRepository([{
    eventId: 'proof-event-failed',
    payloadHash: `sha256:${'4'.repeat(64)}`,
    caseIdHash: `sha256:${'a'.repeat(64)}`,
    anchorStatus: 'failed',
    failureReason: 'blockchain_unavailable',
    createdAt: '2026-05-25T04:08:00.000Z',
    updatedAt: '2026-05-25T04:09:00.000Z',
  }, {
    eventId: 'proof-event-anchored',
    payloadHash: `sha256:${'5'.repeat(64)}`,
    caseIdHash: `sha256:${'a'.repeat(64)}`,
    anchorStatus: 'anchored',
    blockchainNetwork: 'fabric-local',
    transactionId: 'fabric-tx-safe-reference',
    createdAt: '2026-05-25T04:10:00.000Z',
    updatedAt: '2026-05-25T04:10:00.000Z',
  }]);

  await accessAuditEventRepository.save(createAccessAuditEvent({
    eventId: 'access-denied-1',
    requestId: 'req-denied-1',
    actorUserId: 'buyer-user',
    action: 'changeRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'assignment-1',
    outcome: 'forbidden',
    reason: 'admin_required',
    module: 'access-control',
    route: '/api/v1/role-assignments/change',
    method: 'PATCH',
    occurredAt: '2026-05-25T04:04:00.000Z',
  }));

  await accessAuditEventRepository.save(createAccessAuditEvent({
    eventId: 'access-success-1',
    requestId: 'req-success-1',
    actorUserId: 'admin-user',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control',
    route: '/api/v1/roles',
    method: 'POST',
    occurredAt: '2026-05-25T04:02:00.000Z',
  }));

  const sessions = [
    ['security-token', 'security-user', 'security-org', ['securityOperator']],
    ['admin-token', 'admin-user', 'platform-org', ['administrator']],
    ['buyer-token', 'buyer-user', 'buyer-org', ['buyer']],
    ['supplier-token', 'supplier-user', 'supplier-org', ['supplier']],
    ['compliance-token', 'compliance-user', 'compliance-org', ['complianceReviewer']],
    ['financier-token', 'financier-user', 'financier-org', ['financier']],
  ] as const;

  for (const [token, actorUserId, actorOrganizationId, actorRoleCodes] of sessions) {
    await createSession(sessionRepository, {
      token,
      actorUserId,
      actorOrganizationId,
      actorRoleCodes: [...actorRoleCodes],
    });
  }

  const server = createTestableServer({
    sessionRepository,
    accessAuditEventRepository,
    blockchainAnchorMetadataRepository,
    operationalIncidentRepository,
  });
  await server.ready();

  return { server };
}

test('security operator can read backend security alerts', async () => {
  const { server } = await createSecurityAlertTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/security/alerts',
    headers: {
      authorization: 'Bearer security-token',
    },
  });

  const body = response.json();
  assert.strictEqual(response.statusCode, 200);
  assert.ok(body.data.generatedAt);
  assert.strictEqual(body.data.items.length, 2);
  assert.deepStrictEqual(
    body.data.items.map((item: { alertType: string }) => item.alertType).sort(),
    ['deniedAction', 'proofFailure'],
  );
});

test('administrator can read backend security alerts', async () => {
  const { server } = await createSecurityAlertTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/security/alerts',
    headers: {
      authorization: 'Bearer admin-token',
    },
  });

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(response.json().data.items.length, 2);
});

test('non-security roles cannot read backend security alerts', async () => {
  const { server } = await createSecurityAlertTestContext();

  for (const token of ['buyer-token', 'supplier-token', 'compliance-token', 'financier-token']) {
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/security/alerts',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(response.json().error.code, 'FORBIDDEN');
  }
});

test('anonymous security alert request is denied', async () => {
  const { server } = await createSecurityAlertTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/security/alerts',
  });

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
});

test('proof failure appears as a security alert without fabricating verified state', async () => {
  const { server } = await createSecurityAlertTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/security/alerts',
    headers: {
      authorization: 'Bearer security-token',
    },
  });

  const proofAlert = response.json().data.items.find(
    (item: { alertType: string }) => item.alertType === 'proofFailure',
  );

  assert.ok(proofAlert);
  assert.strictEqual(proofAlert.source, 'blockchainAnchor');
  assert.strictEqual(proofAlert.relatedEventId, 'proof-event-failed');
  assert.strictEqual(proofAlert.relatedProofStatus, 'failed');
  assert.match(proofAlert.message, /anchoring failed/i);
  assert.doesNotMatch(proofAlert.message, /verified/i);
});

test('denied access event appears as a security alert', async () => {
  const { server } = await createSecurityAlertTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/security/alerts',
    headers: {
      authorization: 'Bearer security-token',
    },
  });

  const deniedAlert = response.json().data.items.find(
    (item: { alertType: string }) => item.alertType === 'deniedAction',
  );

  assert.ok(deniedAlert);
  assert.strictEqual(deniedAlert.source, 'accessAudit');
  assert.strictEqual(deniedAlert.actorUserId, 'buyer-user');
  assert.strictEqual(deniedAlert.relatedEventId, 'access-denied-1');
  assert.match(deniedAlert.message, /denied/i);
});

test('operational readiness incidents appear as security alerts', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const operationalIncidentRepository = new InMemoryOperationalIncidentRepository();

  await createSession(sessionRepository, {
    token: 'security-token',
    actorUserId: 'security-user',
    actorOrganizationId: 'security-org',
    actorRoleCodes: ['securityOperator'],
  });

  const degradedReadiness: RuntimeReadiness = {
    status: 'degraded',
    checks: {
      database: {
        mode: 'postgres',
        reachable: false,
      },
      fabric: {
        mode: 'unavailable',
      },
      payment: {
        mode: 'notConfigured',
        configured: false,
      },
      demoSeed: {
        enabled: true,
      },
    },
  };

  const server = createTestableServer({
    sessionRepository,
    operationalIncidentRepository,
    readiness: async () => degradedReadiness,
  });
  await server.ready();

  await server.inject({
    method: 'GET',
    url: '/ready',
  });

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/security/alerts',
    headers: {
      authorization: 'Bearer security-token',
    },
  });

  const operationalAlerts = response.json().data.items.filter(
    (item: { alertType: string }) => item.alertType === 'operationalIncident',
  );

  assert.strictEqual(response.statusCode, 200);
  assert.strictEqual(operationalAlerts.length, 2);
  assert.ok(operationalAlerts.every((alert: { source: string }) => alert.source === 'operational'));
});
