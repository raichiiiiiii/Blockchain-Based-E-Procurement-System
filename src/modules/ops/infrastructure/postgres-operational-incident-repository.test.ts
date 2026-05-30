import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { OperationalIncident } from '../application/operational-incident.js';
import { PostgresOperationalIncidentRepository } from './postgres-operational-incident-repository.js';

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

const incident: OperationalIncident = {
  incidentId: 'ops-incident-fabric-unavailable',
  severity: 'warning',
  source: 'fabric',
  message: 'Fabric proof adapter is unavailable for the current runtime readiness check.',
  status: 'open',
  occurredAt: '2026-05-30T10:00:00.000Z',
};

const incidentRow = {
  incident_id: incident.incidentId,
  severity: incident.severity,
  source: incident.source,
  message: incident.message,
  status: incident.status,
  occurred_at: new Date(incident.occurredAt),
  resolved_at: null,
};

test('PostgresOperationalIncidentRepository saves operational readiness incidents', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresOperationalIncidentRepository(db);

  await repository.save(incident);

  assert.match(db.queries[0].text, /INSERT INTO operational_incidents/);
  assert.strictEqual(db.queries[0].values?.[0], incident.incidentId);
  assert.strictEqual(db.queries[0].values?.[2], 'fabric');
  assert.strictEqual(db.queries[0].values?.[6], null);
});

test('PostgresOperationalIncidentRepository lists incidents in stable reverse occurrence order', async () => {
  const db = new FakePostgresExecutor([[incidentRow]]);
  const repository = new PostgresOperationalIncidentRepository(db);

  const incidents = await repository.list();

  assert.strictEqual(incidents[0]?.incidentId, incident.incidentId);
  assert.strictEqual(incidents[0]?.occurredAt, incident.occurredAt);
  assert.strictEqual(incidents[0]?.resolvedAt, undefined);
  assert.match(db.queries[0].text, /ORDER BY occurred_at DESC, incident_id ASC/);
});

test('PostgresOperationalIncidentRepository maps resolved incidents', async () => {
  const resolvedAt = '2026-05-30T10:05:00.000Z';
  const db = new FakePostgresExecutor([[
    {
      ...incidentRow,
      status: 'resolved',
      resolved_at: new Date(resolvedAt),
    },
  ]]);
  const repository = new PostgresOperationalIncidentRepository(db);

  const incidents = await repository.list();

  assert.strictEqual(incidents[0]?.status, 'resolved');
  assert.strictEqual(incidents[0]?.resolvedAt, resolvedAt);
});

test('PostgresOperationalIncidentRepository resolves open incidents by source', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresOperationalIncidentRepository(db);

  await repository.resolveOpenBySource('database', '2026-05-30T10:05:00.000Z');

  assert.match(db.queries[0].text, /UPDATE operational_incidents/);
  assert.strictEqual(db.queries[0].values?.[0], 'database');
  assert.strictEqual(db.queries[0].values?.[1], '2026-05-30T10:05:00.000Z');
});
