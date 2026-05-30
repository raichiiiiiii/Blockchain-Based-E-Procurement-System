import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type {
  ExternalIdempotencyRecord,
  ExternalIdempotencyRepository,
} from '../application/external-idempotency-repository.js';

type ExternalIdempotencyRow = {
  client_id: string;
  route: string;
  idempotency_key: string;
  request_id: string;
  created_at: string | Date;
};

function toExternalIdempotencyRecord(row: ExternalIdempotencyRow): ExternalIdempotencyRecord {
  return {
    clientId: row.client_id,
    route: row.route,
    idempotencyKey: row.idempotency_key,
    requestId: row.request_id,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

export class PostgresExternalIdempotencyRepository implements ExternalIdempotencyRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async find(input: {
    clientId: string;
    route: string;
    idempotencyKey: string;
  }): Promise<ExternalIdempotencyRecord | null> {
    const result = await this.db.query<ExternalIdempotencyRow>(
      `
        SELECT client_id, route, idempotency_key, request_id, created_at
        FROM external_idempotency_records
        WHERE client_id = $1
          AND route = $2
          AND idempotency_key = $3
      `,
      [input.clientId, input.route, input.idempotencyKey],
    );

    return result.rows[0] ? toExternalIdempotencyRecord(result.rows[0]) : null;
  }

  async save(record: ExternalIdempotencyRecord): Promise<void> {
    await this.db.query(
      `
        INSERT INTO external_idempotency_records (
          client_id,
          route,
          idempotency_key,
          request_id,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (client_id, route, idempotency_key)
        DO NOTHING
      `,
      [
        record.clientId,
        record.route,
        record.idempotencyKey,
        record.requestId,
        record.createdAt,
      ],
    );
  }
}
