import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import type { OperationalIncidentRepository } from '../application/operational-incident-repository.js';
import type { RuntimeReadiness } from '../application/runtime-readiness.js';
import { recordReadinessIncidents } from '../application/record-readiness-incidents.js';

export type OpsStatusRoutesOptions = {
  readiness: () => Promise<RuntimeReadiness>;
  operationalIncidentRepository: OperationalIncidentRepository;
  authenticatedPreHandler: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

const allowedOpsStatusRoles = new Set(['securityOperator', 'administrator', 'admin']);

function actorRoles(request: FastifyRequest): string[] {
  return request.actorContext?.actorRoleCodes ?? request.actorContext?.authorizationContext.roles ?? [];
}

function canReadOpsStatus(request: FastifyRequest): boolean {
  return request.actorContext?.isAuthenticated === true &&
    actorRoles(request).some(role => allowedOpsStatusRoles.has(role));
}

export const registerOpsStatusRoutes: FastifyPluginAsync<OpsStatusRoutesOptions> = async (
  fastify,
  options,
) => {
  fastify.get('/ops/status', {
    preHandler: async (request, reply) => {
      await options.authenticatedPreHandler(request, reply);
      if (reply.sent) {
        return;
      }

      if (!canReadOpsStatus(request)) {
        return reply.code(403).send({
          error: {
            code: 'FORBIDDEN',
            message: 'User must have security operator or administrator role to read operational status',
          },
        });
      }
    },
  }, async (_request, reply) => {
    const readiness = await options.readiness();
    await recordReadinessIncidents(readiness, options.operationalIncidentRepository);
    const incidents = await options.operationalIncidentRepository.list();

    return reply.code(200).send({
      data: {
        generatedAt: new Date().toISOString(),
        readiness,
        incidents: incidents
          .filter(incident => incident.status === 'open')
          .sort((left, right) => (
            right.occurredAt.localeCompare(left.occurredAt) ||
            left.incidentId.localeCompare(right.incidentId)
          )),
      },
    });
  });
};
