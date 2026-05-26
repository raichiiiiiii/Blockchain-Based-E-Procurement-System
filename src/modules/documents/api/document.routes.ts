import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { createApplicationValidationError } from '../../shared/api/validation-error-helper.js';
import type { DocumentRepository } from '../application/document-repository.js';
import type { DocumentStoragePort } from '../application/document-storage-port.js';
import type { DocumentTextExtractionPort } from '../application/document-text-extraction-port.js';
import type { SignatureVerificationPort } from '../application/signature-verification-port.js';
import { getDocument } from '../application/get-document.js';
import { getDocumentExtraction } from '../application/get-document-extraction.js';
import { uploadDocument } from '../application/upload-document.js';
import type { DocumentSignatureInput } from '../domain/document.js';

type DocumentRoutesOptions = {
  repository: DocumentRepository;
  storage: DocumentStoragePort;
  extractor: DocumentTextExtractionPort;
  signatureVerifier: SignatureVerificationPort;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type UploadDocumentBody = {
  documentType?: string;
  filename?: string;
  mimeType?: string;
  contentBase64?: string;
  textContent?: string;
  signature?: DocumentSignatureInput;
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
      message: 'User is not allowed to access this document resource',
    },
  });
}

function notFound(reply: FastifyReply) {
  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message: 'Document was not found',
    },
  });
}

function routeInput(request: FastifyRequest, documentId?: string) {
  return {
    documentId,
    actorUserId: actorUserId(request),
    actorOrganizationId: actorOrganizationId(request),
    actorRoleCodes: actorRoleCodes(request),
  };
}

export const registerDocumentRoutes: FastifyPluginAsync<DocumentRoutesOptions> = async (fastify, options) => {
  async function requireAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    await options.authenticatedPreHandler(request, reply);
    return !reply.sent;
  }

  fastify.post<{ Body: UploadDocumentBody }>('/documents', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const result = await uploadDocument({
      ...request.body,
      actorUserId: actorUserId(request),
      actorOrganizationId: actorOrganizationId(request),
      actorRoleCodes: actorRoleCodes(request),
    }, {
      repository: options.repository,
      storage: options.storage,
      extractor: options.extractor,
      signatureVerifier: options.signatureVerifier,
    });

    switch (result.status) {
      case 'uploaded':
        return reply.code(201).send({ data: result.document });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid document upload request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
    }
  });

  fastify.get<{ Params: { documentId: string } }>('/documents/:documentId', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const result = await getDocument(routeInput(request, request.params.documentId), {
      repository: options.repository,
    });

    switch (result.status) {
      case 'found':
        return reply.code(200).send({ data: result.document });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid document request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
      case 'notFound':
        return notFound(reply);
    }
  });

  fastify.get<{ Params: { documentId: string } }>('/documents/:documentId/extraction', {
    preHandler: async (request, reply) => {
      await requireAuthenticated(request, reply);
    },
  }, async (request, reply) => {
    const result = await getDocumentExtraction(routeInput(request, request.params.documentId), {
      repository: options.repository,
    });

    switch (result.status) {
      case 'found':
        return reply.code(200).send({ data: result.extraction });
      case 'invalidInput':
        return reply.code(400).send(createApplicationValidationError('Invalid document extraction request', result.issues));
      case 'unauthorized':
        return unauthorized(reply);
      case 'forbidden':
        return forbidden(reply);
      case 'notFound':
        return notFound(reply);
    }
  });
};
