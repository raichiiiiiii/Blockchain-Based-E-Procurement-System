import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { BlockchainAnchorGateway } from '../application/blockchain-anchor-gateway.js';
import type { BlockchainAnchorMetadataRepository } from '../application/blockchain-anchor-metadata-repository.js';
import {
  getBlockchainAnchorProof,
  verifyBlockchainProof,
} from '../application/blockchain-proof-service.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';

type BlockchainAnchorRoutesOptions = {
  gateway?: BlockchainAnchorGateway;
  metadataRepository?: BlockchainAnchorMetadataRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type VerifyProofBody = {
  payloadHash?: string;
};

type ValidationIssue = {
  path: string;
  message: string;
};

const allowedProofRoles = new Set(['auditor', 'regulator', 'securityOperator']);

function hasProofAccess(request: FastifyRequest): boolean {
  const actorContext = request.actorContext;
  if (!actorContext?.isAuthenticated) {
    return false;
  }

  const roles = actorContext.authorizationContext.roles ?? [];
  return roles.some(role => allowedProofRoles.has(role));
}

function validateEventId(eventId: string): ValidationIssue[] {
  if (!eventId || eventId.trim().length === 0) {
    return [{
      path: 'eventId',
      message: 'eventId is required and cannot be blank',
    }];
  }

  return [];
}

function validateVerifyBody(body: VerifyProofBody | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!body || typeof body.payloadHash !== 'string' || body.payloadHash.trim().length === 0) {
    issues.push({
      path: 'payloadHash',
      message: 'payloadHash is required and cannot be blank',
    });
  }

  return issues;
}

export const registerBlockchainAnchorRoutes: FastifyPluginAsync<BlockchainAnchorRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.addHook('preHandler', async (request, reply) => {
    if (options.authenticatedPreHandler) {
      await options.authenticatedPreHandler(request, reply);
      if (reply.sent) {
        return;
      }
    }

    if (!hasProofAccess(request)) {
      return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User must have auditor, regulator, or security operator role to access blockchain proofs',
          },
        });
      }
  });

  fastify.get<{
    Params: {
      eventId: string;
    };
  }>('/blockchain/anchors/:eventId', async (request, reply) => {
    const eventId = request.params.eventId.trim();
    const issues = validateEventId(eventId);

    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid blockchain anchor request', issues));
    }

    const proof = await getBlockchainAnchorProof(options.metadataRepository, eventId);

    return reply.code(200).send({
      data: proof,
    });
  });

  fastify.post<{
    Params: {
      eventId: string;
    };
    Body: VerifyProofBody;
  }>('/blockchain/anchors/:eventId/verify', async (request, reply) => {
    const eventId = request.params.eventId.trim();
    const issues = [
      ...validateEventId(eventId),
      ...validateVerifyBody(request.body),
    ];

    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid blockchain verification request', issues));
    }

    const payloadHash = request.body.payloadHash!.trim();
    const verification = await verifyBlockchainProof(options.gateway, eventId, payloadHash);

    return reply.code(200).send({
      data: verification,
    });
  });
};
