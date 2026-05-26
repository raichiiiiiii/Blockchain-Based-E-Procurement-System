import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { EscrowRepository } from '../../escrow/application/escrow-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { PaymentInstructionRepository } from '../application/payment-instruction-repository.js';
import type { PaymentPort } from '../application/payment-port.js';
import {
  createPaymentInstruction,
  getPaymentInstruction,
  reconcilePaymentInstruction,
} from '../application/payment-instruction-service.js';
import type { PaymentAdapterName, PaymentInstructionStatus } from '../domain/payment-instruction.js';

export type PaymentRoutesOptions = {
  repository: PaymentInstructionRepository;
  escrowRepository: EscrowRepository;
  adapters: Record<PaymentAdapterName, PaymentPort>;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply>;
};

type CreatePaymentInstructionBody = {
  escrowId?: string;
  amount?: string;
  currency?: string;
  debtorOrganizationId?: string;
  creditorOrganizationId?: string;
  paymentReference?: string;
  adapterName?: PaymentAdapterName;
  sandboxStatus?: PaymentInstructionStatus;
};

type ReconcilePaymentInstructionBody = {
  status?: PaymentInstructionStatus;
};

function actorFromRequest(request: FastifyRequest) {
  return {
    actorUserId: request.actorContext?.actorUserId,
    actorOrganizationId: request.actorContext?.actorOrganizationId,
    actorRoleCodes: request.actorContext?.actorRoleCodes,
  };
}

function requestId(request: FastifyRequest): string {
  return String(request.headers['x-request-id'] ?? `req-payment-${Date.now()}`);
}

function sendPaymentResult(reply: FastifyReply, result: Awaited<ReturnType<typeof createPaymentInstruction>>) {
  switch (result.status) {
    case 'created':
      return reply.code(201).send({ data: result.instruction });
    case 'updated':
      return reply.code(200).send({ data: result.instruction });
    case 'invalidInput':
      return reply.code(400).send(createApplicationValidationError('Invalid payment instruction request', result.issues));
    case 'unauthorized':
      return reply.code(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authenticated actor is required',
        },
      });
    case 'forbidden':
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'User is not authorized for this payment instruction',
          details: { reason: result.reason },
        },
      });
    case 'notFound':
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Payment instruction or linked escrow was not found',
        },
      });
    case 'conflict':
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Payment instruction request conflicts with current state',
          details: { reason: result.reason },
        },
      });
  }
}

export const registerPaymentRoutes: FastifyPluginAsync<PaymentRoutesOptions> = async (
  fastify,
  options,
) => {
  if (options.authenticatedPreHandler) {
    fastify.addHook('preHandler', options.authenticatedPreHandler);
  }

  fastify.post<{ Body: CreatePaymentInstructionBody }>(
    '/payments/instructions',
    async (request, reply) => {
      const result = await createPaymentInstruction({
        ...actorFromRequest(request),
        escrowId: request.body?.escrowId,
        amount: request.body?.amount,
        currency: request.body?.currency,
        debtorOrganizationId: request.body?.debtorOrganizationId,
        creditorOrganizationId: request.body?.creditorOrganizationId,
        paymentReference: request.body?.paymentReference,
        adapterName: request.body?.adapterName,
        sandboxStatus: request.body?.sandboxStatus,
        requestId: requestId(request),
      }, {
        repository: options.repository,
        escrowRepository: options.escrowRepository,
        adapters: options.adapters,
        lifecycleEventRepository: options.lifecycleEventRepository,
      });

      return sendPaymentResult(reply, result);
    },
  );

  fastify.get<{ Params: { paymentInstructionId: string } }>(
    '/payments/instructions/:paymentInstructionId',
    async (request, reply) => {
      const result = await getPaymentInstruction(
        request.params.paymentInstructionId,
        actorFromRequest(request),
        { repository: options.repository },
      );

      return sendPaymentResult(reply, result);
    },
  );

  fastify.post<{
    Params: { paymentInstructionId: string };
    Body: ReconcilePaymentInstructionBody;
  }>(
    '/payments/instructions/:paymentInstructionId/reconcile',
    async (request, reply) => {
      const result = await reconcilePaymentInstruction({
        ...actorFromRequest(request),
        paymentInstructionId: request.params.paymentInstructionId,
        status: request.body?.status,
        requestId: requestId(request),
      }, {
        repository: options.repository,
        escrowRepository: options.escrowRepository,
        adapters: options.adapters,
        lifecycleEventRepository: options.lifecycleEventRepository,
      });

      return sendPaymentResult(reply, result);
    },
  );
};
