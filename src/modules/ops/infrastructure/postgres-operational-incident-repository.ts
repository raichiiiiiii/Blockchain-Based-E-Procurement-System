import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString } from '../../../infrastructure/database/postgres-row-utils.js';
import type {
  OperationalIncident,
  OperationalIncidentSeverity,
  OperationalIncidentSource,
  OperationalIncidentStatus,
} from '../application/operational-incident.js';
import type { OperationalIncidentRepository } from '../application/operational-incident-repository.js';

type OperationalIncidentRow = {
  incident_id: string;
  severity: OperationalIncidentSeverity;
  source: OperationalIncidentSource;
  message: string;
  status: OperationalIncidentStatus;
  occurred_at: Date | string;
  resolved_at: Date | string | null;
};

function toOperationalIncident(row: OperationalIncidentRow): OperationalIncident {
  const incident: OperationalIncident = {
    incidentId: row.incident_id,
    severity: row.severity,
    source: row.source,
    message: row.message,
    status: row.status,
    occurredAt: toIsoString(row.occurred_at),
  };

  const resolvedAt = toOptionalIsoString(row.resolved_at);
  if (resolvedAt) {
    incident.resolvedAt = resolvedAt;
  }

  return incident;
}

export class PostgresOperationalIncidentRepository implements OperationalIncidentRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(incident: OperationalIncident): Promise<void> {
    await this.db.query(
      `
        INSERT INTO operational_incidents (
          incident_id,
          severity,
          source,
          message,
          status,
          occurred_at,
          resolved_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (incident_id)
        DO UPDATE SET
          severity = EXCLUDED.severity,
          source = EXCLUDED.source,
          message = EXCLUDED.message,
          status = EXCLUDED.status,
          occurred_at = EXCLUDED.occurred_at,
          resolved_at = EXCLUDED.resolved_at
      `,
      [
        incident.incidentId,
        incident.severity,
        incident.source,
        incident.message,
        incident.status,
        incident.occurredAt,
        incident.resolvedAt ?? null,
      ],
    );
  }

  async list(): Promise<OperationalIncident[]> {
    const result = await this.db.query<OperationalIncidentRow>(
      `
        SELECT *
        FROM operational_incidents
        ORDER BY occurred_at DESC, incident_id ASC
      `,
    );

    return result.rows.map(toOperationalIncident);
  }

  async resolveOpenBySource(source: OperationalIncidentSource, resolvedAt: string): Promise<void> {
    await this.db.query(
      `
        UPDATE operational_incidents
        SET status = 'resolved',
            resolved_at = $2
        WHERE source = $1
          AND status = 'open'
      `,
      [source, resolvedAt],
    );
  }
}
