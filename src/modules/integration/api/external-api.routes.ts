import { randomUUID } from 'node:crypto';
import type { FastifyPluginAsync, FastifyRequest } from 'fastify';
import type { ExternalApiAuditRepository } from '../application/external-api-audit-repository.js';
import type { ExternalClientCredentialRepository } from '../application/external-client-credential-repository.js';
import type { ExternalIdempotencyRepository } from '../application/external-idempotency-repository.js';
import { authenticateExternalRequest } from '../application/authenticate-external-request.js';

export type ExternalApiRoutesOptions = {
  clientRepository: ExternalClientCredentialRepository;
  idempotencyRepository: ExternalIdempotencyRepository;
  auditRepository: ExternalApiAuditRepository;
  sharedSecret?: string;
};

type ProofVerifyBody = {
  eventId?: string;
  payloadHash?: string;
};

const PROOF_VERIFY_ROUTE = '/api/v1/external/proof/verify';

function isValidPayloadHash(value: string | undefined): boolean {
  return typeof value === 'string' && /^sha256:[a-f0-9]{64}$/i.test(value);
}

async function auditExternalRequest(options: {
  repository: ExternalApiAuditRepository;
  clientId?: string;
  action: string;
  route: string;
  method: string;
  outcome: 'accepted' | 'rejected';
  reason?: string;
  idempotencyKey?: string;
}) {
  await options.repository.save({
    eventId: randomUUID(),
    occurredAt: new Date().toISOString(),
    clientId: options.clientId,
    action: options.action,
    route: options.route,
    method: options.method,
    outcome: options.outcome,
    reason: options.reason,
    idempotencyKey: options.idempotencyKey,
  });
}

export const registerExternalApiRoutes: FastifyPluginAsync<ExternalApiRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.post('/external/proof/verify', async (request: FastifyRequest<{ Body: ProofVerifyBody }>, reply) => {
    const auth = await authenticateExternalRequest({
      method: request.method,
      path: PROOF_VERIFY_ROUTE,
      headers: request.headers,
      body: request.body,
      requiredScope: 'proof:verify',
      clientRepository: options.clientRepository,
      sharedSecret: options.sharedSecret,
    });

    if (!auth.ok) {
      await auditExternalRequest({
        repository: options.auditRepository,
        clientId: auth.clientId,
        action: 'externalProofVerify',
        route: PROOF_VERIFY_ROUTE,
        method: request.method,
        outcome: 'rejected',
        reason: auth.reason,
        idempotencyKey: auth.idempotencyKey,
      });

      return reply.code(auth.statusCode).send({
        error: {
          code: auth.code,
          message: auth.message,
        },
      });
    }

    if (!request.body?.eventId?.trim() || !isValidPayloadHash(request.body.payloadHash)) {
      await auditExternalRequest({
        repository: options.auditRepository,
        clientId: auth.client.clientId,
        action: 'externalProofVerify',
        route: PROOF_VERIFY_ROUTE,
        method: request.method,
        outcome: 'rejected',
        reason: 'invalid_external_proof_verify_payload',
        idempotencyKey: auth.idempotencyKey,
      });

      return reply.code(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'External proof verification requires eventId and sha256 payloadHash',
        },
      });
    }

    const existing = await options.idempotencyRepository.find({
      clientId: auth.client.clientId,
      route: PROOF_VERIFY_ROUTE,
      idempotencyKey: auth.idempotencyKey,
    });

    if (existing) {
      await auditExternalRequest({
        repository: options.auditRepository,
        clientId: auth.client.clientId,
        action: 'externalProofVerify',
        route: PROOF_VERIFY_ROUTE,
        method: request.method,
        outcome: 'accepted',
        reason: 'idempotency_replay',
        idempotencyKey: auth.idempotencyKey,
      });

      return reply.code(200).send({
        data: {
          accepted: true,
          replayed: true,
          requestId: existing.requestId,
          clientId: auth.client.clientId,
          scope: 'proof:verify',
        },
      });
    }

    const requestId = randomUUID();
    await options.idempotencyRepository.save({
      clientId: auth.client.clientId,
      route: PROOF_VERIFY_ROUTE,
      idempotencyKey: auth.idempotencyKey,
      requestId,
      createdAt: new Date().toISOString(),
    });

    await auditExternalRequest({
      repository: options.auditRepository,
      clientId: auth.client.clientId,
      action: 'externalProofVerify',
      route: PROOF_VERIFY_ROUTE,
      method: request.method,
      outcome: 'accepted',
      idempotencyKey: auth.idempotencyKey,
    });

    return reply.code(202).send({
      data: {
        accepted: true,
        replayed: false,
        requestId,
        clientId: auth.client.clientId,
        scope: 'proof:verify',
      },
    });
  });
};
