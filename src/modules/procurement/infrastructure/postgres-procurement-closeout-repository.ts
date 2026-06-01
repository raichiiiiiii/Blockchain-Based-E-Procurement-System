import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ProcurementCloseoutRepository } from '../application/procurement-closeout-repository.js';
import type {
  ProcurementCaseCloseout,
  ProcurementCloseoutStatus,
  SupplierPerformanceSummary,
} from '../domain/procurement-closeout.js';

type ProcurementCaseCloseoutRow = {
  closeout_id: string;
  case_id: string;
  order_id: string;
  buyer_organization_id: string;
  supplier_organization_id: string;
  closed_by_user_id: string;
  closed_at: Date | string;
  status: ProcurementCloseoutStatus;
  notes: string | null;
  metrics: unknown;
};

function toMetrics(value: unknown): SupplierPerformanceSummary {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid procurement closeout metrics from database');
  }

  return value as SupplierPerformanceSummary;
}

function toProcurementCaseCloseout(row: ProcurementCaseCloseoutRow): ProcurementCaseCloseout {
  return {
    closeoutId: row.closeout_id,
    caseId: row.case_id,
    orderId: row.order_id,
    buyerOrganizationId: row.buyer_organization_id,
    supplierOrganizationId: row.supplier_organization_id,
    closedByUserId: row.closed_by_user_id,
    closedAt: toIsoString(row.closed_at),
    status: row.status,
    notes: row.notes ?? undefined,
    metrics: toMetrics(row.metrics),
  };
}

export class PostgresProcurementCloseoutRepository implements ProcurementCloseoutRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(closeout: ProcurementCaseCloseout): Promise<ProcurementCaseCloseout> {
    const result = await this.db.query<ProcurementCaseCloseoutRow>(
      `
        INSERT INTO procurement_case_closeouts (
          closeout_id,
          case_id,
          order_id,
          buyer_organization_id,
          supplier_organization_id,
          closed_by_user_id,
          closed_at,
          status,
          notes,
          metrics
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
        ON CONFLICT (closeout_id)
        DO UPDATE SET
          case_id = EXCLUDED.case_id,
          order_id = EXCLUDED.order_id,
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          closed_by_user_id = EXCLUDED.closed_by_user_id,
          closed_at = EXCLUDED.closed_at,
          status = EXCLUDED.status,
          notes = EXCLUDED.notes,
          metrics = EXCLUDED.metrics
        RETURNING *
      `,
      [
        closeout.closeoutId,
        closeout.caseId,
        closeout.orderId,
        closeout.buyerOrganizationId,
        closeout.supplierOrganizationId,
        closeout.closedByUserId,
        closeout.closedAt,
        closeout.status,
        closeout.notes ?? null,
        JSON.stringify(closeout.metrics),
      ],
    );

    return toProcurementCaseCloseout(result.rows[0]);
  }

  async findByCaseId(caseId: string): Promise<ProcurementCaseCloseout | null> {
    const result = await this.db.query<ProcurementCaseCloseoutRow>(
      'SELECT * FROM procurement_case_closeouts WHERE case_id = $1',
      [caseId],
    );

    return result.rows[0] ? toProcurementCaseCloseout(result.rows[0]) : null;
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementCaseCloseout[]> {
    const result = await this.db.query<ProcurementCaseCloseoutRow>(
      `
        SELECT *
        FROM procurement_case_closeouts
        WHERE supplier_organization_id = $1
        ORDER BY closed_at DESC, closeout_id DESC
      `,
      [supplierOrganizationId],
    );

    return result.rows.map(row => toProcurementCaseCloseout(row));
  }

  async listAll(): Promise<ProcurementCaseCloseout[]> {
    const result = await this.db.query<ProcurementCaseCloseoutRow>(
      'SELECT * FROM procurement_case_closeouts ORDER BY closed_at DESC, closeout_id DESC',
    );

    return result.rows.map(row => toProcurementCaseCloseout(row));
  }
}
