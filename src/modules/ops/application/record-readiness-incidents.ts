import type { OperationalIncidentRepository } from './operational-incident-repository.js';
import type { RuntimeReadiness } from './runtime-readiness.js';

export async function recordReadinessIncidents(
  readiness: RuntimeReadiness,
  repository: OperationalIncidentRepository,
  occurredAt = new Date().toISOString(),
): Promise<void> {
  if (!readiness.checks.database.reachable) {
    await repository.save({
      incidentId: `ops-incident-database-${readiness.checks.database.mode}`,
      severity: 'critical',
      source: 'database',
      message: `Database readiness check failed for ${readiness.checks.database.mode} mode.`,
      status: 'open',
      occurredAt,
    });
  } else {
    await repository.resolveOpenBySource('database', occurredAt);
  }

  if (readiness.checks.fabric.mode === 'unavailable') {
    await repository.save({
      incidentId: 'ops-incident-fabric-unavailable',
      severity: 'warning',
      source: 'fabric',
      message: 'Fabric proof adapter is unavailable for the current runtime readiness check.',
      status: 'open',
      occurredAt,
    });
  } else {
    await repository.resolveOpenBySource('fabric', occurredAt);
  }
}
