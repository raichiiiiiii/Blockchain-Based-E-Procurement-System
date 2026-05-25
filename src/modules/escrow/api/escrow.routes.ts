import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import type { ProcurementEligibilityGateway } from '../../procurement/application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import { createEscrow, type CreateEscrowInput } from '../application/create-escrow.js';
import { getEscrow } from '../application/get-escrow.js';
import type { EscrowRepository } from '../application/escrow-repository.js';

type EscrowRoutesOptions = {
  escrowRepository: EscrowRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  orderRepository?: ProcurementOrderRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type CreateEscrowBody = {
  orderId?: string;
  buyerOrganizationId?: string;
  supplierOrganizationId?: string;
  financierOrganizationId?: string;
  termsHash?: string;
  acceptedOrderReference?: string;
};

const escrowCreateRoles = new Set(['buyer']);
const escrowReadRoles = new Set(['buyer', 'auditor', 'securityOperator']);

function actorUserId(request: FastifyRequest): string | undefined {
  return request.actorContext?.actorUserId ?? request.actorContext?.userId;
}

function actorOrganizationId(request: FastifyRequest): string | undefined {
  return request.actorContext?.actorOrganizationId;
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

export const registerEscrowRoutes: FastifyPluginAsync<EscrowRoutesOptions> = async (
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

  fastify.post<{ Body: CreateEscrowBody }>('/escrows', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }
      return unauthorized(reply);
    }

    if (!hasAnyRole(request, escrowCreateRoles)) {
      return forbidden(reply, 'User must have buyer role to create escrow');
    }

    const input: CreateEscrowInput = {
      ...(request.body ?? {}),
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
      requestId: request.id,
    };

    const result = await createEscrow(input, {
      escrowRepository: options.escrowRepository,
      lifecycleEventRepository: options.lifecycleEventRepository,
      blockchainAnchorGateway: options.blockchainAnchorGateway,
      blockchainAnchorMetadataRepository: options.blockchainAnchorMetadataRepository,
      orderRepository: options.orderRepository,
      eligibilityGateway: options.eligibilityGateway,
    });

    switch (result.status) {
      case 'created':
        return reply.code(201).send({ data: result.escrow });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid escrow request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply, result.reason === 'buyerRoleRequired'
          ? 'User must have buyer role to create escrow'
          : result.reason === 'buyerOrganizationMismatch'
            ? 'Buyer organization must match the signed-in actor organization'
            : 'Escrow organizations must match the accepted order');
      case 'notEligible':
        return forbidden(reply, 'Organization is not eligible for escrow actions', {
          party: result.party,
          eligibility: result.eligibility.eligibility,
          memberOrganizationId: result.eligibility.memberOrganizationId,
          reasonCodes: result.eligibility.reasonCodes,
        });
      case 'orderNotFound':
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Accepted order was not found',
            details: {
              orderId: result.orderId,
            },
          },
        });
      case 'orderNotAccepted':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Order must be accepted before escrow can be created',
            details: {
              orderId: result.orderId,
              orderStatus: result.orderStatus,
            },
          },
        });
      case 'duplicateActiveEscrow':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'An active escrow already exists for this order',
            details: {
              existingEscrowId: result.existingEscrowId,
            },
          },
        });
    }
  });

  fastify.get<{ Params: { escrowId: string } }>('/escrows/:escrowId', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }
      return unauthorized(reply);
    }

    if (!hasAnyRole(request, escrowReadRoles)) {
      return forbidden(reply, 'User is not allowed to view escrow records');
    }

    const result = await getEscrow(options.escrowRepository, request.params.escrowId);

    switch (result.status) {
      case 'found':
        return reply.code(200).send({ data: result.escrow });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid escrow request', result.issues));
      case 'notFound':
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Escrow was not found',
          },
        });
    }
  });
};
