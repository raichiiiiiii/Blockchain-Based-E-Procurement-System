import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString } from '../../../infrastructure/database/postgres-row-utils.js';
import type { DeliveryEvidenceRepository } from '../application/delivery-evidence-repository.js';
import type {
  DeliveryEvidenceRecord,
  DeliveryEvidenceType,
  DeliveryEvidenceVerificationStatus,
  DeliveryEvidenceAnchorStatus,
  DeliveryEvidenceBlockchainNetwork,
} from '../domain/delivery-evidence.js';

type DeliveryEvidenceRow = {
  evidence_id: string;
  order_id: string;
  buyer_organization_id: string;
  supplier_organization_id: string;
  submitted_by_user_id: string;
  evidence_type: DeliveryEvidenceType;
  evidence_reference: string | null;
  evidence_hash: string;
  notes: string | null;
  submitted_at: Date | string;
  verification_status: DeliveryEvidenceVerificationStatus;
  lifecycle_event_id: string | null;
  lifecycle_event_hash: string | null;
  blockchain_event_id: string | null;
  blockchain_payload_hash: string | null;
  blockchain_anchor_status: DeliveryEvidenceAnchorStatus | null;
  blockchain_network: DeliveryEvidenceBlockchainNetwork | null;
  blockchain_transaction_id: string | null;
  blockchain_block_number: string | null;
  blockchain_channel_name: string | null;
  blockchain_chaincode_name: string | null;
  blockchain_anchored_at: Date | string | null;
  blockchain_failure_reason: string | null;
};

function toDeliveryEvidenceRecord(row: DeliveryEvidenceRow): DeliveryEvidenceRecord {
  return {
    evidenceId: row.evidence_id,
    orderId: row.order_id,
    buyerOrganizationId: row.buyer_organization_id,
    supplierOrganizationId: row.supplier_organization_id,
    submittedByUserId: row.submitted_by_user_id,
    evidenceType: row.evidence_type,
    evidenceReference: row.evidence_reference ?? undefined,
    evidenceHash: row.evidence_hash,
    notes: row.notes ?? undefined,
    submittedAt: toIsoString(row.submitted_at),
    verificationStatus: row.verification_status,
    lifecycleEventId: row.lifecycle_event_id ?? undefined,
    lifecycleEventHash: row.lifecycle_event_hash ?? undefined,
    blockchainAnchor: row.blockchain_anchor_status ? {
      eventId: row.blockchain_event_id ?? undefined,
      payloadHash: row.blockchain_payload_hash ?? undefined,
      anchorStatus: row.blockchain_anchor_status,
      blockchainNetwork: row.blockchain_network ?? undefined,
      transactionId: row.blockchain_transaction_id ?? undefined,
      blockNumber: row.blockchain_block_number ?? undefined,
      channelName: row.blockchain_channel_name ?? undefined,
      chaincodeName: row.blockchain_chaincode_name ?? undefined,
      anchoredAt: toOptionalIsoString(row.blockchain_anchored_at),
      failureReason: row.blockchain_failure_reason ?? undefined,
    } : undefined,
  };
}

export class PostgresDeliveryEvidenceRepository implements DeliveryEvidenceRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(record: DeliveryEvidenceRecord): Promise<DeliveryEvidenceRecord> {
    const result = await this.db.query<DeliveryEvidenceRow>(
      `
        INSERT INTO delivery_evidence (
          evidence_id,
          order_id,
          buyer_organization_id,
          supplier_organization_id,
          submitted_by_user_id,
          evidence_type,
          evidence_reference,
          evidence_hash,
          notes,
          submitted_at,
          verification_status,
          lifecycle_event_id,
          lifecycle_event_hash,
          blockchain_event_id,
          blockchain_payload_hash,
          blockchain_anchor_status,
          blockchain_network,
          blockchain_transaction_id,
          blockchain_block_number,
          blockchain_channel_name,
          blockchain_chaincode_name,
          blockchain_anchored_at,
          blockchain_failure_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
        ON CONFLICT (evidence_id)
        DO UPDATE SET
          order_id = EXCLUDED.order_id,
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          submitted_by_user_id = EXCLUDED.submitted_by_user_id,
          evidence_type = EXCLUDED.evidence_type,
          evidence_reference = EXCLUDED.evidence_reference,
          evidence_hash = EXCLUDED.evidence_hash,
          notes = EXCLUDED.notes,
          submitted_at = EXCLUDED.submitted_at,
          verification_status = EXCLUDED.verification_status,
          lifecycle_event_id = EXCLUDED.lifecycle_event_id,
          lifecycle_event_hash = EXCLUDED.lifecycle_event_hash,
          blockchain_event_id = EXCLUDED.blockchain_event_id,
          blockchain_payload_hash = EXCLUDED.blockchain_payload_hash,
          blockchain_anchor_status = EXCLUDED.blockchain_anchor_status,
          blockchain_network = EXCLUDED.blockchain_network,
          blockchain_transaction_id = EXCLUDED.blockchain_transaction_id,
          blockchain_block_number = EXCLUDED.blockchain_block_number,
          blockchain_channel_name = EXCLUDED.blockchain_channel_name,
          blockchain_chaincode_name = EXCLUDED.blockchain_chaincode_name,
          blockchain_anchored_at = EXCLUDED.blockchain_anchored_at,
          blockchain_failure_reason = EXCLUDED.blockchain_failure_reason
        RETURNING *
      `,
      [
        record.evidenceId,
        record.orderId,
        record.buyerOrganizationId,
        record.supplierOrganizationId,
        record.submittedByUserId,
        record.evidenceType,
        record.evidenceReference ?? null,
        record.evidenceHash,
        record.notes ?? null,
        record.submittedAt,
        record.verificationStatus,
        record.lifecycleEventId ?? null,
        record.lifecycleEventHash ?? null,
        record.blockchainAnchor?.eventId ?? null,
        record.blockchainAnchor?.payloadHash ?? null,
        record.blockchainAnchor?.anchorStatus ?? null,
        record.blockchainAnchor?.blockchainNetwork ?? null,
        record.blockchainAnchor?.transactionId ?? null,
        record.blockchainAnchor?.blockNumber ?? null,
        record.blockchainAnchor?.channelName ?? null,
        record.blockchainAnchor?.chaincodeName ?? null,
        record.blockchainAnchor?.anchoredAt ?? null,
        record.blockchainAnchor?.failureReason ?? null,
      ],
    );

    return toDeliveryEvidenceRecord(result.rows[0]);
  }

  async findById(evidenceId: string): Promise<DeliveryEvidenceRecord | null> {
    const result = await this.db.query<DeliveryEvidenceRow>(
      'SELECT * FROM delivery_evidence WHERE evidence_id = $1',
      [evidenceId],
    );

    return result.rows[0] ? toDeliveryEvidenceRecord(result.rows[0]) : null;
  }

  async listByOrderId(orderId: string): Promise<DeliveryEvidenceRecord[]> {
    const result = await this.db.query<DeliveryEvidenceRow>(
      `
        SELECT *
        FROM delivery_evidence
        WHERE order_id = $1
        ORDER BY submitted_at, evidence_id
      `,
      [orderId],
    );

    return result.rows.map(row => toDeliveryEvidenceRecord(row));
  }
}
