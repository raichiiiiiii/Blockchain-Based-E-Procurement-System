import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString } from '../../../infrastructure/database/postgres-row-utils.js';
import type { EscrowRecord, EscrowStatus } from '../domain/escrow.js';
import type { BlockchainAnchorStatus, BlockchainNetwork } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import { activeEscrowStatuses } from '../domain/escrow.js';
import type { EscrowRepository } from '../application/escrow-repository.js';
import { EscrowPersistenceError } from './in-memory-escrow-repository.js';

type EscrowRow = {
  escrow_id: string;
  order_id: string;
  buyer_organization_id: string;
  supplier_organization_id: string;
  financier_organization_id: string | null;
  terms_hash: string;
  status: EscrowStatus;
  accepted_order_reference: string | null;
  created_by: string;
  created_at: Date | string;
  updated_at: Date | string;
  lifecycle_event_id: string | null;
  lifecycle_event_hash: string | null;
  blockchain_anchor_status: BlockchainAnchorStatus | null;
  blockchain_network: BlockchainNetwork | null;
  blockchain_transaction_id: string | null;
  blockchain_block_number: string | null;
  blockchain_channel_name: string | null;
  blockchain_chaincode_name: string | null;
  blockchain_anchored_at: Date | string | null;
  blockchain_failure_reason: string | null;
};

function toEscrowRecord(row: EscrowRow): EscrowRecord {
  return {
    escrowId: row.escrow_id,
    orderId: row.order_id,
    buyerOrganizationId: row.buyer_organization_id,
    supplierOrganizationId: row.supplier_organization_id,
    financierOrganizationId: row.financier_organization_id ?? undefined,
    termsHash: row.terms_hash,
    status: row.status,
    acceptedOrderReference: row.accepted_order_reference ?? undefined,
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    lifecycleEventId: row.lifecycle_event_id ?? undefined,
    lifecycleEventHash: row.lifecycle_event_hash ?? undefined,
    blockchainAnchor: row.blockchain_anchor_status ? {
      eventId: row.lifecycle_event_id ?? undefined,
      payloadHash: row.lifecycle_event_hash ?? undefined,
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

export class PostgresEscrowRepository implements EscrowRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async create(escrow: EscrowRecord): Promise<EscrowRecord> {
    const activeEscrow = await this.findActiveByOrderId(escrow.orderId);
    if (activeEscrow) {
      throw new EscrowPersistenceError(
        'duplicateActiveOrderEscrow',
        `Order '${escrow.orderId}' already has an active escrow`,
      );
    }

    try {
      const result = await this.db.query<EscrowRow>(
        `
          INSERT INTO escrows (
            escrow_id,
            order_id,
            buyer_organization_id,
            supplier_organization_id,
            financier_organization_id,
            terms_hash,
            status,
            accepted_order_reference,
            created_by,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          RETURNING *
        `,
        [
          escrow.escrowId,
          escrow.orderId,
          escrow.buyerOrganizationId,
          escrow.supplierOrganizationId,
          escrow.financierOrganizationId ?? null,
          escrow.termsHash,
          escrow.status,
          escrow.acceptedOrderReference ?? null,
          escrow.createdBy,
          escrow.createdAt,
          escrow.updatedAt,
        ],
      );

      return toEscrowRecord(result.rows[0]);
    } catch (error) {
      if (error instanceof Error && error.message.includes('duplicate key')) {
        throw new EscrowPersistenceError(
          'duplicateEscrowId',
          `Escrow '${escrow.escrowId}' already exists`,
        );
      }

      throw error;
    }
  }

  async update(escrow: EscrowRecord): Promise<EscrowRecord> {
    const result = await this.db.query<EscrowRow>(
      `
        UPDATE escrows
        SET
          order_id = $2,
          buyer_organization_id = $3,
          supplier_organization_id = $4,
          financier_organization_id = $5,
          terms_hash = $6,
          status = $7,
          accepted_order_reference = $8,
          created_by = $9,
          created_at = $10,
          updated_at = $11,
          lifecycle_event_id = $12,
          lifecycle_event_hash = $13,
          blockchain_anchor_status = $14,
          blockchain_network = $15,
          blockchain_transaction_id = $16,
          blockchain_block_number = $17,
          blockchain_channel_name = $18,
          blockchain_chaincode_name = $19,
          blockchain_anchored_at = $20,
          blockchain_failure_reason = $21
        WHERE escrow_id = $1
        RETURNING *
      `,
      [
        escrow.escrowId,
        escrow.orderId,
        escrow.buyerOrganizationId,
        escrow.supplierOrganizationId,
        escrow.financierOrganizationId ?? null,
        escrow.termsHash,
        escrow.status,
        escrow.acceptedOrderReference ?? null,
        escrow.createdBy,
        escrow.createdAt,
        escrow.updatedAt,
        escrow.lifecycleEventId ?? null,
        escrow.lifecycleEventHash ?? null,
        escrow.blockchainAnchor?.anchorStatus ?? null,
        escrow.blockchainAnchor?.blockchainNetwork ?? null,
        escrow.blockchainAnchor?.transactionId ?? null,
        escrow.blockchainAnchor?.blockNumber ?? null,
        escrow.blockchainAnchor?.channelName ?? null,
        escrow.blockchainAnchor?.chaincodeName ?? null,
        escrow.blockchainAnchor?.anchoredAt ?? null,
        escrow.blockchainAnchor?.failureReason ?? null,
      ],
    );

    if (!result.rows[0]) {
      throw new EscrowPersistenceError(
        'escrowNotFound',
        `Escrow '${escrow.escrowId}' was not found`,
      );
    }

    return toEscrowRecord(result.rows[0]);
  }

  async findById(escrowId: string): Promise<EscrowRecord | null> {
    const result = await this.db.query<EscrowRow>(
      'SELECT * FROM escrows WHERE escrow_id = $1',
      [escrowId],
    );

    return result.rows[0] ? toEscrowRecord(result.rows[0]) : null;
  }

  async findActiveByOrderId(orderId: string): Promise<EscrowRecord | null> {
    const result = await this.db.query<EscrowRow>(
      `
        SELECT *
        FROM escrows
        WHERE order_id = $1
          AND status = ANY($2::text[])
        ORDER BY created_at DESC, escrow_id DESC
        LIMIT 1
      `,
      [orderId, [...activeEscrowStatuses]],
    );

    return result.rows[0] ? toEscrowRecord(result.rows[0]) : null;
  }
}
