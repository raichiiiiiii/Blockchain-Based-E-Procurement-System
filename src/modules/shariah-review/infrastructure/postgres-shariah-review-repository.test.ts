import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import { PostgresShariahReviewRepository } from './postgres-shariah-review-repository.js';

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

const approvedReview: ShariahReview = {
  id: 'review-demo-approved',
  organizationId: 'demo-supplier-org',
  title: 'Restricted PLS seedbed review',
  summary: 'Review of the Amanah-Barakah procurement-linked PLS seedbed contract.',
  status: 'approved',
  submittedByUserId: 'demo-shariah-user',
  createdAt: '2026-05-20T10:00:00.000Z',
  references: [
    {
      type: 'contractTemplate',
      name: 'Mudarabah procurement template',
      uri: 'demo://shariah/mudarabah-procurement-v1',
      description: 'Safe reference metadata for restricted PLS seedbed review.',
      mediaType: 'application/json',
    },
  ],
  checklist: {
    status: 'checklistComplete',
    reviewerComment: 'Checklist completed for supervised demo scope.',
    entries: [
      {
        itemCode: 'item1',
        outcome: 'pass',
      },
      {
        itemCode: 'item2',
        outcome: 'pass',
        evidenceRefs: ['demo://shariah/evidence/template-hash'],
      },
      {
        itemCode: 'item4',
        outcome: 'pass',
      },
    ],
  },
  rationale: 'Approved for restricted MVP seedbed demonstration only.',
  decidedAt: '2026-05-21T10:00:00.000Z',
};

const approvedReviewRow = {
  review_id: approvedReview.id,
  organization_id: approvedReview.organizationId,
  title: approvedReview.title,
  summary: approvedReview.summary,
  status: approvedReview.status,
  submitted_by_user_id: approvedReview.submittedByUserId,
  created_at: new Date(approvedReview.createdAt),
  references_json: approvedReview.references,
  checklist: approvedReview.checklist,
  rationale: approvedReview.rationale,
  conditions: [],
  decided_at: new Date(approvedReview.decidedAt!),
};

test('PostgresShariahReviewRepository saves review metadata without raw financing documents', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresShariahReviewRepository(db);

  await repository.save(approvedReview);

  assert.match(db.queries[0].text, /INSERT INTO shariah_reviews/);
  assert.strictEqual(db.queries[0].values?.[0], approvedReview.id);
  assert.strictEqual(db.queries[0].values?.[4], 'approved');
  assert.strictEqual(db.queries[0].values?.[9], approvedReview.rationale);
  assert.strictEqual((approvedReview as ShariahReview & { rawContractDocument?: unknown }).rawContractDocument, undefined);
});

test('PostgresShariahReviewRepository maps approved review rows for durable PLS governance reads', async () => {
  const db = new FakePostgresExecutor([[approvedReviewRow]]);
  const repository = new PostgresShariahReviewRepository(db);

  const found = await repository.findById(approvedReview.id);

  assert.strictEqual(found?.id, approvedReview.id);
  assert.strictEqual(found?.status, 'approved');
  assert.strictEqual(found?.references?.[0]?.uri, 'demo://shariah/mudarabah-procurement-v1');
  assert.strictEqual(found?.checklist?.status, 'checklistComplete');
  assert.strictEqual(found?.decidedAt, approvedReview.decidedAt);
});

test('PostgresShariahReviewRepository returns null for missing reviews', async () => {
  const db = new FakePostgresExecutor([[]]);
  const repository = new PostgresShariahReviewRepository(db);

  const found = await repository.findById('missing-review');

  assert.strictEqual(found, null);
  assert.match(db.queries[0].text, /WHERE review_id = \$1/);
});
