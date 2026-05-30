import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryOperationalIncidentRepository } from '../infrastructure/in-memory-operational-incident-repository.js';
import { recordReadinessIncidents } from './record-readiness-incidents.js';
import type { RuntimeReadiness } from './runtime-readiness.js';

function readiness(databaseReachable: boolean): RuntimeReadiness {
  return {
    status: databaseReachable ? 'ready' : 'degraded',
    checks: {
      database: {
        mode: 'postgres',
        reachable: databaseReachable,
      },
      fabric: {
        mode: databaseReachable ? 'local' : 'unavailable',
        proofAdapter: databaseReachable ? 'in-memory' : 'fabric',
        configured: databaseReachable,
        available: databaseReachable,
        simulated: databaseReachable,
        reason: databaseReachable ? 'in_memory_anchor_gateway' : 'missing_fabric_runtime_configuration',
      },
      payment: {
        mode: 'notConfigured',
        configured: false,
      },
      demoSeed: {
        enabled: true,
      },
    },
  };
}

test('records operational incidents when readiness is degraded', async () => {
  const repository = new InMemoryOperationalIncidentRepository();

  await recordReadinessIncidents(readiness(false), repository, '2026-05-26T10:00:00.000Z');

  const incidents = await repository.list();
  assert.deepStrictEqual(
    incidents.map(incident => [incident.source, incident.status, incident.severity]).sort(),
    [
      ['database', 'open', 'critical'],
      ['fabric', 'open', 'warning'],
    ],
  );
});

test('resolves open readiness incidents after dependencies recover', async () => {
  const repository = new InMemoryOperationalIncidentRepository();

  await recordReadinessIncidents(readiness(false), repository, '2026-05-26T10:00:00.000Z');
  await recordReadinessIncidents(readiness(true), repository, '2026-05-26T10:05:00.000Z');

  const incidents = await repository.list();
  assert.ok(incidents.every(incident => incident.status === 'resolved'));
  assert.ok(incidents.every(incident => incident.resolvedAt === '2026-05-26T10:05:00.000Z'));
});
