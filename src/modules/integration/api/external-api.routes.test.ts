import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { createExternalSignature, hashExternalSecret } from '../application/external-request-signing.js';
import { InMemoryExternalApiAuditRepository } from '../infrastructure/in-memory-external-api-audit-repository.js';
import { InMemoryExternalClientCredentialRepository } from '../infrastructure/in-memory-external-client-credential-repository.js';
import { InMemoryExternalIdempotencyRepository } from '../infrastructure/in-memory-external-idempotency-repository.js';

const sharedSecret = 'external-test-secret';
const route = '/api/v1/external/proof/verify';
const body = {
  eventId: 'event-123',
  payloadHash: `sha256:${'a'.repeat(64)}`,
};

function signedHeaders(input: {
  clientId?: string;
  secret?: string;
  idempotencyKey?: string;
  timestamp?: string;
  requestBody?: unknown;
} = {}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const idempotencyKey = input.idempotencyKey ?? 'idem-1';
  const clientId = input.clientId ?? 'proof-client';
  const signature = createExternalSignature({
    method: 'POST',
    path: route,
    timestamp,
    idempotencyKey,
    body: input.requestBody ?? body,
  }, input.secret ?? sharedSecret);

  return {
    'x-client-id': clientId,
    'x-request-timestamp': timestamp,
    'x-signature': signature,
    'idempotency-key': idempotencyKey,
  };
}

async function createExternalApiTestContext(scopes: string[] = ['proof:verify']) {
  const externalClientCredentialRepository = new InMemoryExternalClientCredentialRepository([{
    clientId: 'proof-client',
    clientName: 'Proof Client',
    scopes: scopes as any,
    status: 'active',
    secretHash: hashExternalSecret(sharedSecret),
    createdAt: '2026-05-26T00:00:00.000Z',
  }]);
  const externalIdempotencyRepository = new InMemoryExternalIdempotencyRepository();
  const externalApiAuditRepository = new InMemoryExternalApiAuditRepository();

  const server = createTestableServer({
    externalClientCredentialRepository,
    externalIdempotencyRepository,
    externalApiAuditRepository,
    externalApiSharedSecret: sharedSecret,
  });
  await server.ready();

  return { server, externalApiAuditRepository };
}

test('valid scoped external client can submit a proof verification request', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders(),
    payload: body,
  });

  const responseBody = response.json();
  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 202);
  assert.strictEqual(responseBody.data.accepted, true);
  assert.strictEqual(responseBody.data.replayed, false);
  assert.strictEqual(responseBody.data.clientId, 'proof-client');
  assert.strictEqual(responseBody.data.scope, 'proof:verify');
  assert.strictEqual(JSON.stringify(responseBody).includes(sharedSecret), false);
  assert.strictEqual(auditEvents.at(-1)?.outcome, 'accepted');
});

test('external calls without signed authentication headers are rejected and audited', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();

  const response = await server.inject({
    method: 'POST',
    url: route,
    payload: body,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
  assert.strictEqual(auditEvents.at(-1)?.outcome, 'rejected');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'missing_external_auth_headers');
});

test('invalid external signatures are rejected', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ secret: 'wrong-secret' }),
    payload: body,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'invalid_external_signature');
});

test('valid external client without required scope is rejected', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext(['evidence:write']);

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders(),
    payload: body,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'external_scope_denied');
});

test('idempotency key replays return the original request id', async () => {
  const { server } = await createExternalApiTestContext();
  const headers = signedHeaders({ idempotencyKey: 'idem-replay' });

  const first = await server.inject({
    method: 'POST',
    url: route,
    headers,
    payload: body,
  });
  const second = await server.inject({
    method: 'POST',
    url: route,
    headers,
    payload: body,
  });

  assert.strictEqual(first.statusCode, 202);
  assert.strictEqual(second.statusCode, 200);
  assert.strictEqual(second.json().data.replayed, true);
  assert.strictEqual(second.json().data.requestId, first.json().data.requestId);
});

test('invalid external proof payload is rejected with the standard error envelope', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();
  const invalidBody = {
    eventId: 'event-123',
    payloadHash: 'not-a-sha256-hash',
  };

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ requestBody: invalidBody }),
    payload: invalidBody,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.json().error.code, 'VALIDATION_ERROR');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'invalid_external_proof_verify_payload');
});
