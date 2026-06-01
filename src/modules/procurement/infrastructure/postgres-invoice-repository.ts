import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ProcurementInvoiceRepository } from '../application/invoice-repository.js';
import type { InvoiceMatchResult, InvoiceStatus, ProcurementInvoice } from '../domain/invoice.js';

type ProcurementInvoiceRow = {
  invoice_id: string;
  order_id: string;
  delivery_evidence_id: string | null;
  supplier_organization_id: string;
  buyer_organization_id: string;
  submitted_by_user_id: string;
  amount: string;
  tax: string | null;
  currency: string;
  invoice_reference: string | null;
  invoice_hash: string;
  status: InvoiceStatus;
  match_result: unknown;
  submitted_at: Date | string;
  updated_at: Date | string;
  payment_approved_by_user_id: string | null;
  payment_approved_at: Date | string | null;
  lifecycle_event_ids: unknown;
  latest_lifecycle_payload_hash: string | null;
};

function toMatchResult(value: unknown): InvoiceMatchResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { status: 'notChecked', issues: [] };
  }

  return value as InvoiceMatchResult;
}

function toProcurementInvoice(row: ProcurementInvoiceRow): ProcurementInvoice {
  return {
    invoiceId: row.invoice_id,
    orderId: row.order_id,
    deliveryEvidenceId: row.delivery_evidence_id ?? undefined,
    supplierOrganizationId: row.supplier_organization_id,
    buyerOrganizationId: row.buyer_organization_id,
    submittedByUserId: row.submitted_by_user_id,
    amount: row.amount,
    tax: row.tax ?? undefined,
    currency: row.currency,
    invoiceReference: row.invoice_reference ?? undefined,
    invoiceHash: row.invoice_hash,
    status: row.status,
    matchResult: toMatchResult(row.match_result),
    submittedAt: toIsoString(row.submitted_at),
    updatedAt: toIsoString(row.updated_at),
    paymentApprovedByUserId: row.payment_approved_by_user_id ?? undefined,
    paymentApprovedAt: toOptionalIsoString(row.payment_approved_at),
    lifecycleEventIds: toStringArray(row.lifecycle_event_ids),
    latestLifecyclePayloadHash: row.latest_lifecycle_payload_hash ?? undefined,
  };
}

export class PostgresProcurementInvoiceRepository implements ProcurementInvoiceRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(invoice: ProcurementInvoice): Promise<ProcurementInvoice> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      `
        INSERT INTO procurement_invoices (
          invoice_id,
          order_id,
          delivery_evidence_id,
          supplier_organization_id,
          buyer_organization_id,
          submitted_by_user_id,
          amount,
          tax,
          currency,
          invoice_reference,
          invoice_hash,
          status,
          match_result,
          submitted_at,
          updated_at,
          payment_approved_by_user_id,
          payment_approved_at,
          lifecycle_event_ids,
          latest_lifecycle_payload_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17, $18::text[], $19)
        ON CONFLICT (invoice_id)
        DO UPDATE SET
          order_id = EXCLUDED.order_id,
          delivery_evidence_id = EXCLUDED.delivery_evidence_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          submitted_by_user_id = EXCLUDED.submitted_by_user_id,
          amount = EXCLUDED.amount,
          tax = EXCLUDED.tax,
          currency = EXCLUDED.currency,
          invoice_reference = EXCLUDED.invoice_reference,
          invoice_hash = EXCLUDED.invoice_hash,
          status = EXCLUDED.status,
          match_result = EXCLUDED.match_result,
          submitted_at = EXCLUDED.submitted_at,
          updated_at = EXCLUDED.updated_at,
          payment_approved_by_user_id = EXCLUDED.payment_approved_by_user_id,
          payment_approved_at = EXCLUDED.payment_approved_at,
          lifecycle_event_ids = EXCLUDED.lifecycle_event_ids,
          latest_lifecycle_payload_hash = EXCLUDED.latest_lifecycle_payload_hash
        RETURNING *
      `,
      [
        invoice.invoiceId,
        invoice.orderId,
        invoice.deliveryEvidenceId ?? null,
        invoice.supplierOrganizationId,
        invoice.buyerOrganizationId,
        invoice.submittedByUserId,
        invoice.amount,
        invoice.tax ?? null,
        invoice.currency,
        invoice.invoiceReference ?? null,
        invoice.invoiceHash,
        invoice.status,
        JSON.stringify(invoice.matchResult),
        invoice.submittedAt,
        invoice.updatedAt,
        invoice.paymentApprovedByUserId ?? null,
        invoice.paymentApprovedAt ?? null,
        invoice.lifecycleEventIds,
        invoice.latestLifecyclePayloadHash ?? null,
      ],
    );

    return toProcurementInvoice(result.rows[0]);
  }

  async findById(invoiceId: string): Promise<ProcurementInvoice | null> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      'SELECT * FROM procurement_invoices WHERE invoice_id = $1',
      [invoiceId],
    );

    return result.rows[0] ? toProcurementInvoice(result.rows[0]) : null;
  }

  async findByInvoiceHash(invoiceHash: string): Promise<ProcurementInvoice | null> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      'SELECT * FROM procurement_invoices WHERE invoice_hash = $1',
      [invoiceHash],
    );

    return result.rows[0] ? toProcurementInvoice(result.rows[0]) : null;
  }

  async listByOrderId(orderId: string): Promise<ProcurementInvoice[]> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      `
        SELECT *
        FROM procurement_invoices
        WHERE order_id = $1
        ORDER BY submitted_at DESC, invoice_id DESC
      `,
      [orderId],
    );

    return result.rows.map(row => toProcurementInvoice(row));
  }

  async listByBuyerOrganization(buyerOrganizationId: string): Promise<ProcurementInvoice[]> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      `
        SELECT *
        FROM procurement_invoices
        WHERE buyer_organization_id = $1
        ORDER BY updated_at DESC, invoice_id DESC
      `,
      [buyerOrganizationId],
    );

    return result.rows.map(row => toProcurementInvoice(row));
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementInvoice[]> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      `
        SELECT *
        FROM procurement_invoices
        WHERE supplier_organization_id = $1
        ORDER BY updated_at DESC, invoice_id DESC
      `,
      [supplierOrganizationId],
    );

    return result.rows.map(row => toProcurementInvoice(row));
  }

  async listAll(): Promise<ProcurementInvoice[]> {
    const result = await this.db.query<ProcurementInvoiceRow>(
      'SELECT * FROM procurement_invoices ORDER BY updated_at DESC, invoice_id DESC',
    );

    return result.rows.map(row => toProcurementInvoice(row));
  }
}
