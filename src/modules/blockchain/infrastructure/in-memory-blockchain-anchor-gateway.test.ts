import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { InMemoryBlockchainAnchorGateway } from './in-memory-blockchain-anchor-gateway.js';
import type { AnchorEventInput } from '../application/blockchain-anchor-gateway.js';

const caseIdHash = `sha256:${'a'.repeat(64)}`;
const payloadHash = `sha256:${'1'.repeat(64)}`;
const changedPayloadHash = `sha256:${'2'.repeat(64)}`;

function anchorInput(overrides: Partial<AnchorEventInput> = {}): AnchorEventInput {
  return {
    eventId: 'event-001',
    caseIdHash,
    eventType: 'purchaseOrderAccepted',
    payloadHash,
    schemaVersion: 'procure-to-pay-lifecycle-event.v1',
    canonicalization: 'json-canonical-v1',
    occurredAt: '2026-05-25T04:00:00.000Z',
    ...overrides,
  };
}

describe('InMemoryBlockchainAnchorGateway', () => {
  it('anchors a proof-level event hash', async () => {
    const gateway = new InMemoryBlockchainAnchorGateway({
      now: () => '2026-05-25T04:01:00.000Z',
    });

    const result = await gateway.anchorEvent(anchorInput());
    const record = await gateway.getAnchor('event-001');

    assert.strictEqual(result.anchorStatus, 'anchored');
    assert.strictEqual(result.transactionId, undefined);
    assert.strictEqual(record?.payloadHash, payloadHash);
    assert.strictEqual(record?.anchoredAt, '2026-05-25T04:01:00.000Z');
  });

  it('returns failed for duplicate eventId instead of overwriting the anchor', async () => {
    const gateway = new InMemoryBlockchainAnchorGateway();
    await gateway.anchorEvent(anchorInput());

    const duplicate = await gateway.anchorEvent(anchorInput({
      payloadHash: changedPayloadHash,
    }));
    const stored = await gateway.getAnchor('event-001');

    assert.strictEqual(duplicate.anchorStatus, 'failed');
    assert.strictEqual(duplicate.failureReason, 'duplicate_anchor');
    assert.strictEqual(stored?.payloadHash, payloadHash);
  });

  it('verifies matching, mismatching, and missing anchors distinctly', async () => {
    const gateway = new InMemoryBlockchainAnchorGateway({
      now: () => '2026-05-25T04:01:00.000Z',
    });

    await gateway.anchorEvent(anchorInput());

    const verified = await gateway.verifyEvent('event-001', payloadHash);
    const mismatch = await gateway.verifyEvent('event-001', changedPayloadHash);
    const notFound = await gateway.verifyEvent('missing-event', payloadHash);

    assert.strictEqual(verified.verificationStatus, 'verified');
    assert.strictEqual(mismatch.verificationStatus, 'mismatch');
    assert.strictEqual(mismatch.anchoredPayloadHash, payloadHash);
    assert.strictEqual(notFound.verificationStatus, 'notFound');
    assert.strictEqual(notFound.anchoredPayloadHash, undefined);
  });

  it('returns unavailable verification when the gateway is unavailable', async () => {
    const gateway = new InMemoryBlockchainAnchorGateway({
      unavailable: true,
    });

    const result = await gateway.verifyEvent('event-001', payloadHash);

    assert.strictEqual(result.verificationStatus, 'unavailable');
    assert.strictEqual(result.submittedPayloadHash, payloadHash);
  });
});
