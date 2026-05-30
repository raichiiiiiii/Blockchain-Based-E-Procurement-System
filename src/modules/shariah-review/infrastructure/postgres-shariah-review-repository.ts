import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toRecord, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ShariahReviewRepository } from '../application/shariah-review-repository.js';
import type {
  Checklist,
  ChecklistEntry,
  Condition,
  ShariahReview,
  ShariahReviewReference,
  ShariahReviewStatus,
} from '../domain/shariah-review.js';

type ShariahReviewRow = {
  review_id: string;
  organization_id: string;
  title: string;
  summary: string;
  status: ShariahReviewStatus;
  submitted_by_user_id: string;
  created_at: Date | string;
  references_json: unknown;
  checklist: unknown | null;
  rationale: string | null;
  conditions: unknown;
  decided_at: Date | string | null;
};

function toReferences(value: unknown): ShariahReviewReference[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return value
    .map(item => toRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(item => ({
      type: String(item.type ?? ''),
      name: String(item.name ?? ''),
      uri: String(item.uri ?? ''),
      description: String(item.description ?? ''),
      mediaType: String(item.mediaType ?? ''),
    }));
}

function toChecklistEntry(value: unknown): ChecklistEntry | null {
  const record = toRecord(value);
  if (!record) {
    return null;
  }

  const entry: ChecklistEntry = {
    itemCode: String(record.itemCode ?? ''),
    outcome: record.outcome as ChecklistEntry['outcome'],
  };

  if (typeof record.comment === 'string') {
    entry.comment = record.comment;
  }

  const evidenceRefs = toStringArray(record.evidenceRefs);
  if (evidenceRefs.length > 0) {
    entry.evidenceRefs = evidenceRefs;
  }

  return entry;
}

function toChecklist(value: unknown): Checklist | undefined {
  const record = toRecord(value);
  if (!record || !Array.isArray(record.entries)) {
    return undefined;
  }

  const checklist: Checklist = {
    entries: record.entries
      .map(item => toChecklistEntry(item))
      .filter((item): item is ChecklistEntry => Boolean(item)),
    status: record.status as ShariahReviewStatus,
  };

  if (typeof record.reviewerComment === 'string') {
    checklist.reviewerComment = record.reviewerComment;
  }

  return checklist;
}

function toConditions(value: unknown): Condition[] | undefined {
  if (!Array.isArray(value) || value.length === 0) {
    return undefined;
  }

  return value
    .map(item => toRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(item => ({
      description: String(item.description ?? ''),
      dueDate: String(item.dueDate ?? ''),
    }));
}

function toShariahReview(row: ShariahReviewRow): ShariahReview {
  const review: ShariahReview = {
    id: row.review_id,
    organizationId: row.organization_id,
    title: row.title,
    summary: row.summary,
    status: row.status,
    submittedByUserId: row.submitted_by_user_id,
    createdAt: toIsoString(row.created_at),
  };

  const references = toReferences(row.references_json);
  if (references) {
    review.references = references;
  }

  const checklist = toChecklist(row.checklist);
  if (checklist) {
    review.checklist = checklist;
  }

  if (row.rationale) {
    review.rationale = row.rationale;
  }

  const conditions = toConditions(row.conditions);
  if (conditions) {
    review.conditions = conditions;
  }

  if (row.decided_at) {
    review.decidedAt = toIsoString(row.decided_at);
  }

  return review;
}

export class PostgresShariahReviewRepository implements ShariahReviewRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(review: ShariahReview): Promise<ShariahReview> {
    await this.db.query(
      `
        INSERT INTO shariah_reviews (
          review_id,
          organization_id,
          title,
          summary,
          status,
          submitted_by_user_id,
          created_at,
          references_json,
          checklist,
          rationale,
          conditions,
          decided_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11::jsonb, $12)
        ON CONFLICT (review_id)
        DO UPDATE SET
          organization_id = EXCLUDED.organization_id,
          title = EXCLUDED.title,
          summary = EXCLUDED.summary,
          status = EXCLUDED.status,
          submitted_by_user_id = EXCLUDED.submitted_by_user_id,
          created_at = EXCLUDED.created_at,
          references_json = EXCLUDED.references_json,
          checklist = EXCLUDED.checklist,
          rationale = EXCLUDED.rationale,
          conditions = EXCLUDED.conditions,
          decided_at = EXCLUDED.decided_at
      `,
      [
        review.id,
        review.organizationId,
        review.title,
        review.summary,
        review.status,
        review.submittedByUserId,
        review.createdAt,
        JSON.stringify(review.references ?? []),
        review.checklist ? JSON.stringify(review.checklist) : null,
        review.rationale ?? null,
        JSON.stringify(review.conditions ?? []),
        review.decidedAt ?? null,
      ],
    );

    return review;
  }

  async findById(id: string): Promise<ShariahReview | null> {
    const result = await this.db.query<ShariahReviewRow>(
      'SELECT * FROM shariah_reviews WHERE review_id = $1',
      [id],
    );

    return result.rows[0] ? toShariahReview(result.rows[0]) : null;
  }
}
