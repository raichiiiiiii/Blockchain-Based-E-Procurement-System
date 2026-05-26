import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { BlockchainAnchorMetadataRepository } from '../../blockchain/application/blockchain-anchor-metadata-repository.js';
import type { AccessAuditEventRepository } from '../../shared/application/access-audit-event-repository.js';
import { listSecurityAlerts } from '../application/security-alert-read-model.js';

export type SecurityAlertRoutesOptions = {
  accessAuditEventRepository?: AccessAuditEventRepository;
  blockchainAnchorMetadataRepository?: BlockchainAnchorMetadataRepository;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

const allowedSecurityAlertRoles = new Set(['securityOperator', 'administrator', 'admin']);

function actorRoles(request: FastifyRequest): string[] {
  return request.actorContext?.actorRoleCodes ?? request.actorContext?.authorizationContext.roles ?? [];
}

function canReadSecurityAlerts(request: FastifyRequest): boolean {
  return request.actorContext?.isAuthenticated === true &&
    actorRoles(request).some(role => allowedSecurityAlertRoles.has(role));
}

export const registerSecurityAlertRoutes: FastifyPluginAsync<SecurityAlertRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.get('/security/alerts', {
    preHandler: async (request, reply) => {
      await options.authenticatedPreHandler(request, reply);
      if (reply.sent) {
        return;
      }

      if (!canReadSecurityAlerts(request)) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User must have security operator or administrator role to read security alerts',
          },
        });
      }
    },
  }, async (_request, reply) => {
    const summary = await listSecurityAlerts({
      accessAuditEventRepository: options.accessAuditEventRepository,
      blockchainAnchorMetadataRepository: options.blockchainAnchorMetadataRepository,
    });

    return reply.code(200).send({
      data: summary,
    });
  });
};
