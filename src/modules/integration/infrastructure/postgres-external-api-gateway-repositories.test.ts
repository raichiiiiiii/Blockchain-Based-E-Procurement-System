import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { PostgresExternalApiAuditRepository } from './postgres-external-api-audit-repository.js';
import { PostgresExternalClientCredentialRepository } from './postgres-external-client-credential-repository.js';
import { PostgresExternalIdempotencyRepository } from './postgres-external-idempotency-repository.js';

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

test('PostgresExternalClientCredentialRepository maps active scoped client without raw secret', async () => {
  const db = new FakePostgresExecutor([
    [{
      client_id: 'proof-client',
      client_name: 'Proof Verification Client',
      scopes: ['proof:verify', 'evidence:write'],
      status: 'active',
      secret_hash: 'sha256:external-secret-hash',
      created_at: new Date('2026-05-30T10:00:00.000Z'),
      revoked_at: null,
    }],
  ]);
  const repository = new PostgresExternalClientCredentialRepository(db);

  const client = await repository.findByClientId('proof-client');

  assert.strictEqual(client?.clientId, 'proof-client');
  assert.deepStrictEqual(client?.scopes, ['proof:verify', 'evidence:write']);
  assert.strictEqual(client?.secretHash, 'sha256:external-secret-hash');
  assert.strictEqual(client?.createdAt, '2026-05-30T10:00:00.000Z');
  assert.match(db.queries[0].text, /FROM external_client_credentials/);
  assert.strictEqual(db.queries[0].values?.[0], 'proof-client');
});

test('PostgresExternalClientCredentialRepository returns null for unknown client', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresExternalClientCredentialRepository(db);

  const client = await repository.findByClientId('unknown-client');

  assert.strictEqual(client, null);
});

test('PostgresExternalIdempotencyRepository saves and finds idempotency records', async () => {
  const db = new FakePostgresExecutor([
    [],
    [{
      client_id: 'proof-client',
      route: '/api/v1/external/proof/verify',
      idempotency_key: 'idem-001',
      request_id: 'request-001',
      created_at: new Date('2026-05-30T10:01:00.000Z'),
    }],
  ]);
  const repository = new PostgresExternalIdempotencyRepository(db);

  await repository.save({
    clientId: 'proof-client',
    route: '/api/v1/external/proof/verify',
    idempotencyKey: 'idem-001',
    requestId: 'request-001',
    createdAt: '2026-05-30T10:01:00.000Z',
  });
  const record = await repository.find({
    clientId: 'proof-client',
    route: '/api/v1/external/proof/verify',
    idempotencyKey: 'idem-001',
  });

  assert.match(db.queries[0].text, /INSERT INTO external_idempotency_records/);
  assert.match(db.queries[0].text, /ON CONFLICT \(client_id, route, idempotency_key\)/);
  assert.strictEqual(record?.requestId, 'request-001');
  assert.strictEqual(record?.createdAt, '2026-05-30T10:01:00.000Z');
});

test('PostgresExternalApiAuditRepository saves and lists external request audit events', async () => {
  const db = new FakePostgresExecutor([
    [],
    [{
      event_id: 'external-audit-001',
      occurred_at: new Date('2026-05-30T10:02:00.000Z'),
      client_id: 'proof-client',
      action: 'verifyProof',
      route: '/api/v1/external/proof/verify',
      method: 'POST',
      outcome: 'accepted',
      reason: null,
      idempotency_key: 'idem-001',
    }],
  ]);
  const repository = new PostgresExternalApiAuditRepository(db);

  await repository.save({
    eventId: 'external-audit-001',
    occurredAt: '2026-05-30T10:02:00.000Z',
    clientId: 'proof-client',
    action: 'verifyProof',
    route: '/api/v1/external/proof/verify',
    method: 'POST',
    outcome: 'accepted',
    idempotencyKey: 'idem-001',
  });
  const events = await repository.list();

  assert.match(db.queries[0].text, /INSERT INTO external_api_audit_events/);
  assert.strictEqual(db.queries[0].values?.[7], null);
  assert.strictEqual(events[0]?.eventId, 'external-audit-001');
  assert.strictEqual(events[0]?.occurredAt, '2026-05-30T10:02:00.000Z');
  assert.strictEqual(events[0]?.idempotencyKey, 'idem-001');
  assert.match(db.queries[1].text, /ORDER BY occurred_at ASC, event_id ASC/);
});
