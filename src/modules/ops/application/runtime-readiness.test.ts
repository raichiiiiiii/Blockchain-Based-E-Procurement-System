import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeReadiness } from './runtime-readiness.js';

describe('runtime readiness proof adapter reporting', () => {
  it('reports in-memory proof mode as ready when database is reachable', () => {
    const readiness = buildRuntimeReadiness({
      databaseMode: 'memory',
      databaseReachable: true,
      env: {
        BLOCKCHAIN_ANCHOR_ADAPTER: 'in-memory',
      },
    });

    assert.strictEqual(readiness.status, 'ready');
    assert.strictEqual(readiness.checks.fabric.mode, 'local');
    assert.strictEqual(readiness.checks.fabric.proofAdapter, 'in-memory');
    assert.strictEqual(readiness.checks.fabric.available, true);
    assert.strictEqual(readiness.checks.fabric.simulated, true);
  });

  it('reports disabled proof mode without marking the runtime degraded', () => {
    const readiness = buildRuntimeReadiness({
      databaseMode: 'postgres',
      databaseReachable: true,
      env: {
        BLOCKCHAIN_ANCHOR_ADAPTER: 'disabled',
      },
    });

    assert.strictEqual(readiness.status, 'ready');
    assert.strictEqual(readiness.checks.fabric.mode, 'disabled');
    assert.strictEqual(readiness.checks.fabric.proofAdapter, 'disabled');
    assert.strictEqual(readiness.checks.fabric.available, false);
    assert.strictEqual(readiness.checks.fabric.reason, 'blockchain_anchor_disabled');
  });

  it('reports fabric-local missing configuration as degraded and unavailable', () => {
    const readiness = buildRuntimeReadiness({
      databaseMode: 'postgres',
      databaseReachable: true,
      env: {
        BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric-local',
        FABRIC_CHANNEL_NAME: 'procurement-proof-channel',
      },
    });

    assert.strictEqual(readiness.status, 'degraded');
    assert.strictEqual(readiness.checks.fabric.mode, 'unavailable');
    assert.strictEqual(readiness.checks.fabric.proofAdapter, 'fabric-local');
    assert.strictEqual(readiness.checks.fabric.available, false);
    assert.strictEqual(readiness.checks.fabric.reason, 'missing_fabric_runtime_configuration');
    assert.deepStrictEqual(readiness.checks.fabric.missingConfiguration, [
      'FABRIC_CHAINCODE_NAME',
      'FABRIC_CONNECTION_PROFILE',
      'FABRIC_WALLET_PATH',
      'FABRIC_IDENTITY',
    ]);
  });
});
