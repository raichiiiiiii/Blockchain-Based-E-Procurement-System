import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { ProcurementContractRepository } from '../application/contract-repository.js';
import {
  acceptContractTerms,
  createProcurementContract,
  getProcurementContract,
  listProcurementContracts,
  submitContractOffer,
  type AcceptContractInput,
  type CreateContractInput,
  type SubmitContractOfferInput,
} from '../application/contract-service.js';
import type { ContractAcceptanceParty, MachineReadableTerms } from '../domain/procurement-contract.js';

type ContractRoutesOptions = {
  repository: ProcurementContractRepository;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type CreateContractBody = {
  contractNumber?: string;
  buyerOrganizationId?: string;
  supplierOrganizationId?: string;
  financierOrganizationId?: string;
  humanReadableDocumentId?: string;
  machineReadableTerms?: Partial<MachineReadableTerms>;
  effectiveAt?: string;
  expiresAt?: string;
};

type OfferBody = {
  proposedTerms?: Partial<MachineReadableTerms>;
  comment?: string;
};

type AcceptanceBody = {
  acceptedBy?: ContractAcceptanceParty;
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

function actorInput(request: FastifyRequest) {
  return {
    actorUserId: actorUserId(request),
    actorOrganizationId: actorOrganizationId(request),
    actorRoleCodes: actorRoleCodes(request),
  };
}

function unauthorized(reply: FastifyReply) {
  return reply.code(401).send({
    error: {
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    },
  });
}

function forbidden(reply: FastifyReply) {
  return reply.code(403).send({
    error: {
      code: 'FORBIDDEN',
      message: 'User is not allowed to access this contract resource',
    },
  });
}

function notFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: 'Contract was not found',
    },
  });
}

function conflict(reply: FastifyReply, message: string) {
  return reply.code(409).send({
    error: {
      code: 'CONFLICT',
      message,
    },
  });
}

export const registerContractRoutes: FastifyPluginAsync<ContractRoutesOptions> = async (fastify, options) => {
  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    await options.authenticatedPreHandler(request, reply);
    return !reply.sent;
  }

  fastify.get('/contracts', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const result = await listProcurementContracts(actorInput(request), {
      repository: options.repository,
    });

    switch (result.status) {
      case 'listed':
        return reply.code(200).send({ data: { items: result.contracts } });
      case 'unauthorized':
        return unauthorized(reply);
    }
  });

  fastify.post<{ Body: CreateContractBody }>('/contracts', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const input: CreateContractInput = {
      ...actorInput(request),
      ...request.body,
    };
    const result = await createProcurementContract(input, {
      repository: options.repository,
    });

    switch (result.status) {
      case 'created':
        return reply.code(201).send({ data: result.contract });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid contract request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
    }
  });

  fastify.get<{ Params: { contractId: string } }>('/contracts/:contractId', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const result = await getProcurementContract({
      ...actorInput(request),
      contractId: request.params.contractId,
    }, {
      repository: options.repository,
    });

    switch (result.status) {
      case 'found':
        return reply.code(200).send({ data: result.contract });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid contract request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
      case 'notFound':
        return notFound(reply);
    }
  });

  fastify.post<{
    Params: { contractId: string };
    Body: OfferBody;
  }>('/contracts/:contractId/offers', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const input: SubmitContractOfferInput = {
      ...actorInput(request),
      contractId: request.params.contractId,
      proposedTerms: request.body?.proposedTerms,
      comment: request.body?.comment,
    };
    const result = await submitContractOffer(input, {
      repository: options.repository,
    });

    switch (result.status) {
      case 'submitted':
        return reply.code(201).send({ data: result.contract });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid contract offer request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
      case 'notFound':
        return notFound(reply);
    }
  });

  fastify.post<{
    Params: { contractId: string };
    Body: AcceptanceBody;
  }>('/contracts/:contractId/acceptance', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const input: AcceptContractInput = {
      ...actorInput(request),
      contractId: request.params.contractId,
      acceptedBy: request.body?.acceptedBy,
    };
    const result = await acceptContractTerms(input, {
      repository: options.repository,
    });

    switch (result.status) {
      case 'accepted':
        return reply.code(200).send({ data: result.contract });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid contract acceptance request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
      case 'notFound':
        return notFound(reply);
      case 'alreadyAccepted':
        return conflict(reply, 'Contract terms were already accepted for this party and version');
    }
  });
};
