import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getRequestActorContext } from '../../auth/api/request-actor-context.js';
import type { OrganizationNetworkRepository } from '../../organization-network/application/organization-network-repository.js';
import type { DeliveryEvidenceRepository } from '../../procurement/application/delivery-evidence-repository.js';
import type { ProcurementInvoiceRepository } from '../../procurement/application/invoice-repository.js';
import type { ProcurementCloseoutRepository } from '../../procurement/application/procurement-closeout-repository.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import { CompanyProductivityService } from '../application/company-productivity-service.js';
import type { ProductivityStateRepository } from '../application/productivity-state-repository.js';

type ProductivityRoutesOptions = {
  organizationNetworkRepository: OrganizationNetworkRepository;
  stateRepository: ProductivityStateRepository;
  orderRepository?: ProcurementOrderRepository;
  deliveryEvidenceRepository?: DeliveryEvidenceRepository;
  invoiceRepository?: ProcurementInvoiceRepository;
  closeoutRepository?: ProcurementCloseoutRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type RequiredActorContext = {
  actorUserId: string;
  actorOrganizationId: string;
  actorRoleCodes: string[];
};

function hasAnyRole(actorRoles: readonly string[], allowedRoles: readonly string[]): boolean {
  return actorRoles.some(role => allowedRoles.includes(role));
}

function canViewProductivity(actorRoles: readonly string[]): boolean {
  return hasAnyRole(actorRoles, [
    'administrator',
    'organizationAdmin',
    'buyer',
    'supplier',
    'financier',
    'complianceReviewer',
    'auditor',
    'regulator',
    'securityOperator',
    'shariahReviewer',
  ]);
}

function actorOrUnauthorized(request: FastifyRequest, reply: FastifyReply): RequiredActorContext | null {
  const actor = getRequestActorContext(request);
  if (!actor.actorUserId || !actor.actorOrganizationId) {
    reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return null;
  }

  return {
    actorUserId: actor.actorUserId,
    actorOrganizationId: actor.actorOrganizationId,
    actorRoleCodes: actor.actorRoleCodes,
  };
}

function forbidden(reply: FastifyReply, message = 'Productivity access denied') {
  return reply.code(403).send({
    error: {
      code: 'FORBIDDEN',
      message,
    },
  });
}

function validationError(reply: FastifyReply, message: string) {
  return reply.code(400).send({
    error: {
      code: 'VALIDATION_ERROR',
      message,
      details: {
        issues: [{ path: 'name', message }],
      },
    },
  });
}

function requireProductivityActor(request: FastifyRequest, reply: FastifyReply): RequiredActorContext | null {
  const actor = actorOrUnauthorized(request, reply);
  if (!actor) {
    return null;
  }

  if (!canViewProductivity(actor.actorRoleCodes)) {
    forbidden(reply);
    return null;
  }

  return actor;
}

const productivityRoutes: FastifyPluginAsync<ProductivityRoutesOptions> = async (fastify, options) => {
  const service = new CompanyProductivityService(
    options.organizationNetworkRepository,
    options.stateRepository,
    {
      orderRepository: options.orderRepository,
      deliveryEvidenceRepository: options.deliveryEvidenceRepository,
      invoiceRepository: options.invoiceRepository,
      closeoutRepository: options.closeoutRepository,
    },
  );

  fastify.get(
    '/company-productivity/summary',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: await service.getSummary(actor) });
    },
  );

  fastify.get(
    '/company-productivity/money-tracker',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: await service.getMoneyTracker(actor) });
    },
  );

  fastify.get(
    '/company-productivity/pipeline',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.getPipeline(actor) } });
    },
  );

  fastify.get(
    '/company-productivity/action-inbox',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.getActionInbox(actor) } });
    },
  );

  fastify.get(
    '/productivity/tasks',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.getActionInbox(actor) } });
    },
  );

  fastify.patch<{ Params: { taskId: string } }>(
    '/company-productivity/action-inbox/:taskId',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: await service.completeTask(actor, request.params.taskId) });
    },
  );

  fastify.patch<{ Params: { taskId: string } }>(
    '/productivity/tasks/:taskId',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: await service.completeTask(actor, request.params.taskId) });
    },
  );

  fastify.get(
    '/company-productivity/supplier-scorecards',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.getSupplierScorecards(actor) } });
    },
  );

  fastify.get(
    '/company-productivity/evidence-checklist',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.getEvidenceChecklist(actor) } });
    },
  );

  fastify.get(
    '/company-productivity/saved-views',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.listSavedViews(actor) } });
    },
  );

  fastify.get(
    '/productivity/saved-views',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.listSavedViews(actor) } });
    },
  );

  fastify.post<{ Body: Record<string, unknown> }>(
    '/company-productivity/saved-views',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      try {
        return reply.code(201).send({ data: await service.createSavedView(actor, request.body) });
      } catch (error) {
        return validationError(reply, error instanceof Error ? error.message : 'Saved view is invalid');
      }
    },
  );

  fastify.post<{ Body: Record<string, unknown> }>(
    '/productivity/saved-views',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      try {
        return reply.code(201).send({ data: await service.createSavedView(actor, request.body) });
      } catch (error) {
        return validationError(reply, error instanceof Error ? error.message : 'Saved view is invalid');
      }
    },
  );

  fastify.post(
    '/company-ledger/exports',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(201).send({ data: await service.createCompanyLedgerExport(actor) });
    },
  );

  fastify.get(
    '/notifications',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = requireProductivityActor(request, reply);
      if (!actor) {
        return;
      }

      return reply.code(200).send({ data: { items: await service.listNotifications(actor) } });
    },
  );
};

export { productivityRoutes };
