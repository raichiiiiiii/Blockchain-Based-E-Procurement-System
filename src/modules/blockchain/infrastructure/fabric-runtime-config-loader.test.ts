import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBlockchainAnchorReadiness,
  loadBlockchainAnchorRuntimeConfig,
} from '../application/blockchain-anchor-runtime-config.js';

describe('blockchain anchor runtime config loader', () => {
  it('defaults to in-memory mode for fast local tests', () => {
    const config = loadBlockchainAnchorRuntimeConfig({});
    const readiness = buildBlockchainAnchorReadiness(config);

    assert.strictEqual(config.adapter, 'in-memory');
    assert.strictEqual(config.valid, true);
    assert.strictEqual(readiness.mode, 'local');
    assert.strictEqual(readiness.proofAdapter, 'in-memory');
    assert.strictEqual(readiness.available, true);
    assert.strictEqual(readiness.simulated, true);
  });

  it('parses explicit disabled mode without requiring Fabric configuration', () => {
    const config = loadBlockchainAnchorRuntimeConfig({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'disabled',
    });
    const readiness = buildBlockchainAnchorReadiness(config);

    assert.strictEqual(config.adapter, 'disabled');
    assert.strictEqual(config.valid, true);
    assert.deepStrictEqual(config.missingFabricEnv, []);
    assert.strictEqual(readiness.mode, 'disabled');
    assert.strictEqual(readiness.reason, 'blockchain_anchor_disabled');
  });

  it('reports missing Fabric configuration for fabric-local mode', () => {
    const config = loadBlockchainAnchorRuntimeConfig({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric-local',
      FABRIC_CHANNEL_NAME: 'procurement-proof-channel',
    });
    const readiness = buildBlockchainAnchorReadiness(config);

    assert.strictEqual(config.adapter, 'fabric-local');
    assert.strictEqual(config.valid, false);
    assert.deepStrictEqual(config.missingFabricEnv, [
      'FABRIC_CHAINCODE_NAME',
      'FABRIC_CONNECTION_PROFILE',
      'FABRIC_WALLET_PATH',
      'FABRIC_IDENTITY',
    ]);
    assert.strictEqual(readiness.mode, 'unavailable');
    assert.strictEqual(readiness.reason, 'missing_fabric_runtime_configuration');
  });

  it('captures complete Fabric runtime configuration without marking it available by default', () => {
    const config = loadBlockchainAnchorRuntimeConfig({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric',
      FABRIC_CHANNEL_NAME: 'procurement-proof-channel',
      FABRIC_CHAINCODE_NAME: 'audit-anchor',
      FABRIC_CONNECTION_PROFILE: 'C:\\fabric-labs\\connection-profile.yaml',
      FABRIC_WALLET_PATH: 'C:\\fabric-labs\\wallets\\platform',
      FABRIC_IDENTITY: 'platform-admin',
    });
    const readiness = buildBlockchainAnchorReadiness(config, {
      available: false,
      reason: 'fabric_gateway_sdk_dependency_missing',
    });

    assert.strictEqual(config.adapter, 'fabric');
    assert.strictEqual(config.valid, true);
    assert.deepStrictEqual(config.missingFabricEnv, []);
    assert.strictEqual(readiness.mode, 'unavailable');
    assert.strictEqual(readiness.proofAdapter, 'fabric');
    assert.strictEqual(readiness.channelName, 'procurement-proof-channel');
    assert.strictEqual(readiness.chaincodeName, 'audit-anchor');
    assert.strictEqual(readiness.connectionProfileConfigured, true);
    assert.strictEqual(readiness.walletPathConfigured, true);
    assert.strictEqual(readiness.identityConfigured, true);
    assert.strictEqual(readiness.reason, 'fabric_gateway_sdk_dependency_missing');
  });
});
