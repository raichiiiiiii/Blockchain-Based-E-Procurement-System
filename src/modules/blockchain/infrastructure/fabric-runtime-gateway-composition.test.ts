import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import type { AnchorEventInput } from '../application/blockchain-anchor-gateway.js';
import { createRuntimeBlockchainAnchorGateway } from './blockchain-anchor-gateway-composition.js';
import { InMemoryBlockchainAnchorGateway } from './in-memory-blockchain-anchor-gateway.js';

const payloadHash = `sha256:${'1'.repeat(64)}`;

function anchorInput(overrides: Partial<AnchorEventInput> = {}): AnchorEventInput {
  return {
    eventId: 'event-runtime-001',
    caseIdHash: `sha256:${'a'.repeat(64)}`,
    eventType: 'deliveryEvidenceSubmitted',
    payloadHash,
    schemaVersion: 'procure-to-pay-lifecycle-event.v1',
    canonicalization: 'json-canonical-v1',
    occurredAt: '2026-05-30T10:00:00.000Z',
    ...overrides,
  };
}

describe('runtime blockchain gateway composition', () => {
  it('uses the in-memory gateway only when in-memory mode is configured', async () => {
    const composition = createRuntimeBlockchainAnchorGateway({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'in-memory',
    });

    assert.ok(composition.gateway instanceof InMemoryBlockchainAnchorGateway);
    assert.strictEqual(composition.readiness.mode, 'local');
    assert.strictEqual(composition.readiness.proofAdapter, 'in-memory');

    const result = await composition.gateway.anchorEvent(anchorInput());
    assert.strictEqual(result.anchorStatus, 'anchored');
    assert.strictEqual(result.transactionId, undefined);
  });

  it('uses an explicit disabled gateway without attempting Fabric calls', async () => {
    const composition = createRuntimeBlockchainAnchorGateway({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'disabled',
    });

    const anchorResult = await composition.gateway.anchorEvent(anchorInput());
    const verification = await composition.gateway.verifyEvent('event-runtime-001', payloadHash);

    assert.strictEqual(composition.readiness.mode, 'disabled');
    assert.strictEqual(anchorResult.anchorStatus, 'failed');
    assert.strictEqual(anchorResult.failureReason, 'blockchain_anchor_disabled');
    assert.strictEqual(anchorResult.transactionId, undefined);
    assert.strictEqual(verification.verificationStatus, 'unavailable');
  });

  it('does not fall back to in-memory gateway when fabric-local config is incomplete', async () => {
    const composition = createRuntimeBlockchainAnchorGateway({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric-local',
      FABRIC_CHANNEL_NAME: 'procurement-proof-channel',
    });

    const anchorResult = await composition.gateway.anchorEvent(anchorInput());
    const verification = await composition.gateway.verifyEvent('event-runtime-001', payloadHash);

    assert.ok(!(composition.gateway instanceof InMemoryBlockchainAnchorGateway));
    assert.strictEqual(composition.readiness.mode, 'unavailable');
    assert.strictEqual(composition.readiness.proofAdapter, 'fabric-local');
    assert.deepStrictEqual(composition.readiness.missingConfiguration, [
      'FABRIC_CHAINCODE_NAME',
      'FABRIC_CONNECTION_PROFILE',
      'FABRIC_WALLET_PATH',
      'FABRIC_IDENTITY',
    ]);
    assert.strictEqual(anchorResult.anchorStatus, 'failed');
    assert.strictEqual(anchorResult.blockchainNetwork, 'fabric-local');
    assert.strictEqual(anchorResult.failureReason, 'missing_fabric_runtime_configuration');
    assert.strictEqual(anchorResult.transactionId, undefined);
    assert.strictEqual(verification.verificationStatus, 'unavailable');
  });

  it('does not fall back to in-memory gateway when Fabric runtime configuration is invalid', async () => {
    const composition = createRuntimeBlockchainAnchorGateway({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric',
      FABRIC_CHANNEL_NAME: 'procurement-proof-channel',
      FABRIC_CHAINCODE_NAME: 'audit-anchor',
      FABRIC_CONNECTION_PROFILE: 'C:\\fabric-labs\\connection-profile.yaml',
      FABRIC_WALLET_PATH: 'C:\\fabric-labs\\wallets\\platform',
      FABRIC_IDENTITY: 'platform-admin',
    });

    const anchorResult = await composition.gateway.anchorEvent(anchorInput());

    assert.ok(!(composition.gateway instanceof InMemoryBlockchainAnchorGateway));
    assert.strictEqual(composition.readiness.mode, 'unavailable');
    assert.strictEqual(composition.readiness.proofAdapter, 'fabric');
    assert.strictEqual(composition.readiness.reason, 'fabric_gateway_configuration_invalid');
    assert.strictEqual(anchorResult.anchorStatus, 'failed');
    assert.strictEqual(anchorResult.blockchainNetwork, 'fabric');
    assert.strictEqual(anchorResult.channelName, 'procurement-proof-channel');
    assert.strictEqual(anchorResult.chaincodeName, 'audit-anchor');
    assert.strictEqual(anchorResult.transactionId, undefined);
  });

  it('proof verification route returns unavailable with an unavailable Fabric gateway', async () => {
    const composition = createRuntimeBlockchainAnchorGateway({
      BLOCKCHAIN_ANCHOR_ADAPTER: 'fabric',
      FABRIC_CHANNEL_NAME: 'procurement-proof-channel',
      FABRIC_CHAINCODE_NAME: 'audit-anchor',
      FABRIC_CONNECTION_PROFILE: 'C:\\fabric-labs\\connection-profile.yaml',
      FABRIC_WALLET_PATH: 'C:\\fabric-labs\\wallets\\platform',
      FABRIC_IDENTITY: 'platform-admin',
    });
    const server = createTestableServer({
      blockchainAnchorGateway: composition.gateway,
    });
    await server.ready();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/blockchain/anchors/event-runtime-001/verify',
      headers: {
        'x-actor-id': 'auditor-user',
        'x-actor-role': 'auditor',
      },
      payload: {
        payloadHash,
      },
    });

    assert.strictEqual(response.statusCode, 200);
    assert.strictEqual(response.json().data.verificationStatus, 'unavailable');
    assert.strictEqual(response.json().data.anchoredPayloadHash, undefined);
  });
});
