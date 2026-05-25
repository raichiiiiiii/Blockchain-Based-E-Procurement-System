import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import { acknowledgeProcurementOrder } from '../application/acknowledge-procurement-order.js';
import { createProcurementOrder } from '../application/create-procurement-order.js';
import type { ProcurementEligibilityGateway } from '../application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import type { ProcurementOrder } from '../domain/procurement-order.js';

type ProcurementOrderRoutesOptions = {
  orderRepository: ProcurementOrderRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type CreateOrderBody = {
  supplierOrganizationId?: string;
  title?: string;
  description?: string;
  amount?: string;
  currency?: string;
};

type AcknowledgeOrderBody = {
  decision?: 'accept' | 'reject';
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

function hasRole(request: FastifyRequest, role: string): boolean {
  return actorRoleCodes(request).includes(role);
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

function canReadOrder(request: FastifyRequest, order: ProcurementOrder): boolean {
  if (hasRole(request, 'auditor') || hasRole(request, 'administrator')) {
    return true;
  }

  const organizationId = actorOrganizationId(request);
  if (!organizationId) {
    return false;
  }

  return (
    (hasRole(request, 'buyer') && order.buyerOrganizationId === organizationId) ||
    (hasRole(request, 'supplier') && order.supplierOrganizationId === organizationId)
  );
}

export const registerProcurementOrderRoutes: FastifyPluginAsync<ProcurementOrderRoutesOptions> = async (
  fastify,
  options,
) => {
  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    await options.authenticatedPreHandler(request, reply);
    return !reply.sent;
  }

  fastify.post<{ Body: CreateOrderBody }>('/orders', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    if (!actorUserId(request) || !actorOrganizationId(request)) {
      return unauthorized(reply);
    }

    const result = await createProcurementOrder({
      ...request.body,
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
      requestId: request.id,
    }, {
      orderRepository: options.orderRepository,
      lifecycleEventRepository: options.lifecycleEventRepository,
      eligibilityGateway: options.eligibilityGateway,
    });

    switch (result.status) {
      case 'created':
        return reply.code(201).send({ data: result.order });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid order request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply, 'User must have buyer role to create orders');
      case 'notEligible':
        return forbidden(reply, 'Organization is not eligible for procurement actions', {
          eligibility: result.eligibility.eligibility,
          memberOrganizationId: result.eligibility.memberOrganizationId,
          reasonCodes: result.eligibility.reasonCodes,
        });
    }
  });

  fastify.get('/orders', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const organizationId = actorOrganizationId(request);
    if (!actorUserId(request) || !organizationId) {
      return unauthorized(reply);
    }

    let orders: ProcurementOrder[];
    if (hasRole(request, 'buyer')) {
      orders = await options.orderRepository.listByBuyerOrganization(organizationId);
    } else if (hasRole(request, 'supplier')) {
      orders = await options.orderRepository.listBySupplierOrganization(organizationId);
    } else if (hasRole(request, 'auditor') || hasRole(request, 'administrator')) {
      orders = await options.orderRepository.listAll();
    } else {
      return forbidden(reply, 'User is not allowed to view orders');
    }

    return reply.code(200).send({
      data: {
        items: orders,
      },
    });
  });

  fastify.get<{ Params: { orderId: string } }>('/orders/:orderId', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const order = await options.orderRepository.findById(request.params.orderId);
    if (!order) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Order was not found',
        },
      });
    }

    if (!canReadOrder(request, order)) {
      return forbidden(reply, 'User is not allowed to view this order');
    }

    return reply.code(200).send({ data: order });
  });

  fastify.post<{ Params: { orderId: string }; Body: AcknowledgeOrderBody }>('/orders/:orderId/acknowledgement', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const result = await acknowledgeProcurementOrder({
      orderId: request.params.orderId,
      decision: request.body?.decision,
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
      requestId: request.id,
    }, {
      orderRepository: options.orderRepository,
      lifecycleEventRepository: options.lifecycleEventRepository,
    });

    switch (result.status) {
      case 'acknowledged':
        return reply.code(200).send({ data: result.order });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid order acknowledgement', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply, result.reason === 'supplierRoleRequired'
          ? 'User must have supplier role to acknowledge orders'
          : 'Supplier organization cannot acknowledge this order');
      case 'notFound':
        return reply.code(404).send({
          error: {
            code: 'NOT_FOUND',
            message: 'Order was not found',
          },
        });
      case 'conflict':
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Order has already been acknowledged',
          },
        });
    }
  });
};
