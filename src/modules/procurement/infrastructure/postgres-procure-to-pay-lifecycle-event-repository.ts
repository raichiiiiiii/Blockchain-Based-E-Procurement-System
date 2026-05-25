import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import type {
  ProcureToPayLifecycleEvent,
  ProcureToPayLifecycleOutcome,
  ProcureToPayLifecycleStage,
} from '../application/procure-to-pay-lifecycle-event.js';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString, toRecord } from '../../../infrastructure/database/postgres-row-utils.js';
import { ProcureToPayLifecyclePersistenceError } from './in-memory-procure-to-pay-lifecycle-event-repository.js';

type ProcureToPayLifecycleEventRow = {
  event_id: string;
  schema_version: 'procure-to-pay-lifecycle-event.v1';
  occurred_at: Date | string;
  recorded_at: Date | string;
  request_id: string;
  correlation_id: string;
  case_id: string;
  lifecycle_stage: ProcureToPayLifecycleStage;
  event_type: string;
  actor_user_id: string;
  actor_source: 'actorContext';
  target_type: string;
  target_id: string;
  outcome: ProcureToPayLifecycleOutcome;
  reason: string | null;
  payload_hash: string;
  canonicalization: 'json-stable-v1';
  previous_event_hash: string | null;
  source_payload_ref: string | null;
  source_record_ref: string | null;
  anchor_ref: string | null;
  metadata: unknown;
};

function toLifecycleEvent(row: ProcureToPayLifecycleEventRow): ProcureToPayLifecycleEvent {
  return {
    eventId: row.event_id,
    schemaVersion: row.schema_version,
    occurredAt: toIsoString(row.occurred_at),
    recordedAt: toIsoString(row.recorded_at),
    requestId: row.request_id,
    correlationId: row.correlation_id,
    caseId: row.case_id,
    lifecycleStage: row.lifecycle_stage,
    eventType: row.event_type,
    actorUserId: row.actor_user_id,
    actorSource: row.actor_source,
    targetType: row.target_type,
    targetId: row.target_id,
    outcome: row.outcome,
    reason: row.reason ?? undefined,
    immutableReference: {
      payloadHash: row.payload_hash,
      canonicalization: row.canonicalization,
      previousEventHash: toOptionalIsoString(row.previous_event_hash),
      sourcePayloadRef: row.source_payload_ref ?? undefined,
      sourceRecordRef: row.source_record_ref ?? undefined,
      anchorRef: row.anchor_ref ?? undefined,
    },
    metadata: toRecord(row.metadata),
  };
}

export class PostgresProcureToPayLifecycleEventRepository
  implements ProcureToPayLifecycleEventRepository
{
  constructor(private readonly db: PostgresExecutor) {}

  async save(event: ProcureToPayLifecycleEvent): Promise<ProcureToPayLifecycleEvent> {
    await this.assertLifecycleConstraints(event);

    const result = await this.db.query<ProcureToPayLifecycleEventRow>(
      `
        INSERT INTO procure_to_pay_lifecycle_events (
          event_id,
          schema_version,
          occurred_at,
          recorded_at,
          request_id,
          correlation_id,
          case_id,
          lifecycle_stage,
          event_type,
          actor_user_id,
          actor_source,
          target_type,
          target_id,
          outcome,
          reason,
          payload_hash,
          canonicalization,
          previous_event_hash,
          source_payload_ref,
          source_record_ref,
          anchor_ref,
          metadata
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22::jsonb)
        RETURNING *
      `,
      [
        event.eventId,
        event.schemaVersion,
        event.occurredAt,
        event.recordedAt,
        event.requestId,
        event.correlationId,
        event.caseId,
        event.lifecycleStage,
        event.eventType,
        event.actorUserId,
        event.actorSource,
        event.targetType,
        event.targetId,
        event.outcome,
        event.reason ?? null,
        event.immutableReference.payloadHash,
        event.immutableReference.canonicalization,
        event.immutableReference.previousEventHash ?? null,
        event.immutableReference.sourcePayloadRef ?? null,
        event.immutableReference.sourceRecordRef ?? null,
        event.immutableReference.anchorRef ?? null,
        event.metadata ? JSON.stringify(event.metadata) : null,
      ],
    );

    return toLifecycleEvent(result.rows[0]);
  }

  async list(): Promise<ProcureToPayLifecycleEvent[]> {
    const result = await this.db.query<ProcureToPayLifecycleEventRow>(
      'SELECT * FROM procure_to_pay_lifecycle_events ORDER BY occurred_at, event_id',
    );

    return result.rows.map(row => toLifecycleEvent(row));
  }

  private async assertLifecycleConstraints(event: ProcureToPayLifecycleEvent): Promise<void> {
    const duplicateEventId = await this.db.query(
      'SELECT 1 FROM procure_to_pay_lifecycle_events WHERE event_id = $1 LIMIT 1',
      [event.eventId],
    );
    if ((duplicateEventId.rowCount ?? 0) > 0) {
      throw new ProcureToPayLifecyclePersistenceError(
        'duplicateEventId',
        `Lifecycle event '${event.eventId}' already exists`,
      );
    }

    const duplicatePayloadHash = await this.db.query(
      'SELECT 1 FROM procure_to_pay_lifecycle_events WHERE payload_hash = $1 LIMIT 1',
      [event.immutableReference.payloadHash],
    );
    if ((duplicatePayloadHash.rowCount ?? 0) > 0) {
      throw new ProcureToPayLifecyclePersistenceError(
        'duplicatePayloadHash',
        `Lifecycle event payload hash '${event.immutableReference.payloadHash}' already exists`,
      );
    }

    const previousEventHash = event.immutableReference.previousEventHash;
    if (previousEventHash === undefined) {
      return;
    }

    const previousEvent = await this.db.query<Pick<ProcureToPayLifecycleEventRow, 'case_id' | 'correlation_id'>>(
      'SELECT case_id, correlation_id FROM procure_to_pay_lifecycle_events WHERE payload_hash = $1 LIMIT 1',
      [previousEventHash],
    );

    if (!previousEvent.rows[0]) {
      throw new ProcureToPayLifecyclePersistenceError(
        'previousEventHashNotFound',
        `Previous event hash '${previousEventHash}' was not found`,
      );
    }

    const sameCorrelation =
      previousEvent.rows[0].case_id === event.caseId &&
      previousEvent.rows[0].correlation_id === event.correlationId;

    if (!sameCorrelation) {
      throw new ProcureToPayLifecyclePersistenceError(
        'previousEventHashCorrelationMismatch',
        'Previous event hash belongs to a different caseId or correlationId',
      );
    }
  }
}
