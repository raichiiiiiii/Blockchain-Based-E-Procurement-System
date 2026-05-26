import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

type SignatureInput = {
  method: string;
  path: string;
  timestamp: string;
  idempotencyKey: string;
  body: unknown;
};

function canonicalize(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(item => canonicalize(item)).join(',')}]`;
  }

  const objectValue = value as Record<string, unknown>;
  return `{${Object.keys(objectValue)
    .sort()
    .filter(key => objectValue[key] !== undefined)
    .map(key => `${JSON.stringify(key)}:${canonicalize(objectValue[key])}`)
    .join(',')}}`;
}

export function hashExternalSecret(secret: string): string {
  return `sha256:${createHash('sha256').update(secret).digest('hex')}`;
}

export function createExternalSignature(input: SignatureInput, secret: string): string {
  const payload = [
    input.method.toUpperCase(),
    input.path,
    input.timestamp,
    input.idempotencyKey,
    canonicalize(input.body),
  ].join('\n');

  return `sha256=${createHmac('sha256', secret).update(payload).digest('hex')}`;
}

export function signaturesMatch(left: string, right: string): boolean {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
