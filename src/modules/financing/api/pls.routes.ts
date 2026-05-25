import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ProcurementEligibilityGateway } from '../../procurement/application/procurement-eligibility-gateway.js';
import type { ShariahReviewRepository } from '../../shariah-review/application/shariah-review-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { PlsContractRepository } from '../application/pls-contract-repository.js';
import {
  activatePlsContract,
  createPlsDistribution,
  type CreatePlsDistributionInput,
} from '../application/pls-contract-service.js';

export type PlsRoutesOptions = {
  contractRepository: PlsContractRepository;
  shariahReviewRepository: ShariahReviewRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply | unknown>;
};

type ActivateBody = {
  shariahReviewId?: string;
};

type DistributionBody = {
  eventType?: 'profit' | 'loss';
  grossResultAmount?: string;
  calculationBasis?: string;
};

const readRoles = new Set(['financier', 'shariahReviewer', 'auditor']);
const activationRoles = new Set(['financier']);
const distributionRoles = new Set(['financier']);

function actorUserId(request: FastifyRequest): string | undefined {
  return request.actorContext?.actorUserId ?? request.actorContext?.userId;
}

function actorRoleCodes(request: FastifyRequest): string[] {
  return request.actorContext?.actorRoleCodes ?? request.actorContext?.authorizationContext.roles ?? [];
}

function isAuthenticated(request: FastifyRequest): boolean {
  return Boolean(request.actorContext?.isAuthenticated && actorUserId(request));
}

function hasAnyRole(request: FastifyRequest, allowedRoles: Set<string>): boolean {
  return actorRoleCodes(request).some(role => allowedRoles.has(role));
}

function unauthorized(reply: FastifyReply) {
  return reply.code(401).send({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}

function forbidden(reply: FastifyReply, message: string, details?: Record<string, unknown>) {
  return reply.code(403).send({
    error: {
      code: 'FORBIDDEN',
      message,
      ...(details ? { details } : {}),
    },
  });
}

function notFound(reply: FastifyReply, message: string) {
  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message,
    },
  });
}

export const registerPlsRoutes: FastifyPluginAsync<PlsRoutesOptions> = async (
  fastify,
  options,
) => {
  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (options.authenticatedPreHandler) {
      await options.authenticatedPreHandler(request, reply);
      return !reply.sent;
    }

    return isAuthenticated(request);
  }

  fastify.get('/financing/pls-contracts', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }

      return unauthorized(reply);
    }

    if (!hasAnyRole(request, readRoles)) {
      return forbidden(reply, 'User is not allowed to view PLS contracts');
    }

    return reply.code(200).send({
      data: {
        items: await options.contractRepository.listContracts(),
      },
    });
  });

  fastify.get<{ Params: { contractId: string } }>('/financing/pls-contracts/:contractId', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }

      return unauthorized(reply);
    }

    if (!hasAnyRole(request, readRoles)) {
      return forbidden(reply, 'User is not allowed to view PLS contracts');
    }

    const contract = await options.contractRepository.findContractById(request.params.contractId.trim());
    if (!contract) {
      return notFound(reply, 'PLS contract was not found');
    }

    return reply.code(200).send({ data: contract });
  });

  fastify.post<{
    Params: { contractId: string };
    Body: ActivateBody;
  }>('/financing/pls-contracts/:contractId/activate', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }

      return unauthorized(reply);
    }

    if (!hasAnyRole(request, activationRoles)) {
      return forbidden(reply, 'User must have financier role to activate PLS contracts');
    }

    const result = await activatePlsContract({
      contractId: request.params.contractId,
      shariahReviewId: request.body?.shariahReviewId,
    }, {
      contractRepository: options.contractRepository,
      shariahReviewRepository: options.shariahReviewRepository,
      eligibilityGateway: options.eligibilityGateway,
    });

    switch (result.status) {
      case 'activated':
        return reply.code(200).send({ data: result.contract });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid PLS activation request', result.issues));
      case 'notFound':
        return notFound(reply, 'PLS contract was not found');
      case 'approvalMissing':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Approved Shariah review reference is required before activation',
          },
        });
      case 'activationBlocked':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'PLS activation is blocked until Shariah review is approved',
            details: {
              approvalStatus: result.approvalStatus,
            },
          },
        });
      case 'notEligible':
        return forbidden(reply, 'Organization is not eligible for PLS activation', {
          party: result.party,
          eligibility: result.eligibility.eligibility,
          memberOrganizationId: result.eligibility.memberOrganizationId,
          reasonCodes: result.eligibility.reasonCodes,
        });
    }
  });

  fastify.get<{ Params: { contractId: string } }>('/financing/pls-contracts/:contractId/distributions', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }

      return unauthorized(reply);
    }

    if (!hasAnyRole(request, readRoles)) {
      return forbidden(reply, 'User is not allowed to view PLS distributions');
    }

    const contract = await options.contractRepository.findContractById(request.params.contractId.trim());
    if (!contract) {
      return notFound(reply, 'PLS contract was not found');
    }

    return reply.code(200).send({
      data: {
        items: await options.contractRepository.listDistributionsByContract(contract.contractId),
      },
    });
  });

  fastify.post<{
    Params: { contractId: string };
    Body: DistributionBody;
  }>('/financing/pls-contracts/:contractId/distributions', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }

      return unauthorized(reply);
    }

    if (!hasAnyRole(request, distributionRoles)) {
      return forbidden(reply, 'User must have financier role to record PLS distributions');
    }

    const input: CreatePlsDistributionInput = {
      contractId: request.params.contractId,
      eventType: request.body?.eventType,
      grossResultAmount: request.body?.grossResultAmount,
      calculationBasis: request.body?.calculationBasis,
      createdBy: actorUserId(request),
    };
    const result = await createPlsDistribution(input, {
      contractRepository: options.contractRepository,
    });

    switch (result.status) {
      case 'created':
        return reply.code(201).send({ data: result.distribution });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid PLS distribution request', result.issues));
      case 'notFound':
        return notFound(reply, 'PLS contract was not found');
      case 'inactiveContract':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'PLS contract must be active before distribution can be recorded',
          },
        });
    }
  });
};
