import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

export interface TrustedActorContext {
  userId?: string;
  authorizationContext: {
    roles?: string[];
  };
  isAuthenticated: boolean;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId?: string;
  authenticationMethod?: 'localPassword';
}

declare module 'fastify' {
  interface FastifyRequest {
    actorContext: TrustedActorContext | null;
  }
}

const actorContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('actorContext', null);

  fastify.addHook('onRequest', async (request) => {
    if (request.actorContext) {
      return;
    }

    const rawActorId = request.headers['x-actor-id'];
    const rawActorRole = request.headers['x-actor-role'];

    let userId: string | undefined;
    if (typeof rawActorId === 'string' && rawActorId.trim()) {
      userId = rawActorId.trim();
    }

    let roles: string[] | undefined;
    if (typeof rawActorRole === 'string' && rawActorRole.trim()) {
      roles = rawActorRole.includes(',')
        ? rawActorRole.split(',').map((role) => role.trim()).filter(Boolean)
        : [rawActorRole.trim()];
    } else if (Array.isArray(rawActorRole)) {
      roles = rawActorRole.map((role) => String(role).trim()).filter(Boolean);
    }

    request.actorContext = {
      userId,
      authorizationContext: {
        roles
      },
      isAuthenticated: Boolean(userId),
      actorUserId: userId,
      actorRoleCodes: roles ?? [],
      authenticationSessionId: userId ? 'legacy-session' : undefined,
      authenticationMethod: userId ? 'localPassword' : undefined
    };
  });
};

export default fp(actorContextPlugin, {
  name: 'actor-context-plugin'
});