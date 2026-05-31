import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { DeliveryEvidenceRepository } from '../application/delivery-evidence-repository.js';
import type { ProcurementInvoiceRepository } from '../application/invoice-repository.js';
import {
  approveInvoicePayment,
  getInvoice,
  listInvoicesForActor,
  submitInvoice,
  verifyInvoiceMatch,
  type InvoiceResult,
} from '../application/invoice-service.js';
import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';

export type InvoiceRoutesOptions = {
  invoiceRepository: ProcurementInvoiceRepository;
  orderRepository: ProcurementOrderRepository;
  deliveryEvidenceRepository: DeliveryEvidenceRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

function actorFromRequest(request: FastifyRequest) {
  return {
    actorUserId: request.actorContext?.actorUserId ?? request.actorContext?.userId,
    actorOrganizationId: request.actorContext?.actorOrganizationId,
    actorRoleCodes: request.actorContext?.actorRoleCodes ?? request.actorContext?.authorizationContext.roles ?? [],
  };
}

function sendInvoiceResult(reply: FastifyReply, result: InvoiceResult | { status: 'list'; invoices: unknown[] }) {
  switch (result.status) {
    case 'ok':
      return reply.code(200).send({ data: result.invoice });
    case 'list':
      return reply.code(200).send({ data: { items: result.invoices } });
    case 'invalidInput':
      return reply.code(400).send(createApplicationValidationError('Invalid invoice request', result.issues));
    case 'unauthorized':
      return reply.code(401).send({ error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    case 'forbidden':
      return reply.code(403).send({ error: { code: 'FORBIDDEN', message: 'Invoice action is not allowed', details: { reason: result.reason } } });
    case 'notFound':
      return reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Invoice or linked record was not found', details: { reason: result.reason } } });
    case 'conflict':
      return reply.code(409).send({ error: { code: 'CONFLICT', message: 'Invoice state conflict', details: { reason: result.reason } } });
  }
}

export const registerInvoiceRoutes: FastifyPluginAsync<InvoiceRoutesOptions> = async (
  fastify,
  options,
) => {
  const dependencies = {
    invoiceRepository: options.invoiceRepository,
    orderRepository: options.orderRepository,
    deliveryEvidenceRepository: options.deliveryEvidenceRepository,
    lifecycleEventRepository: options.lifecycleEventRepository,
  };

  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    await options.authenticatedPreHandler(request, reply);
  }

  fastify.post<{
    Body: {
      orderId?: string;
      deliveryEvidenceId?: string;
      amount?: string;
      tax?: string;
      currency?: string;
      invoiceReference?: string;
      invoiceHash?: string;
    };
  }>('/invoices', { preHandler: requireAuthenticated }, async (request, reply) => sendInvoiceResult(reply, await submitInvoice({
    ...actorFromRequest(request),
    orderId: request.body?.orderId,
    deliveryEvidenceId: request.body?.deliveryEvidenceId,
    amount: request.body?.amount,
    tax: request.body?.tax,
    currency: request.body?.currency,
    invoiceReference: request.body?.invoiceReference,
    invoiceHash: request.body?.invoiceHash,
    requestId: request.id,
  }, dependencies)));

  fastify.get('/invoices', { preHandler: requireAuthenticated }, async (request, reply) => sendInvoiceResult(reply, await listInvoicesForActor(
    actorFromRequest(request),
    { invoiceRepository: options.invoiceRepository },
  )));

  fastify.get<{ Params: { id: string } }>('/invoices/:id', { preHandler: requireAuthenticated }, async (request, reply) => sendInvoiceResult(reply, await getInvoice(
    request.params.id,
    actorFromRequest(request),
    { invoiceRepository: options.invoiceRepository },
  )));

  fastify.post<{ Params: { id: string } }>('/invoices/:id/verify-match', { preHandler: requireAuthenticated }, async (request, reply) => sendInvoiceResult(reply, await verifyInvoiceMatch(
    request.params.id,
    {
      ...actorFromRequest(request),
      requestId: request.id,
    },
    dependencies,
  )));

  fastify.post<{ Params: { id: string } }>('/invoices/:id/approve-payment', { preHandler: requireAuthenticated }, async (request, reply) => sendInvoiceResult(reply, await approveInvoicePayment(
    request.params.id,
    {
      ...actorFromRequest(request),
      requestId: request.id,
    },
    dependencies,
  )));
};
