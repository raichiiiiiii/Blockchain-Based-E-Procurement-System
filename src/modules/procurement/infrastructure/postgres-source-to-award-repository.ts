import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { SourceToAwardRepository } from '../application/source-to-award-repository.js';
import type {
  SourceToAwardAward,
  SourceToAwardCase,
  SourceToAwardQuotation,
  SourceToAwardRequisition,
  SourceToAwardRfq,
  SourceToAwardStatus,
} from '../domain/source-to-award.js';

type SourceToAwardCaseRow = {
  case_id: string;
  buyer_organization_id: string;
  status: SourceToAwardStatus;
  requisition: unknown;
  rfq: unknown | null;
  quotations: unknown;
  award: unknown | null;
  generated_order_id: string | null;
  lifecycle_event_ids: unknown;
  latest_lifecycle_payload_hash: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function asObject<T>(value: unknown): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid source-to-award JSON payload from database');
  }

  return value as T;
}

function asArray<T>(value: unknown): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value as T[];
}

function toSourceToAwardCase(row: SourceToAwardCaseRow): SourceToAwardCase {
  return {
    caseId: row.case_id,
    buyerOrganizationId: row.buyer_organization_id,
    status: row.status,
    requisition: asObject<SourceToAwardRequisition>(row.requisition),
    rfq: row.rfq ? asObject<SourceToAwardRfq>(row.rfq) : undefined,
    quotations: asArray<SourceToAwardQuotation>(row.quotations),
    award: row.award ? asObject<SourceToAwardAward>(row.award) : undefined,
    generatedOrderId: row.generated_order_id ?? undefined,
    lifecycleEventIds: toStringArray(row.lifecycle_event_ids),
    latestLifecyclePayloadHash: row.latest_lifecycle_payload_hash ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export class PostgresSourceToAwardRepository implements SourceToAwardRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(sourceCase: SourceToAwardCase): Promise<SourceToAwardCase> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      `
        INSERT INTO source_to_award_cases (
          case_id,
          buyer_organization_id,
          status,
          requisition,
          rfq,
          quotations,
          award,
          generated_order_id,
          lifecycle_event_ids,
          latest_lifecycle_payload_hash,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::text[], $10, $11, $12)
        ON CONFLICT (case_id)
        DO UPDATE SET
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          status = EXCLUDED.status,
          requisition = EXCLUDED.requisition,
          rfq = EXCLUDED.rfq,
          quotations = EXCLUDED.quotations,
          award = EXCLUDED.award,
          generated_order_id = EXCLUDED.generated_order_id,
          lifecycle_event_ids = EXCLUDED.lifecycle_event_ids,
          latest_lifecycle_payload_hash = EXCLUDED.latest_lifecycle_payload_hash,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [
        sourceCase.caseId,
        sourceCase.buyerOrganizationId,
        sourceCase.status,
        JSON.stringify(sourceCase.requisition),
        sourceCase.rfq ? JSON.stringify(sourceCase.rfq) : null,
        JSON.stringify(sourceCase.quotations),
        sourceCase.award ? JSON.stringify(sourceCase.award) : null,
        sourceCase.generatedOrderId ?? null,
        sourceCase.lifecycleEventIds,
        sourceCase.latestLifecyclePayloadHash ?? null,
        sourceCase.createdAt,
        sourceCase.updatedAt,
      ],
    );

    return toSourceToAwardCase(result.rows[0]);
  }

  async findByCaseId(caseId: string): Promise<SourceToAwardCase | null> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      'SELECT * FROM source_to_award_cases WHERE case_id = $1',
      [caseId],
    );

    return result.rows[0] ? toSourceToAwardCase(result.rows[0]) : null;
  }

  async findByRequisitionId(requisitionId: string): Promise<SourceToAwardCase | null> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      "SELECT * FROM source_to_award_cases WHERE requisition->>'requisitionId' = $1",
      [requisitionId],
    );

    return result.rows[0] ? toSourceToAwardCase(result.rows[0]) : null;
  }

  async findByRfqId(rfqId: string): Promise<SourceToAwardCase | null> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      "SELECT * FROM source_to_award_cases WHERE rfq->>'rfqId' = $1",
      [rfqId],
    );

    return result.rows[0] ? toSourceToAwardCase(result.rows[0]) : null;
  }

  async listByBuyerOrganization(buyerOrganizationId: string): Promise<SourceToAwardCase[]> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      `
        SELECT *
        FROM source_to_award_cases
        WHERE buyer_organization_id = $1
        ORDER BY updated_at DESC, case_id DESC
      `,
      [buyerOrganizationId],
    );

    return result.rows.map(row => toSourceToAwardCase(row));
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<SourceToAwardCase[]> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      `
        SELECT *
        FROM source_to_award_cases
        WHERE rfq IS NOT NULL
          AND rfq->'supplierOrganizationIds' ? $1
        ORDER BY updated_at DESC, case_id DESC
      `,
      [supplierOrganizationId],
    );

    return result.rows.map(row => toSourceToAwardCase(row));
  }

  async listAll(): Promise<SourceToAwardCase[]> {
    const result = await this.db.query<SourceToAwardCaseRow>(
      'SELECT * FROM source_to_award_cases ORDER BY updated_at DESC, case_id DESC',
    );

    return result.rows.map(row => toSourceToAwardCase(row));
  }
}
