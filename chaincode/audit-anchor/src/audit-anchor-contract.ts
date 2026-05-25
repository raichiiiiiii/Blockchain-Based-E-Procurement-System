import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';

export type AnchorEventInput = {
  eventId: string;
  caseIdHash: string;
  eventType: string;
  payloadHash: string;
  schemaVersion: string;
  canonicalization: 'json-canonical-v1';
  occurredAt: string;
  previousEventHash?: string;
};

export type OnChainAnchorRecord = AnchorEventInput & {
  anchoredAt: string;
};

export type AnchorEventResult = {
  eventId: string;
  anchorStatus: 'anchored';
  payloadHash: string;
  transactionId?: string;
  anchoredAt: string;
};

export type VerificationResult = {
  eventId: string;
  verificationStatus: 'verified' | 'mismatch' | 'notFound';
  submittedPayloadHash: string;
  anchoredPayloadHash?: string;
  anchoredAt?: string;
};

const ANCHOR_OBJECT_TYPE = 'auditAnchor';
const CASE_INDEX_OBJECT_TYPE = 'auditAnchorByCase';
const CANONICALIZATION = 'json-canonical-v1';
const HASH_PATTERN = /^sha256:[a-fA-F0-9]{64}$/;

const allowedAnchorFields = new Set([
  'eventId',
  'caseIdHash',
  'eventType',
  'payloadHash',
  'schemaVersion',
  'canonicalization',
  'occurredAt',
  'previousEventHash',
]);

type TimestampLike = {
  seconds?: number | string | { toNumber(): number } | { low: number };
  nanos?: number;
};

type IteratorValue = {
  value?: {
    value: Uint8Array;
  };
  done?: boolean;
};

type StateIterator = {
  next(): Promise<IteratorValue>;
  close(): Promise<void>;
};

function anchorKey(ctx: Context, eventId: string): string {
  return ctx.stub.createCompositeKey(ANCHOR_OBJECT_TYPE, [eventId]);
}

function caseIndexKey(ctx: Context, caseIdHash: string, eventId: string): string {
  return ctx.stub.createCompositeKey(CASE_INDEX_OBJECT_TYPE, [caseIdHash, eventId]);
}

function requiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`VALIDATION_ERROR: ${fieldName} is required`);
  }

  return value.trim();
}

function validateHash(value: string, fieldName: string): void {
  if (!HASH_PATTERN.test(value)) {
    throw new Error(`VALIDATION_ERROR: ${fieldName} must be a sha256:<64 hex> hash`);
  }
}

function validateIsoTimestamp(value: string, fieldName: string): void {
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`VALIDATION_ERROR: ${fieldName} must be an ISO-8601 timestamp`);
  }
}

function parseAnchorInput(anchorJson: string): AnchorEventInput {
  const rawJson = requiredString(anchorJson, 'anchorJson');
  const parsed = JSON.parse(rawJson) as unknown;

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('VALIDATION_ERROR: anchorJson must be a JSON object');
  }

  const record = parsed as Record<string, unknown>;
  for (const fieldName of Object.keys(record)) {
    if (!allowedAnchorFields.has(fieldName)) {
      throw new Error(`VALIDATION_ERROR: unsupported anchor field '${fieldName}'`);
    }
  }

  const input: AnchorEventInput = {
    eventId: requiredString(record.eventId, 'eventId'),
    caseIdHash: requiredString(record.caseIdHash, 'caseIdHash'),
    eventType: requiredString(record.eventType, 'eventType'),
    payloadHash: requiredString(record.payloadHash, 'payloadHash'),
    schemaVersion: requiredString(record.schemaVersion, 'schemaVersion'),
    canonicalization: CANONICALIZATION,
    occurredAt: requiredString(record.occurredAt, 'occurredAt'),
  };

  const canonicalization = requiredString(record.canonicalization, 'canonicalization');
  if (canonicalization !== CANONICALIZATION) {
    throw new Error(`VALIDATION_ERROR: canonicalization must be ${CANONICALIZATION}`);
  }

  validateHash(input.caseIdHash, 'caseIdHash');
  validateHash(input.payloadHash, 'payloadHash');
  validateIsoTimestamp(input.occurredAt, 'occurredAt');

  if (record.previousEventHash !== undefined) {
    input.previousEventHash = requiredString(record.previousEventHash, 'previousEventHash');
    validateHash(input.previousEventHash, 'previousEventHash');
  }

  return input;
}

function parseRecord(bytes: Uint8Array): OnChainAnchorRecord {
  return JSON.parse(Buffer.from(bytes).toString('utf8')) as OnChainAnchorRecord;
}

function bufferIsEmpty(bytes: Uint8Array): boolean {
  return bytes.length === 0;
}

