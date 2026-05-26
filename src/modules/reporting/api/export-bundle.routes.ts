import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import type { ProcureToPayLifecycleEventRepository } from '../../procurement/application/procure-to-pay-lifecycle-event-repository.js';
import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { ExportBundleRepository } from '../application/export-bundle-repository.js';
import type { ExportSigningPort } from '../application/export-signing-port.js';
import {
  allowedExportBundleScopes,
  createExportBundle,
  verifyExportBundle,
} from '../application/export-bundle-service.js';
import {
  getExportBundleSignature,
  signExportBundleManifest,
  verifyExportBundleSignature,
} from '../application/export-signing-service.js';
import type { ExportBundleScope } from '../domain/export-bundle.js';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';

export type ExportBundleRoutesOptions = {
  repository: ExportBundleRepository;
  accessAuditEventRepository?: AccessAuditEventRepository;
  lifecycleEventRepository?: ProcureToPayLifecycleEventRepository;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  signingPort?: ExportSigningPort;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<void | FastifyReply>;
};

type CreateExportBundleBody = {
  scope?: string;
  purpose?: string;
  occurredFrom?: string;
  occurredTo?: string;
};

type VerifyExportBundleBody = {
  bundleHash?: string;
};

type VerifyExportBundleSignatureBody = {
  manifestHash?: string;
};

type ValidationIssue = {
  path: string;
  message: string;
};

const allowedExporterRoles = new Set(['regulator', 'auditor']);

function hasExportAccess(request: FastifyRequest): boolean {
  const actorContext = request.actorContext;
  if (!actorContext?.isAuthenticated) {
    return false;
  }

  return actorContext.actorRoleCodes.some(role => allowedExporterRoles.has(role));
}

function validateDateRange(
  occurredFrom: string | undefined,
  occurredTo: string | undefined,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (occurredFrom && Number.isNaN(Date.parse(occurredFrom))) {
    issues.push({
      path: 'occurredFrom',
      message: 'occurredFrom must be an ISO 8601 timestamp',
    });
  }

  if (occurredTo && Number.isNaN(Date.parse(occurredTo))) {
    issues.push({
      path: 'occurredTo',
      message: 'occurredTo must be an ISO 8601 timestamp',
    });
  }

  if (
    occurredFrom &&
    occurredTo &&
    !Number.isNaN(Date.parse(occurredFrom)) &&
    !Number.isNaN(Date.parse(occurredTo)) &&
    new Date(occurredFrom) > new Date(occurredTo)
  ) {
    issues.push({
      path: 'occurredFrom',
      message: 'occurredFrom must be less than or equal to occurredTo',
    });
  }

  return issues;
}

function validateCreateBody(body: CreateExportBundleBody | undefined): {
  issues: ValidationIssue[];
  scope?: ExportBundleScope;
} {
  const issues: ValidationIssue[] = [];
  const scope = body?.scope;
  const purpose = body?.purpose;

  if (!scope || !allowedExportBundleScopes.includes(scope as ExportBundleScope)) {
    issues.push({
      path: 'scope',
      message: `scope must be one of: ${allowedExportBundleScopes.join(', ')}`,
    });
  }

  if (typeof purpose !== 'string' || purpose.trim().length === 0) {
    issues.push({
      path: 'purpose',
      message: 'purpose is required and cannot be blank',
    });
  }

  issues.push(...validateDateRange(body?.occurredFrom, body?.occurredTo));

  return {
    issues,
    scope: allowedExportBundleScopes.includes(scope as ExportBundleScope)
      ? scope as ExportBundleScope
      : undefined,
  };
}

function validateBundleId(bundleId: string | undefined): ValidationIssue[] {
  if (!bundleId || bundleId.trim().length === 0) {
    return [{
      path: 'bundleId',
      message: 'bundleId is required and cannot be blank',
    }];
  }

  return [];
}

function validateVerifyBody(body: VerifyExportBundleBody | undefined): ValidationIssue[] {
  if (body?.bundleHash !== undefined && body.bundleHash.trim().length === 0) {
    return [{
      path: 'bundleHash',
      message: 'bundleHash cannot be blank when provided',
    }];
  }

  return [];
}

function validateVerifySignatureBody(body: VerifyExportBundleSignatureBody | undefined): ValidationIssue[] {
  if (body?.manifestHash !== undefined && body.manifestHash.trim().length === 0) {
    return [{
      path: 'manifestHash',
      message: 'manifestHash cannot be blank when provided',
    }];
  }

  return [];
}

function sendSignatureResult(reply: FastifyReply, result: Awaited<ReturnType<typeof signExportBundleManifest>>) {
  switch (result.status) {
    case 'signed':
      return reply.code(200).send({ data: result.signature });
    case 'verified':
      return reply.code(200).send({ data: result.verification });
    case 'notFound':
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Export bundle not found',
        },
      });
    case 'signatureNotFound':
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Export bundle signature not found',
        },
      });
    case 'rejected':
      return reply.code(409).send({
        error: {
          code: 'CONFLICT',
          message: 'Export bundle signature request conflicts with signing profile state',
          details: { reason: result.reason },
        },
      });
  }
}

