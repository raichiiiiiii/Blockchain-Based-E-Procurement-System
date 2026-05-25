import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Context } from 'fabric-contract-api';
import {
  AuditAnchorContract,
  type AnchorEventInput,
} from '../src/audit-anchor-contract';

type StoredEvent = {
  name: string;
  payload: Buffer;
};

type QueryIteratorResult = {
  value?: {
    value: Buffer;
  };
  done?: boolean;
};

class MockStateQueryIterator {
  private index = 0;
  closed = false;

  constructor(private readonly values: Buffer[]) {}

  async next(): Promise<QueryIteratorResult> {
    const value = this.values[this.index];
    this.index += 1;

    if (!value) {
      return { done: true };
    }

    return {
      value: {
        value,
      },
      done: false,
    };
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

class MockChaincodeStub {
  readonly state = new Map<string, Buffer>();
  readonly events: StoredEvent[] = [];

  createCompositeKey(objectType: string, attributes: string[]): string {
    return `${objectType}\u0000${attributes.join('\u0000')}\u0000`;
  }

  async getState(key: string): Promise<Buffer> {
    return this.state.get(key) ?? Buffer.alloc(0);
  }

  async putState(key: string, value: Buffer): Promise<void> {
    this.state.set(key, Buffer.from(value));
  }

  async getStateByPartialCompositeKey(
    objectType: string,
    attributes: string[],
  ): Promise<MockStateQueryIterator> {
    const prefix = this.createCompositeKey(objectType, attributes);
    const values = [...this.state.entries()]
      .filter(([key]) => key.startsWith(prefix))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([, value]) => Buffer.from(value));

    return new MockStateQueryIterator(values);
  }

  getTxTimestamp(): { seconds: { toNumber(): number }; nanos: number } {
    return {
      seconds: {
        toNumber: () => 1_767_225_600,
      },
      nanos: 123_000_000,
    };
  }

  getTxID(): string {
    return 'fabric-tx-001';
  }

  setEvent(name: string, payload: Buffer): void {
    this.events.push({ name, payload: Buffer.from(payload) });
  }
}

const caseIdHashA = `sha256:${'a'.repeat(64)}`;
const caseIdHashB = `sha256:${'b'.repeat(64)}`;
const payloadHashA = `sha256:${'1'.repeat(64)}`;
const payloadHashB = `sha256:${'2'.repeat(64)}`;
const payloadHashC = `sha256:${'3'.repeat(64)}`;

function createContext(stub = new MockChaincodeStub()): Context {
  return { stub } as unknown as Context;
}

function createAnchorInput(overrides: Partial<AnchorEventInput> = {}): AnchorEventInput {
  return {
    eventId: 'event-001',
    caseIdHash: caseIdHashA,
    eventType: 'purchaseOrderAccepted',
    payloadHash: payloadHashA,
    schemaVersion: '1.0',
    canonicalization: 'json-canonical-v1',
    occurredAt: '2026-05-25T04:00:00.000Z',
    ...overrides,
  };
}

describe('AuditAnchorContract', () => {
  it('anchors a valid event and emits a proof record', async () => {
    const contract = new AuditAnchorContract();
    const stub = new MockChaincodeStub();
    const ctx = createContext(stub);

    const result = await contract.anchorEvent(ctx, JSON.stringify(createAnchorInput()));

    assert.deepEqual(result, {
      eventId: 'event-001',
      anchorStatus: 'anchored',
      payloadHash: payloadHashA,
      transactionId: 'fabric-tx-001',
      anchoredAt: '2026-01-01T00:00:00.123Z',
    });
    assert.equal(stub.events.length, 1);
    assert.equal(stub.events[0].name, 'AuditAnchorCreated');
  });

  it('rejects duplicate eventId anchors', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();
    const anchorJson = JSON.stringify(createAnchorInput());

    await contract.anchorEvent(ctx, anchorJson);

    await assert.rejects(
      () => contract.anchorEvent(ctx, anchorJson),
      /DUPLICATE_ANCHOR/,
    );
  });

  it('returns an existing anchor from getAnchor', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();

    await contract.anchorEvent(ctx, JSON.stringify(createAnchorInput()));
    const anchor = await contract.getAnchor(ctx, 'event-001');

    assert.equal(anchor?.eventId, 'event-001');
    assert.equal(anchor?.caseIdHash, caseIdHashA);
    assert.equal(anchor?.payloadHash, payloadHashA);
    assert.equal(anchor?.anchoredAt, '2026-01-01T00:00:00.123Z');
  });

  it('returns null from getAnchor when the event is not anchored', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();

    const anchor = await contract.getAnchor(ctx, 'missing-event');

    assert.equal(anchor, null);
  });

  it('returns verified when the submitted payload hash matches the anchor', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();

    await contract.anchorEvent(ctx, JSON.stringify(createAnchorInput()));
    const verification = await contract.verifyEvent(ctx, 'event-001', payloadHashA);

    assert.deepEqual(verification, {
      eventId: 'event-001',
      verificationStatus: 'verified',
      submittedPayloadHash: payloadHashA,
      anchoredPayloadHash: payloadHashA,
      anchoredAt: '2026-01-01T00:00:00.123Z',
    });
  });

  it('returns mismatch when the submitted payload hash differs from the anchor', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();

    await contract.anchorEvent(ctx, JSON.stringify(createAnchorInput()));
    const verification = await contract.verifyEvent(ctx, 'event-001', payloadHashB);

    assert.equal(verification.verificationStatus, 'mismatch');
    assert.equal(verification.submittedPayloadHash, payloadHashB);
    assert.equal(verification.anchoredPayloadHash, payloadHashA);
  });

  it('returns notFound when verifying a missing anchor', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();

    const verification = await contract.verifyEvent(ctx, 'missing-event', payloadHashA);

    assert.deepEqual(verification, {
      eventId: 'missing-event',
      verificationStatus: 'notFound',
      submittedPayloadHash: payloadHashA,
    });
  });

  it('lists anchors by hashed case id in deterministic order', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();

    await contract.anchorEvent(
      ctx,
      JSON.stringify(createAnchorInput({
        eventId: 'event-002',
        payloadHash: payloadHashB,
        occurredAt: '2026-05-25T04:10:00.000Z',
      })),
    );
    await contract.anchorEvent(
      ctx,
      JSON.stringify(createAnchorInput({
        eventId: 'event-001',
        payloadHash: payloadHashA,
        occurredAt: '2026-05-25T04:00:00.000Z',
      })),
    );
    await contract.anchorEvent(
      ctx,
      JSON.stringify(createAnchorInput({
        eventId: 'event-003',
        caseIdHash: caseIdHashB,
        payloadHash: payloadHashC,
      })),
    );

    const anchors = await contract.listAnchorsByCase(ctx, caseIdHashA);

    assert.deepEqual(anchors.map(anchor => anchor.eventId), ['event-001', 'event-002']);
  });

  it('rejects unsupported fields so raw payloads cannot be anchored by mistake', async () => {
    const contract = new AuditAnchorContract();
    const ctx = createContext();
    const unsafeInput = {
      ...createAnchorInput(),
      rawInvoicePayload: {
        amount: 1200,
        buyerName: 'Sensitive Buyer',
      },
    };

    await assert.rejects(
      () => contract.anchorEvent(ctx, JSON.stringify(unsafeInput)),
      /unsupported anchor field 'rawInvoicePayload'/,
    );
  });
});
