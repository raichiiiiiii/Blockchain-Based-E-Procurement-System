import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { ShariahCertificateRepository } from '../application/shariah-certificate-repository.js';
import {
  registerShariahCertificate,
  revokeShariahCertificate,
  type RegisterShariahCertificateInput,
} from '../application/shariah-certificate-service.js';

export type ShariahCertificateRoutesOptions = {
  repository: ShariahCertificateRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply | unknown>;
};

type RegisterBody = Omit<RegisterShariahCertificateInput, 'createdByUserId'>;

type RevokeBody = {
  reason?: string;
};

const readRoles = new Set(['administrator', 'shariahReviewer', 'financier', 'auditor', 'regulator']);
const writeRoles = new Set(['administrator', 'shariahReviewer']);

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

function validateCertificateId(certificateId: string): { path: string; message: string }[] {
  return certificateId.trim()
    ? []
    : [{ path: 'certificateId', message: 'certificateId is required' }];
}

export const registerShariahCertificateRoutes: FastifyPluginAsync<ShariahCertificateRoutesOptions> = async (
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

  fastify.get('/shariah/certificates', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, readRoles)) {
      return forbidden(reply, 'User is not allowed to view Shariah certificate artifacts');
    }

    return reply.code(200).send({
      data: {
        items: await options.repository.list(),
      },
    });
  });

  fastify.post<{ Body: RegisterBody }>('/shariah/certificates', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, writeRoles)) {
      return forbidden(reply, 'User must have Shariah governance access to register certificate artifacts');
    }

    const result = await registerShariahCertificate({
      ...request.body,
      createdByUserId: actorUserId(request),
    }, {
      repository: options.repository,
    });

    if (result.status === 'invalidInput') {
      return reply.code(400).send(createApplicationValidationError('Invalid Shariah certificate request', result.issues));
    }

    return reply.code(201).send({ data: result.certificate });
  });

  fastify.get<{ Params: { certificateId: string } }>('/shariah/certificates/:certificateId', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, readRoles)) {
      return forbidden(reply, 'User is not allowed to view Shariah certificate artifacts');
    }

    const certificateId = request.params.certificateId.trim();
    const issues = validateCertificateId(certificateId);
    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid Shariah certificate request', issues));
    }

    const certificate = await options.repository.findById(certificateId);
    if (!certificate) {
      return notFound(reply, 'Shariah certificate artifact was not found');
    }

    return reply.code(200).send({ data: certificate });
  });

  fastify.post<{
    Params: { certificateId: string };
    Body: RevokeBody;
  }>('/shariah/certificates/:certificateId/revoke', async (request, reply) => {
    const authenticated = await requireAuthenticated(request, reply);
    if (!authenticated) {
      return reply.sent ? reply : unauthorized(reply);
    }

    if (!hasAnyRole(request, writeRoles)) {
      return forbidden(reply, 'User must have Shariah governance access to revoke certificate artifacts');
    }

    const certificateId = request.params.certificateId.trim();
    const issues = validateCertificateId(certificateId);
    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid Shariah certificate revoke request', issues));
    }

    const result = await revokeShariahCertificate(certificateId, request.body?.reason, {
      repository: options.repository,
    });

    switch (result.status) {
      case 'revoked':
      case 'alreadyRevoked':
        return reply.code(200).send({ data: result.certificate });
      case 'notFound':
        return notFound(reply, 'Shariah certificate artifact was not found');
    }
  });
};
