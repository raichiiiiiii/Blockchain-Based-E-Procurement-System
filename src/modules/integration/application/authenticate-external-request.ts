import type { ExternalApiScope, ExternalClientCredential } from './external-client-credential.js';
import type { ExternalClientCredentialRepository } from './external-client-credential-repository.js';
import { createExternalSignature, hashExternalSecret, signaturesMatch } from './external-request-signing.js';

export type ExternalRequestHeaders = Record<string, string | string[] | undefined>;

export type ExternalRequestAuthSuccess = {
  ok: true;
  client: ExternalClientCredential;
  idempotencyKey: string;
};

export type ExternalRequestAuthFailure = {
  ok: false;
  statusCode: 401 | 403 | 503;
  code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNAVAILABLE';
  message: string;
  reason: string;
  clientId?: string;
  idempotencyKey?: string;
};

export type ExternalRequestAuthResult = ExternalRequestAuthSuccess | ExternalRequestAuthFailure;

function headerValue(headers: ExternalRequestHeaders, name: string): string {
  const value = headers[name] ?? headers[name.toLowerCase()];
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }

  return value ?? '';
}

function isTimestampFresh(timestamp: string, now: Date, maxSkewMs: number): boolean {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return false;
  }

  return Math.abs(now.getTime() - parsed) <= maxSkewMs;
}

export async function authenticateExternalRequest(input: {
  method: string;
  path: string;
  headers: ExternalRequestHeaders;
  body: unknown;
  requiredScope: ExternalApiScope;
  clientRepository: ExternalClientCredentialRepository;
  sharedSecret?: string;
  now?: Date;
  maxClockSkewMs?: number;
}): Promise<ExternalRequestAuthResult> {
  if (!input.sharedSecret) {
    return {
      ok: false,
      statusCode: 503,
      code: 'UNAVAILABLE',
      message: 'External API signing secret is not configured',
      reason: 'external_secret_not_configured',
    };
  }

  const clientId = headerValue(input.headers, 'x-client-id').trim();
  const timestamp = headerValue(input.headers, 'x-request-timestamp').trim();
  const signature = headerValue(input.headers, 'x-signature').trim();
  const idempotencyKey = headerValue(input.headers, 'idempotency-key').trim();

  if (!clientId || !timestamp || !signature || !idempotencyKey) {
    return {
      ok: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'External request is missing required authentication headers',
      reason: 'missing_external_auth_headers',
      clientId: clientId || undefined,
      idempotencyKey: idempotencyKey || undefined,
    };
  }

  if (!isTimestampFresh(timestamp, input.now ?? new Date(), input.maxClockSkewMs ?? 5 * 60 * 1000)) {
    return {
      ok: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'External request timestamp is outside the allowed window',
      reason: 'stale_external_request',
      clientId,
      idempotencyKey,
    };
  }

  const client = await input.clientRepository.findByClientId(clientId);
  if (!client || client.status !== 'active') {
    return {
      ok: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'External client is not authorized',
      reason: 'external_client_not_authorized',
      clientId,
      idempotencyKey,
    };
  }

  if (client.secretHash !== hashExternalSecret(input.sharedSecret)) {
    return {
      ok: false,
      statusCode: 503,
      code: 'UNAVAILABLE',
      message: 'External client secret material is not configured for verification',
      reason: 'external_client_secret_mismatch',
      clientId,
      idempotencyKey,
    };
  }

  const expectedSignature = createExternalSignature({
    method: input.method,
    path: input.path,
    timestamp,
    idempotencyKey,
    body: input.body,
  }, input.sharedSecret);

  if (!signaturesMatch(signature, expectedSignature)) {
    return {
      ok: false,
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'External request signature is invalid',
      reason: 'invalid_external_signature',
      clientId,
      idempotencyKey,
    };
  }

  if (!client.scopes.includes(input.requiredScope)) {
    return {
      ok: false,
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'External client does not have the required scope',
      reason: 'external_scope_denied',
      clientId,
      idempotencyKey,
    };
  }

  return {
    ok: true,
    client,
    idempotencyKey,
  };
}
