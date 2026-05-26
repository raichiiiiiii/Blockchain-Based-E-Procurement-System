import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import type { DeliveryEvidenceRepository } from '../../procurement/application/delivery-evidence-repository.js';
import type { ProcurementEligibilityGateway } from '../../procurement/application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import { createEscrow, type CreateEscrowInput } from '../application/create-escrow.js';
import { getEscrow } from '../application/get-escrow.js';
import {
  transitionEscrow,
  type EscrowArbitrationOutcome,
  type EscrowTransitionAction,
} from '../application/transition-escrow.js';
import type { EscrowRepository } from '../application/escrow-repository.js';
import type { EscrowRecord } from '../domain/escrow.js';

type EscrowRoutesOptions = {
  escrowRepository: EscrowRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  orderRepository?: ProcurementOrderRepository;
  deliveryEvidenceRepository?: DeliveryEvidenceRepository;
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
const escrowReadRoles = new Set(['buyer', 'supplier', 'financier', 'auditor', 'securityOperator', 'administrator']);

type TransitionEscrowBody = {
  reason?: string;
  arbitrationOutcome?: EscrowArbitrationOutcome;
};

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

function canReadEscrow(request: FastifyRequest, escrow: EscrowRecord): boolean {
  const actorOrg = actorOrganizationId(request);
  if (hasAnyRole(request, new Set(['auditor', 'securityOperator', 'administrator']))) {
    return true;
  }

  if (hasAnyRole(request, new Set(['buyer']))) {
    return actorOrg === undefined || actorOrg === escrow.buyerOrganizationId;
  }

  if (hasAnyRole(request, new Set(['supplier']))) {
    return actorOrg === undefined || actorOrg === escrow.supplierOrganizationId;
  }

  if (hasAnyRole(request, new Set(['financier']))) {
    return actorOrg === undefined || actorOrg === escrow.financierOrganizationId;
  }

  return false;
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
        if (!canReadEscrow(request, result.escrow)) {
          return forbidden(reply, 'User is not allowed to view this escrow record');
        }

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

  async function handleEscrowTransition(
    request: FastifyRequest<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>,
    reply: FastifyReply,
    action: EscrowTransitionAction,
  ) {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      if (reply.sent) {
        return reply;
      }
      return unauthorized(reply);
    }

    const result = await transitionEscrow({
      escrowId: request.params.escrowId,
      action,
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
      reason: request.body?.reason,
      arbitrationOutcome: request.body?.arbitrationOutcome,
      requestId: request.id,
    }, {
      escrowRepository: options.escrowRepository,
      lifecycleEventRepository: options.lifecycleEventRepository,
      blockchainAnchorGateway: options.blockchainAnchorGateway,
      blockchainAnchorMetadataRepository: options.blockchainAnchorMetadataRepository,
      orderRepository: options.orderRepository,
      deliveryEvidenceRepository: options.deliveryEvidenceRepository,
      eligibilityGateway: options.eligibilityGateway,
    });

    switch (result.status) {
      case 'transitioned':
        return reply.code(200).send({
          data: {
            escrow: result.escrow,
            releaseConditions: result.releaseConditions,
          },
        });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid escrow transition request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply, 'User is not allowed to perform this escrow action', {
          reason: result.reason,
        });
      case 'notFound':
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Escrow was not found',
          },
        });
      case 'conflict':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: result.reason === 'releaseConditionsNotMet'
              ? 'Release conditions are not satisfied'
              : 'Escrow transition is not allowed from the current status',
            details: {
              reason: result.reason,
              currentStatus: result.currentStatus,
              releaseConditions: result.releaseConditions,
            },
          },
        });
    }
  }

  fastify.post<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>(
    '/escrow/:escrowId/fund',
    async (request, reply) => handleEscrowTransition(request, reply, 'fund'),
  );
  fastify.post<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>(
    '/escrow/:escrowId/request-release',
    async (request, reply) => handleEscrowTransition(request, reply, 'requestRelease'),
  );
  fastify.post<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>(
    '/escrow/:escrowId/approve-release',
    async (request, reply) => handleEscrowTransition(request, reply, 'approveRelease'),
  );
  fastify.post<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>(
    '/escrow/:escrowId/hold',
    async (request, reply) => handleEscrowTransition(request, reply, 'hold'),
  );
  fastify.post<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>(
    '/escrow/:escrowId/dispute',
    async (request, reply) => handleEscrowTransition(request, reply, 'openDispute'),
  );
  fastify.post<{ Params: { escrowId: string }; Body: TransitionEscrowBody }>(
    '/escrow/:escrowId/arbitration-decision',
    async (request, reply) => handleEscrowTransition(request, reply, 'recordArbitrationDecision'),
  );
};
