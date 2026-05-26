import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { BlockchainAnchorGateway } from '../../blockchain/application/blockchain-anchor-gateway.js';
import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { DeliveryEvidenceRepository } from '../application/delivery-evidence-repository.js';
import { listDeliveryEvidence } from '../application/list-delivery-evidence.js';
import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import { submitDeliveryEvidence } from '../application/submit-delivery-evidence.js';

type DeliveryEvidenceRoutesOptions = {
  orderRepository: ProcurementOrderRepository;
  evidenceRepository: DeliveryEvidenceRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorGateway?: BlockchainAnchorGateway;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type SubmitDeliveryEvidenceBody = {
  evidenceType?: string;
  evidenceReference?: string;
  evidenceHash?: string;
  notes?: string;
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

function unauthorized(reply: FastifyReply) {
  return reply.code(401).send({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}

function forbidden(reply: FastifyReply, message: string) {
  return reply.code(403).send({
    error: {
      code: 'FORBIDDEN',
      message,
    },
  });
}

function orderNotFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: 'Order was not found',
    },
  });
}

export const registerDeliveryEvidenceRoutes: FastifyPluginAsync<DeliveryEvidenceRoutesOptions> = async (
  fastify,
  options,
) => {
  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    await options.authenticatedPreHandler(request, reply);
    return !reply.sent;
  }

  fastify.post<{
    Params: { orderId: string };
    Body: SubmitDeliveryEvidenceBody;
  }>('/orders/:orderId/delivery-evidence', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    if (!actorUserId(request) || !actorOrganizationId(request)) {
      return unauthorized(reply);
    }

    const result = await submitDeliveryEvidence({
      orderId: request.params.orderId,
      evidenceType: request.body?.evidenceType,
      evidenceReference: request.body?.evidenceReference,
      evidenceHash: request.body?.evidenceHash,
      notes: request.body?.notes,
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
      requestId: request.id,
    }, {
      orderRepository: options.orderRepository,
      evidenceRepository: options.evidenceRepository,
      lifecycleEventRepository: options.lifecycleEventRepository,
      blockchainAnchorGateway: options.blockchainAnchorGateway,
      blockchainAnchorMetadataRepository: options.blockchainAnchorMetadataRepository,
    });

    switch (result.status) {
      case 'submitted':
        return reply.code(201).send({ data: result.evidence });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid delivery evidence request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply, result.reason === 'supplierRoleRequired'
          ? 'User must have supplier role to submit delivery evidence'
          : 'Supplier organization cannot submit evidence for this order');
      case 'orderNotFound':
        return orderNotFound(reply);
      case 'orderNotAccepted':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Order must be accepted before delivery evidence can be submitted',
            details: {
              orderStatus: result.orderStatus,
            },
          },
        });
    }
  });

  fastify.get<{
    Params: { orderId: string };
  }>('/orders/:orderId/delivery-evidence', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    if (!actorUserId(request) || !actorOrganizationId(request)) {
      return unauthorized(reply);
    }

    const result = await listDeliveryEvidence({
      orderId: request.params.orderId,
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
    }, {
      orderRepository: options.orderRepository,
      evidenceRepository: options.evidenceRepository,
    });

    switch (result.status) {
      case 'found':
        return reply.code(200).send({ data: { items: result.items } });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid delivery evidence request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply, 'User is not allowed to view delivery evidence for this order');
      case 'orderNotFound':
        return orderNotFound(reply);
    }
  });
};