export const registerExportBundleRoutes: FastifyPluginAsync<ExportBundleRoutesOptions> = async (
  fastify,
  options,
) => {
  if (options.authenticatedPreHandler) {
    fastify.addHook('preHandler', options.authenticatedPreHandler);
  }

  fastify.addHook('preHandler', async (request, reply) => {
    if (!hasExportAccess(request)) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'User must have regulator or auditor role to access export bundles',
        },
      });
    }
  });

  fastify.post<{
    Body: CreateExportBundleBody;
  }>('/export-bundles', async (request, reply) => {
    const validation = validateCreateBody(request.body);
    if (validation.issues.length > 0 || !validation.scope) {
      return reply.code(400).send(createApplicationValidationError('Invalid export bundle request', validation.issues));
    }

    const actorUserId = request.actorContext?.actorUserId;
    if (!actorUserId) {
      return reply.code(403).send({
        error: {
          code: 'FORBIDDEN',
          message: 'Authenticated actor is required to create export bundles',
        },
      });
    }

    const bundle = await createExportBundle({
      scope: validation.scope,
      purpose: request.body.purpose!.trim(),
      requestedByUserId: actorUserId,
      occurredFrom: request.body.occurredFrom,
      occurredTo: request.body.occurredTo,
    }, {
      repository: options.repository,
      accessAuditEventRepository: options.accessAuditEventRepository,
      lifecycleEventRepository: options.lifecycleEventRepository,
      blockchainAnchorMetadataRepository: options.blockchainAnchorMetadataRepository,
    });

    return reply.code(201).send({
      data: bundle,
    });
  });

  fastify.get<{
    Params: {
      bundleId: string;
    };
  }>('/export-bundles/:bundleId', async (request, reply) => {
    const bundleId = request.params.bundleId.trim();
    const issues = validateBundleId(bundleId);
    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid export bundle request', issues));
    }

    const bundle = await options.repository.findById(bundleId);
    if (!bundle) {
      return reply.code(404).send({
        error: {
          code: 'NOT_FOUND',
          message: 'Export bundle not found',
        },
      });
    }

    return reply.code(200).send({
      data: bundle,
    });
  });

  fastify.post<{
    Params: {
      bundleId: string;
    };
    Body: VerifyExportBundleBody;
  }>('/export-bundles/:bundleId/verify', async (request, reply) => {
    const bundleId = request.params.bundleId.trim();
    const issues = [
      ...validateBundleId(bundleId),
      ...validateVerifyBody(request.body),
    ];

    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid export bundle verification request', issues));
    }

    const verification = await verifyExportBundle(
      options.repository,
      bundleId,
      request.body?.bundleHash,
    );

    return reply.code(200).send({
      data: verification,
    });
  });

  fastify.post<{
    Params: {
      bundleId: string;
    };
  }>('/export-bundles/:bundleId/sign', async (request, reply) => {
    const bundleId = request.params.bundleId.trim();
    const issues = validateBundleId(bundleId);
    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid export bundle signing request', issues));
    }

    if (!options.signingPort) {
      return reply.code(503).send({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Export signing service is unavailable',
        },
      });
    }

    return sendSignatureResult(
      reply,
      await signExportBundleManifest(bundleId, {
        repository: options.repository,
        signingPort: options.signingPort,
      }),
    );
  });

  fastify.get<{
    Params: {
      bundleId: string;
    };
  }>('/export-bundles/:bundleId/signature', async (request, reply) => {
    const bundleId = request.params.bundleId.trim();
    const issues = validateBundleId(bundleId);
    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid export bundle signature request', issues));
    }

    return sendSignatureResult(
      reply,
      await getExportBundleSignature(bundleId, {
        repository: options.repository,
      }),
    );
  });

  fastify.post<{
    Params: {
      bundleId: string;
    };
    Body: VerifyExportBundleSignatureBody;
  }>('/export-bundles/:bundleId/verify-signature', async (request, reply) => {
    const bundleId = request.params.bundleId.trim();
    const issues = [
      ...validateBundleId(bundleId),
      ...validateVerifySignatureBody(request.body),
    ];

    if (issues.length > 0) {
      return reply.code(400).send(createApplicationValidationError('Invalid export bundle signature verification request', issues));
    }

    if (!options.signingPort) {
      return reply.code(503).send({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Export signing service is unavailable',
        },
      });
    }

    return sendSignatureResult(
      reply,
      await verifyExportBundleSignature(
        bundleId,
        request.body?.manifestHash,
        {
          repository: options.repository,
          signingPort: options.signingPort,
        },
      ),
    );
  });
};
