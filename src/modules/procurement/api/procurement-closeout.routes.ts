import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { DeliveryEvidenceRepository } from '../application/delivery-evidence-repository.js';
import type { ProcurementCloseoutRepository } from '../application/procurement-closeout-repository.js';
import {
  closeProcurementCase,
  getProcurementCaseSummary,
  getSupplierPerformance,
  type ProcurementCloseoutResult,
} from '../application/procurement-closeout-service.js';
import type { ProcurementInvoiceRepository } from '../application/invoice-repository.js';
import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import type { SourceToAwardRepository } from '../application/source-to-award-repository.js';

export type ProcurementCloseoutRoutesOptions = {
  orderRepository: ProcurementOrderRepository;
  deliveryEvidenceRepository: DeliveryEvidenceRepository;
  invoiceRepository: ProcurementInvoiceRepository;
  closeoutRepository: ProcurementCloseoutRepository;
  sourceToAwardRepository?: SourceToAwardRepository;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

function actorFromRequest(request: FastifyRequest) {
  return {
    actorUserId: request.actorContext?.actorUserId ?? request.actorContext?.userId,
    actorOrganizationId: request.actorContext?.actorOrganizationId,
    actorRoleCodes: request.actorContext?.actorRoleCodes ?? request.actorContext?.authorizationContext.roles ?? [],
  };
}

function sendResult(reply: FastifyReply, result: ProcurementCloseoutResult) {
  switch (result.status) {
    case 'ok':
      return reply.code(200).send({ data: result.closeout ?? result.summary ?? result.performance });
    case 'list':
      return reply.code(200).send({ data: { items: result.performance } });
    case 'unauthorized':
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    case 'forbidden':
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Procurement case action is not allowed', details: { reason: result.reason } } });
    case 'notFound':
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Procurement case record was not found', details: { reason: result.reason } } });
    case 'conflict':
      return reply.code(409).send({ error: { code: 'CONFLICT', message: 'Procurement case state conflict', details: { reason: result.reason } } });
  }
}

export const registerProcurementCloseoutRoutes: FastifyPluginAsync<ProcurementCloseoutRoutesOptions> = async (
  fastify,
  options,
) => {
  const dependencies = {
    orderRepository: options.orderRepository,
    deliveryEvidenceRepository: options.deliveryEvidenceRepository,
    invoiceRepository: options.invoiceRepository,
    closeoutRepository: options.closeoutRepository,
    sourceToAwardRepository: options.sourceToAwardRepository,
  };

  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await options.authenticatedPreHandler(request, reply);
  }

  fastify.post<{
    Params: { caseId: string };
    Body: { notes?: string };
  }>('/procurement-cases/:caseId/closeout', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await closeProcurementCase(
    request.params.caseId,
    {
      ...actorFromRequest(request),
      notes: request.body?.notes,
    },
    dependencies,
  )));

  fastify.get<{ Params: { caseId: string } }>('/procurement-cases/:caseId/summary', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await getProcurementCaseSummary(
    request.params.caseId,
    actorFromRequest(request),
    dependencies,
  )));

  fastify.get<{ Params: { supplierOrganizationId: string } }>('/suppliers/:supplierOrganizationId/performance', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await getSupplierPerformance(
    request.params.supplierOrganizationId,
    actorFromRequest(request),
    dependencies,
  )));
};
