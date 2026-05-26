import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import type { ProcurementOrder, ProcurementOrderStatus } from '../domain/procurement-order.js';

type ProcurementOrderRow = {
  order_id: string;
  buyer_organization_id: string;
  supplier_organization_id: string;
  title: string;
  description: string | null;
  amount: string;
  currency: string;
  status: ProcurementOrderStatus;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  accepted_by: string | null;
  accepted_at: Date | string | null;
  rejected_by: string | null;
  rejected_at: Date | string | null;
  lifecycle_event_ids: unknown;
  latest_lifecycle_payload_hash: string | null;
};

function toProcurementOrder(row: ProcurementOrderRow): ProcurementOrder {
  return {
    orderId: row.order_id,
    buyerOrganizationId: row.buyer_organization_id,
    supplierOrganizationId: row.supplier_organization_id,
    title: row.title,
    description: row.description ?? undefined,
    amount: row.amount,
    currency: row.currency,
    status: row.status,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    acceptedBy: row.accepted_by ?? undefined,
    acceptedAt: toOptionalIsoString(row.accepted_at),
    rejectedBy: row.rejected_by ?? undefined,
    rejectedAt: toOptionalIsoString(row.rejected_at),
    lifecycleEventIds: toStringArray(row.lifecycle_event_ids),
    latestLifecyclePayloadHash: row.latest_lifecycle_payload_hash ?? undefined,
  };
}

export class PostgresProcurementOrderRepository implements ProcurementOrderRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(order: ProcurementOrder): Promise<ProcurementOrder> {
    const result = await this.db.query<ProcurementOrderRow>(
      `
        INSERT INTO procurement_orders (
          order_id,
          buyer_organization_id,
          supplier_organization_id,
          title,
          description,
          amount,
          currency,
          status,
          created_by,
          created_at,
          updated_at,
          accepted_by,
          accepted_at,
          rejected_by,
          rejected_at,
          lifecycle_event_ids,
          latest_lifecycle_payload_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::text[], $17)
        ON CONFLICT (order_id)
        DO UPDATE SET
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          amount = EXCLUDED.amount,
          currency = EXCLUDED.currency,
          status = EXCLUDED.status,
          created_by = EXCLUDED.created_by,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          accepted_by = EXCLUDED.accepted_by,
          accepted_at = EXCLUDED.accepted_at,
          rejected_by = EXCLUDED.rejected_by,
          rejected_at = EXCLUDED.rejected_at,
          lifecycle_event_ids = EXCLUDED.lifecycle_event_ids,
          latest_lifecycle_payload_hash = EXCLUDED.latest_lifecycle_payload_hash
        RETURNING *
      `,
      [
        order.orderId,
        order.buyerOrganizationId,
        order.supplierOrganizationId,
        order.title,
        order.description ?? null,
        order.amount,
        order.currency,
        order.status,
        order.createdBy,
        order.createdAt,
        order.updatedAt,
        order.acceptedBy ?? null,
        order.acceptedAt ?? null,
        order.rejectedBy ?? null,
        order.rejectedAt ?? null,
        order.lifecycleEventIds,
        order.latestLifecyclePayloadHash ?? null,
      ],
    );

    return toProcurementOrder(result.rows[0]);
  }

  async findById(orderId: string): Promise<ProcurementOrder | null> {
    const result = await this.db.query<ProcurementOrderRow>(
      'SELECT * FROM procurement_orders WHERE order_id = $1',
      [orderId],
    );

    return result.rows[0] ? toProcurementOrder(result.rows[0]) : null;
  }

  async listByBuyerOrganization(buyerOrganizationId: string): Promise<ProcurementOrder[]> {
    const result = await this.db.query<ProcurementOrderRow>(
      `
        SELECT *
        FROM procurement_orders
        WHERE buyer_organization_id = $1
        ORDER BY updated_at DESC, order_id DESC
      `,
      [buyerOrganizationId],
    );

    return result.rows.map(row => toProcurementOrder(row));
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementOrder[]> {
    const result = await this.db.query<ProcurementOrderRow>(
      `
        SELECT *
        FROM procurement_orders
        WHERE supplier_organization_id = $1
        ORDER BY updated_at DESC, order_id DESC
      `,
      [supplierOrganizationId],
    );

    return result.rows.map(row => toProcurementOrder(row));
  }

  async listAll(): Promise<ProcurementOrder[]> {
    const result = await this.db.query<ProcurementOrderRow>(
      'SELECT * FROM procurement_orders ORDER BY updated_at DESC, order_id DESC',
    );

    return result.rows.map(row => toProcurementOrder(row));
  }
}
