import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { ErpIntegrationJob } from '../domain/erp-accounting.js';
import { PostgresErpIntegrationJobRepository } from './postgres-erp-integration-job-repository.js';

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

const job: ErpIntegrationJob = {
  jobId: 'erp-job-demo-001',
  direction: 'export',
  profileType: 'ublOrder',
  sourceId: 'demo-order-001',
  status: 'completed',
  payload: {
    standard: 'UBL-like',
    documentType: 'Order',
    id: 'demo-order-001',
  },
  mappingErrors: [],
  idempotencyKey: 'erp-idem-001',
  createdAt: '2026-05-30T10:00:00.000Z',
  claimBoundary: 'localJsonAdapterOnlyNoProductionErpSync',
};

const jobRow = {
  job_json: job,
};

test('PostgresErpIntegrationJobRepository saves local JSON ERP job with indexed metadata', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresErpIntegrationJobRepository(db);

  const saved = await repository.save(job);

  assert.strictEqual(saved.jobId, job.jobId);
  assert.match(db.queries[0].text, /INSERT INTO erp_integration_jobs/);
  assert.strictEqual(db.queries[0].values?.[0], job.jobId);
  assert.strictEqual(db.queries[0].values?.[2], job.profileType);
  assert.strictEqual(db.queries[0].values?.[6], JSON.stringify(job.mappingErrors));
  assert.strictEqual(db.queries[0].values?.[10], JSON.stringify(job));
});

test('PostgresErpIntegrationJobRepository finds jobs by id', async () => {
  const db = new FakePostgresExecutor([[jobRow]]);
  const repository = new PostgresErpIntegrationJobRepository(db);

  const found = await repository.getJob(job.jobId);

  assert.strictEqual(found?.jobId, job.jobId);
  assert.strictEqual(found?.claimBoundary, 'localJsonAdapterOnlyNoProductionErpSync');
  assert.deepStrictEqual(found?.payload, job.payload);
  assert.match(db.queries[0].text, /WHERE job_id = \$1/);
});

test('PostgresErpIntegrationJobRepository finds idempotent replay by profile and key', async () => {
  const db = new FakePostgresExecutor([[jobRow]]);
  const repository = new PostgresErpIntegrationJobRepository(db);

  const found = await repository.getJobByIdempotencyKey('ublOrder', 'erp-idem-001');

  assert.strictEqual(found?.jobId, job.jobId);
  assert.match(db.queries[0].text, /WHERE profile_type = \$1/);
  assert.match(db.queries[0].text, /AND idempotency_key = \$2/);
  assert.match(db.queries[0].text, /ORDER BY created_at ASC, job_id ASC/);
});

test('PostgresErpIntegrationJobRepository returns null for missing jobs', async () => {
  const db = new FakePostgresExecutor([[], []]);
  const repository = new PostgresErpIntegrationJobRepository(db);

  assert.strictEqual(await repository.getJob('missing-job'), null);
  assert.strictEqual(await repository.getJobByIdempotencyKey('ublOrder', 'missing-key'), null);
});
