import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { ProcurementEligibilityGateway } from '../application/procurement-eligibility-gateway.js';
import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import type { SourceToAwardRepository } from '../application/source-to-award-repository.js';
import {
  approveSourceToAwardRequisition,
  awardSourceToAwardRfq,
  createSourceToAwardRequisition,
  getSourceToAwardCase,
  issueSourceToAwardRfq,
  listSourceToAwardCases,
  submitSourceToAwardQuotation,
  type SourceToAwardResult,
} from '../application/source-to-award-service.js';

export type SourceToAwardRoutesOptions = {
  sourceToAwardRepository: SourceToAwardRepository;
  orderRepository: ProcurementOrderRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

function actorFromRequest(request: FastifyRequest) {
  return {
    actorUserId: request.actorContext?.actorUserId ?? request.actorContext?.userId,
    actorOrganizationId: request.actorContext?.actorOrganizationId,
    actorRoleCodes: request.actorContext?.actorRoleCodes ?? request.actorContext?.authorizationContext.roles ?? [],
  };
}

function sendResult(reply: FastifyReply, result: SourceToAwardResult) {
  switch (result.status) {
    case 'ok':
      return reply.code(result.order ? 201 : 200).send({
        data: {
          case: result.sourceCase,
          ...(result.order !== undefined && { order: result.order }),
        },
      });
    case 'list':
      return reply.code(200).send({ data: { items: result.sourceCases } });
    case 'invalidInput':
      return reply.code(400).send(createApplicationValidationError('Invalid source-to-award request', result.issues));
    case 'unauthorized':
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    case 'forbidden':
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Source-to-award action is not allowed', details: { reason: result.reason } } });
    case 'notFound':
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Source-to-award record was not found', details: { reason: result.reason } } });
    case 'conflict':
      return reply.code(409).send({ error: { code: 'CONFLICT', message: 'Source-to-award state conflict', details: { reason: result.reason } } });
  }
}

export const registerSourceToAwardRoutes: FastifyPluginAsync<SourceToAwardRoutesOptions> = async (
  fastify,
  options,
) => {
  const dependencies = {
    sourceToAwardRepository: options.sourceToAwardRepository,
    orderRepository: options.orderRepository,
    lifecycleEventRepository: options.lifecycleEventRepository,
    eligibilityGateway: options.eligibilityGateway,
  };

  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await options.authenticatedPreHandler(request, reply);
  }

  fastify.post<{
    Body: { title?: string; description?: string; estimatedAmount?: string; currency?: string };
  }>('/source-to-award/requisitions', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await createSourceToAwardRequisition({
    ...actorFromRequest(request),
    title: request.body?.title,
    description: request.body?.description,
    estimatedAmount: request.body?.estimatedAmount,
    currency: request.body?.currency,
    requestId: request.id,
  }, dependencies)));

  fastify.post<{
    Params: { id: string };
  }>('/source-to-award/requisitions/:id/approve', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await approveSourceToAwardRequisition({
    ...actorFromRequest(request),
    requisitionId: request.params.id,
    requestId: request.id,
  }, dependencies)));

  fastify.post<{
    Body: { requisitionId?: string; supplierOrganizationIds?: string[]; responseDeadline?: string };
  }>('/source-to-award/rfqs', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await issueSourceToAwardRfq({
    ...actorFromRequest(request),
    requisitionId: request.body?.requisitionId,
    supplierOrganizationIds: request.body?.supplierOrganizationIds,
    responseDeadline: request.body?.responseDeadline,
    requestId: request.id,
  }, dependencies)));

  fastify.post<{
    Params: { id: string };
    Body: { amount?: string; currency?: string; deliveryDays?: number; notes?: string };
  }>('/source-to-award/rfqs/:id/quotations', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await submitSourceToAwardQuotation({
    ...actorFromRequest(request),
    rfqId: request.params.id,
    amount: request.body?.amount,
    currency: request.body?.currency,
    deliveryDays: request.body?.deliveryDays,
    notes: request.body?.notes,
    requestId: request.id,
  }, dependencies)));

  fastify.post<{
    Params: { id: string };
    Body: { quotationId?: string; rationale?: string };
  }>('/source-to-award/rfqs/:id/award', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await awardSourceToAwardRfq({
    ...actorFromRequest(request),
    rfqId: request.params.id,
    quotationId: request.body?.quotationId,
    rationale: request.body?.rationale,
    requestId: request.id,
  }, dependencies)));

  fastify.get<{
    Params: { caseId: string };
  }>('/source-to-award/cases/:caseId', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await getSourceToAwardCase(
    request.params.caseId,
    actorFromRequest(request),
    { sourceToAwardRepository: options.sourceToAwardRepository },
  )));

  fastify.get('/source-to-award/cases', { preHandler: requireAuthenticated }, async (request, reply) => sendResult(reply, await listSourceToAwardCases(
    actorFromRequest(request),
    { sourceToAwardRepository: options.sourceToAwardRepository },
  )));
};
