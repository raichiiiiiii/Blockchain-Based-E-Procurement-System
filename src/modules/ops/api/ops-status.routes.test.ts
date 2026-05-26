import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryOperationalIncidentRepository } from '../infrastructure/in-memory-operational-incident-repository.js';
import type { RuntimeReadiness } from '../application/runtime-readiness.js';

async function createSession(
  repository: InMemoryAuthSessionRepository,
  token: string,
  roles: string[],
) {
  await repository.save({
    sessionId: `session-${token}`,
    tokenHash: hashToken(token),
    actorUserId: `user-${token}`,
    actorOrganizationId: `org-${token}`,
    actorRoleCodes: roles,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
  });
}

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

async function createOpsStatusTestContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const operationalIncidentRepository = new InMemoryOperationalIncidentRepository();

  await createSession(sessionRepository, 'security-token', ['securityOperator']);
  await createSession(sessionRepository, 'admin-token', ['administrator']);
  await createSession(sessionRepository, 'buyer-token', ['buyer']);

  const server = createTestableServer({
    sessionRepository,
    operationalIncidentRepository,
    readiness: async () => degradedReadiness,
  });
  await server.ready();

  return { server, operationalIncidentRepository };
}

test('security operator can read operational status and readiness incidents', async () => {
  const { server } = await createOpsStatusTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/ops/status',
    headers: {
      authorization: 'Bearer security-token',
    },
  });

  const body = response.json();
  assert.strictEqual(response.statusCode, 200);
  assert.ok(body.data.generatedAt);
  assert.strictEqual(body.data.readiness.status, 'degraded');
  assert.strictEqual(body.data.readiness.checks.payment.mode, 'notConfigured');
  assert.deepStrictEqual(
    body.data.incidents.map((incident: { source: string }) => incident.source).sort(),
    ['database', 'fabric'],
  );
});

test('administrator can read operational status', async () => {
  const { server } = await createOpsStatusTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/ops/status',
    headers: {
      authorization: 'Bearer admin-token',
    },
  });

  assert.strictEqual(response.statusCode, 200);
});

test('non-operator roles cannot read operational status', async () => {
  const { server } = await createOpsStatusTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/ops/status',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
});

test('anonymous operational status request is denied', async () => {
  const { server } = await createOpsStatusTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/ops/status',
  });

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
});
