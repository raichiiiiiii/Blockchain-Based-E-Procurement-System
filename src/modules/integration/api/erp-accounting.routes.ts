import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { ProcurementContractRepository } from '../../contracts/application/contract-repository.js';
import type { PaymentInstructionRepository } from '../../payments/application/payment-instruction-repository.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { ErpAccountingPort } from '../application/erp-accounting-port.js';
import { exportErpArtifact, importErpArtifact, type ValidationIssue } from '../application/erp-accounting-service.js';
import type { ErpProfileType } from '../domain/erp-accounting.js';

export type ErpAccountingRoutesOptions = {
  adapter: ErpAccountingPort;
  orderRepository: ProcurementOrderRepository;
  paymentInstructionRepository: PaymentInstructionRepository;
  contractRepository: ProcurementContractRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply | unknown>;
};

type ExportBody = {
  profileType?: ErpProfileType;
  sourceId?: string;
};

type ImportBody = {
  profileType?: ErpProfileType;
  payload?: Record<string, unknown>;
};

const writeRoles = new Set(['administrator']);
const readRoles = new Set(['administrator', 'auditor', 'regulator', 'securityOperator']);

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

function forbidden(reply: FastifyReply, message: string) {
  return reply.code(403).send({
    error: {
      code: 'FORBIDDEN',
      message,
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

function unsupported(reply: FastifyReply) {
  return reply.code(400).send(createApplicationValidationError('Unsupported ERP mapping profile', [
    {
      path: 'profileType',
      message: 'profileType is not supported for this operation',
    },
  ]));
}

function validateJobId(jobId: string): ValidationIssue[] {
  return jobId.trim()
    ? []
    : [{ path: 'jobId', message: 'jobId is required' }];
}

export const registerErpAccountingRoutes: FastifyPluginAsync<ErpAccountingRoutesOptions> = async (
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

  fastify.post<{ Body: ExportBody }>('/integrations/erp/export', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, writeRoles)) {
      return forbidden(reply, 'User is not allowed to export ERP accounting artifacts');
    }

    const result = await exportErpArtifact({
      profileType: request.body?.profileType,
      sourceId: request.body?.sourceId,
      actorUserId: actorUserId(request),
      idempotencyKey: request.headers['idempotency-key']?.toString(),
    }, options);

    switch (result.status) {
      case 'completed':
        return reply.code(200).send({ data: result.job });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid ERP export request', result.issues));
      case 'notFound':
        return notFound(reply, 'ERP export source record was not found');
      case 'unsupportedProfile':
        return unsupported(reply);
    }
  });

  fastify.post<{ Body: ImportBody }>('/integrations/erp/import', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, writeRoles)) {
      return forbidden(reply, 'User is not allowed to import ERP accounting artifacts');
    }

    const result = await importErpArtifact({
      profileType: request.body?.profileType,
      payload: request.body?.payload,
      actorUserId: actorUserId(request),
      idempotencyKey: request.headers['idempotency-key']?.toString(),
    }, options);

    switch (result.status) {
      case 'completed':
        return reply.code(result.job.status === 'completed' ? 200 : 422).send({ data: result.job });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid ERP import request', result.issues));
      case 'notFound':
        return notFound(reply, 'ERP import source record was not found');
      case 'unsupportedProfile':
        return unsupported(reply);
    }
  });

  fastify.get<{ Params: { jobId: string } }>('/integrations/erp/jobs/:jobId', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, readRoles)) {
      return forbidden(reply, 'User is not allowed to inspect ERP accounting jobs');
    }

    const jobId = request.params.jobId.trim();
    const issues = validateJobId(jobId);
    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid ERP job request', issues));
    }

    const job = await options.adapter.getJob(jobId);
    if (!job) {
      return notFound(reply, 'ERP accounting job was not found');
    }

    return reply.code(200).send({ data: job });
  });
};
