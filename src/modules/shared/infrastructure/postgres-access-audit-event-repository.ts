import type { AccessAuditEventRepository } from '../application/access-audit-event-repository.js';
import type {
  AccessAuditActorSource,
  AccessAuditCanonicalization,
  AccessAuditEvent,
  AccessAuditModule,
  AccessAuditOutcome,
} from '../application/access-audit-event.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString } from '../../../infrastructure/database/postgres-row-utils.js';

type AccessAuditEventRow = {
  event_id: string;
  schema_version: 'access-audit-event.v1';
  occurred_at: Date | string;
  request_id: string;
  actor_user_id: string;
  actor_source: AccessAuditActorSource;
  action: string;
  target_type: string;
  target_id: string;
  outcome: AccessAuditOutcome;
  reason: string | null;
  route: string | null;
  method: string | null;
  module: AccessAuditModule;
  evidence_payload_hash: string;
  evidence_canonicalization: AccessAuditCanonicalization;
  evidence_previous_event_hash: string | null;
};

function toAccessAuditEvent(row: AccessAuditEventRow): AccessAuditEvent {
  return {
    eventId: row.event_id,
    schemaVersion: row.schema_version,
    occurredAt: toIsoString(row.occurred_at),
    requestId: row.request_id,
    actorUserId: row.actor_user_id,
    actorSource: row.actor_source,
    action: row.action,
    targetType: row.target_type,
    targetId: row.target_id,
    outcome: row.outcome,
    reason: row.reason ?? undefined,
    route: row.route ?? undefined,
    method: row.method ?? undefined,
    module: row.module,
    evidence: {
      payloadHash: row.evidence_payload_hash,
      canonicalization: row.evidence_canonicalization,
      previousEventHash: toOptionalIsoString(row.evidence_previous_event_hash),
    },
  };
}

export class PostgresAccessAuditEventRepository implements AccessAuditEventRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(event: AccessAuditEvent): Promise<AccessAuditEvent> {
    const result = await this.db.query<AccessAuditEventRow>(
      `
        INSERT INTO access_audit_events (
          event_id,
          schema_version,
          occurred_at,
          request_id,
          actor_user_id,
          actor_source,
          action,
          target_type,
          target_id,
          outcome,
          reason,
          route,
          method,
          module,
          evidence_payload_hash,
          evidence_canonicalization,
          evidence_previous_event_hash
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `,
      [
        event.eventId,
        event.schemaVersion,
        event.occurredAt,
        event.requestId,
        event.actorUserId,
        event.actorSource,
        event.action,
        event.targetType,
        event.targetId,
        event.outcome,
        event.reason ?? null,
        event.route ?? null,
        event.method ?? null,
        event.module,
        event.evidence.payloadHash,
        event.evidence.canonicalization,
        event.evidence.previousEventHash ?? null,
      ],
    );

    return toAccessAuditEvent(result.rows[0]);
  }

  async list(): Promise<AccessAuditEvent[]> {
    const result = await this.db.query<AccessAuditEventRow>(
      'SELECT * FROM access_audit_events ORDER BY occurred_at, event_id',
    );

    return result.rows.map(row => toAccessAuditEvent(row));
  }
}
