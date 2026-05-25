import type {
  BlockchainAnchorMetadata,
  BlockchainAnchorMetadataRepository,
  BlockchainAnchorStatus,
  BlockchainNetwork,
} from '../application/blockchain-anchor-metadata-repository.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString } from '../../../infrastructure/database/postgres-row-utils.js';

type BlockchainAnchorMetadataRow = {
  event_id: string;
  payload_hash: string;
  case_id_hash: string | null;
  anchor_status: BlockchainAnchorStatus;
  blockchain_network: BlockchainNetwork | null;
  channel_name: string | null;
  chaincode_name: string | null;
  transaction_id: string | null;
  block_number: string | null;
  anchored_at: Date | string | null;
  failure_reason: string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

function toAnchorMetadata(row: BlockchainAnchorMetadataRow): BlockchainAnchorMetadata {
  return {
    eventId: row.event_id,
    payloadHash: row.payload_hash,
    caseIdHash: row.case_id_hash ?? undefined,
    anchorStatus: row.anchor_status,
    blockchainNetwork: row.blockchain_network ?? undefined,
    channelName: row.channel_name ?? undefined,
    chaincodeName: row.chaincode_name ?? undefined,
    transactionId: row.transaction_id ?? undefined,
    blockNumber: row.block_number ?? undefined,
    anchoredAt: toOptionalIsoString(row.anchored_at),
    failureReason: row.failure_reason ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

export class PostgresBlockchainAnchorMetadataRepository
  implements BlockchainAnchorMetadataRepository
{
  constructor(private readonly db: PostgresExecutor) {}

  async save(metadata: BlockchainAnchorMetadata): Promise<BlockchainAnchorMetadata> {
    const result = await this.db.query<BlockchainAnchorMetadataRow>(
      `
        INSERT INTO blockchain_anchor_metadata (
          event_id,
          payload_hash,
          case_id_hash,
          anchor_status,
          blockchain_network,
          channel_name,
          chaincode_name,
          transaction_id,
          block_number,
          anchored_at,
          failure_reason,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (event_id)
        DO UPDATE SET
          payload_hash = EXCLUDED.payload_hash,
          case_id_hash = EXCLUDED.case_id_hash,
          anchor_status = EXCLUDED.anchor_status,
          blockchain_network = EXCLUDED.blockchain_network,
          channel_name = EXCLUDED.channel_name,
          chaincode_name = EXCLUDED.chaincode_name,
          transaction_id = EXCLUDED.transaction_id,
          block_number = EXCLUDED.block_number,
          anchored_at = EXCLUDED.anchored_at,
          failure_reason = EXCLUDED.failure_reason,
          updated_at = EXCLUDED.updated_at
        RETURNING *
      `,
      [
        metadata.eventId,
        metadata.payloadHash,
        metadata.caseIdHash ?? null,
        metadata.anchorStatus,
        metadata.blockchainNetwork ?? null,
        metadata.channelName ?? null,
        metadata.chaincodeName ?? null,
        metadata.transactionId ?? null,
        metadata.blockNumber ?? null,
        metadata.anchoredAt ?? null,
        metadata.failureReason ?? null,
        metadata.createdAt,
        metadata.updatedAt,
      ],
    );

    return toAnchorMetadata(result.rows[0]);
  }

  async findByEventId(eventId: string): Promise<BlockchainAnchorMetadata | null> {
    const result = await this.db.query<BlockchainAnchorMetadataRow>(
      'SELECT * FROM blockchain_anchor_metadata WHERE event_id = $1',
      [eventId],
    );

    return result.rows[0] ? toAnchorMetadata(result.rows[0]) : null;
  }

  async listByCaseIdHash(caseIdHash: string): Promise<BlockchainAnchorMetadata[]> {
    const result = await this.db.query<BlockchainAnchorMetadataRow>(
      'SELECT * FROM blockchain_anchor_metadata WHERE case_id_hash = $1 ORDER BY created_at, event_id',
      [caseIdHash],
    );

    return result.rows.map(row => toAnchorMetadata(row));
  }
}