function timestampSecondsToNumber(seconds: TimestampLike['seconds']): number | undefined {
  if (typeof seconds === 'number') {
    return seconds;
  }

  if (typeof seconds === 'string') {
    const parsed = Number(seconds);
    return Number.isNaN(parsed) ? undefined : parsed;
  }

  if (seconds && 'toNumber' in seconds) {
    return seconds.toNumber();
  }

  if (seconds && 'low' in seconds) {
    return seconds.low;
  }

  return undefined;
}

function anchoredAtFromTransaction(ctx: Context): string {
  const timestamp = ctx.stub.getTxTimestamp() as TimestampLike | undefined;
  const seconds = timestampSecondsToNumber(timestamp?.seconds);

  if (seconds === undefined) {
    return new Date().toISOString();
  }

  const millis = seconds * 1000 + Math.floor((timestamp?.nanos ?? 0) / 1_000_000);
  return new Date(millis).toISOString();
}

async function collectCaseAnchors(ctx: Context, caseIdHash: string): Promise<OnChainAnchorRecord[]> {
  const iterator = await ctx.stub.getStateByPartialCompositeKey(
    CASE_INDEX_OBJECT_TYPE,
    [caseIdHash],
  ) as StateIterator;

  const records: OnChainAnchorRecord[] = [];
  try {
    while (true) {
      const next = await iterator.next();
      if (next.done) {
        break;
      }

      if (!next.value) {
        continue;
      }

      const eventId = Buffer.from(next.value.value).toString('utf8');
      const anchorBytes = await ctx.stub.getState(anchorKey(ctx, eventId));
      if (!bufferIsEmpty(anchorBytes)) {
        records.push(parseRecord(anchorBytes));
      }
    }
  } finally {
    await iterator.close();
  }

  return records.sort((left, right) => (
    left.occurredAt.localeCompare(right.occurredAt) ||
    left.eventId.localeCompare(right.eventId)
  ));
}

@Info({
  title: 'AuditAnchorContract',
  description: 'Append-only proof anchor contract for off-chain procurement and audit event hashes',
})
export class AuditAnchorContract extends Contract {
  @Transaction()
  @Returns('AnchorEventResult')
  async anchorEvent(ctx: Context, anchorJson: string): Promise<AnchorEventResult> {
    const input = parseAnchorInput(anchorJson);
    const key = anchorKey(ctx, input.eventId);
    const existing = await ctx.stub.getState(key);

    if (!bufferIsEmpty(existing)) {
      throw new Error(`DUPLICATE_ANCHOR: eventId '${input.eventId}' is already anchored`);
    }

    const anchoredAt = anchoredAtFromTransaction(ctx);
    const record: OnChainAnchorRecord = {
      ...input,
      anchoredAt,
    };

    await ctx.stub.putState(key, Buffer.from(JSON.stringify(record)));
    await ctx.stub.putState(
      caseIndexKey(ctx, input.caseIdHash, input.eventId),
      Buffer.from(input.eventId),
    );

    ctx.stub.setEvent('AuditAnchorCreated', Buffer.from(JSON.stringify(record)));

    return {
      eventId: record.eventId,
      anchorStatus: 'anchored',
      payloadHash: record.payloadHash,
      transactionId: ctx.stub.getTxID(),
      anchoredAt: record.anchoredAt,
    };
  }

  @Transaction(false)
  @Returns('OnChainAnchorRecord')
  async getAnchor(ctx: Context, eventId: string): Promise<OnChainAnchorRecord | null> {
    const normalizedEventId = requiredString(eventId, 'eventId');
    const state = await ctx.stub.getState(anchorKey(ctx, normalizedEventId));

    if (bufferIsEmpty(state)) {
      return null;
    }

    return parseRecord(state);
  }

  @Transaction(false)
  @Returns('VerificationResult')
  async verifyEvent(
    ctx: Context,
    eventId: string,
    payloadHash: string,
  ): Promise<VerificationResult> {
    const normalizedEventId = requiredString(eventId, 'eventId');
    const submittedPayloadHash = requiredString(payloadHash, 'payloadHash');
    validateHash(submittedPayloadHash, 'payloadHash');

    const record = await this.getAnchor(ctx, normalizedEventId);
    if (!record) {
      return {
        eventId: normalizedEventId,
        verificationStatus: 'notFound',
        submittedPayloadHash,
      };
    }

    return {
      eventId: normalizedEventId,
      verificationStatus: record.payloadHash === submittedPayloadHash ? 'verified' : 'mismatch',
      submittedPayloadHash,
      anchoredPayloadHash: record.payloadHash,
      anchoredAt: record.anchoredAt,
    };
  }

  @Transaction(false)
  @Returns('OnChainAnchorRecord[]')
  async listAnchorsByCase(ctx: Context, caseIdHash: string): Promise<OnChainAnchorRecord[]> {
    const normalizedCaseIdHash = requiredString(caseIdHash, 'caseIdHash');
    validateHash(normalizedCaseIdHash, 'caseIdHash');

    return collectCaseAnchors(ctx, normalizedCaseIdHash);
  }
}
