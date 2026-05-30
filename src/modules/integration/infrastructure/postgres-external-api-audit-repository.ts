import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type {
  ExternalApiAuditEvent,
  ExternalApiAuditRepository,
} from '../application/external-api-audit-repository.js';

type ExternalApiAuditRow = {
  event_id: string;
  occurred_at: string | Date;
  client_id?: string | null;
  action: string;
  route: string;
  method: string;
  outcome: ExternalApiAuditEvent['outcome'];
  reason?: string | null;
  idempotency_key?: string | null;
};

function toExternalApiAuditEvent(row: ExternalApiAuditRow): ExternalApiAuditEvent {
  return {
    eventId: row.event_id,
    occurredAt: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : row.occurred_at,
    clientId: row.client_id ?? undefined,
    action: row.action,
    route: row.route,
    method: row.method,
    outcome: row.outcome,
    reason: row.reason ?? undefined,
    idempotencyKey: row.idempotency_key ?? undefined,
  };
}

export class PostgresExternalApiAuditRepository implements ExternalApiAuditRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(event: ExternalApiAuditEvent): Promise<void> {
    await this.db.query(
      `
        INSERT INTO external_api_audit_events (
          event_id,
          occurred_at,
          client_id,
          action,
          route,
          method,
          outcome,
          reason,
          idempotency_key
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        ON CONFLICT (event_id)
        DO NOTHING
      `,
      [
        event.eventId,
        event.occurredAt,
        event.clientId ?? null,
        event.action,
        event.route,
        event.method,
        event.outcome,
        event.reason ?? null,
        event.idempotencyKey ?? null,
      ],
    );
  }

  async list(): Promise<ExternalApiAuditEvent[]> {
    const result = await this.db.query<ExternalApiAuditRow>(
      `
        SELECT
          event_id,
          occurred_at,
          client_id,
          action,
          route,
          method,
          outcome,
          reason,
          idempotency_key
        FROM external_api_audit_events
        ORDER BY occurred_at ASC, event_id ASC
      `,
    );

    return result.rows.map(toExternalApiAuditEvent);
  }
}
