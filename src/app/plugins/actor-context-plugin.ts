import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

// Define the trusted actor context shape
export interface TrustedActorContext {
  userId?: string;
  authorizationContext: {
    roles?: string[];
  };
  isAuthenticated: boolean;
}

// Keep the Fastify request augmentation here so ts-node/esm sees it
declare module 'fastify' {
  interface FastifyRequest {
    actorContext: TrustedActorContext | null;
  }
}

/**
 * Actor Context Plugin
 *
 * Transitional scaffolding only:
 * currently seeds trusted request context from x-actor-* headers.
 * This must later be replaced by server-derived auth context.
 */
const actorContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('actorContext', null);

  fastify.addHook('onRequest', async (request) => {
    const rawActorId = request.headers['x-actor-id'];
    const rawActorRole = request.headers['x-actor-role'];

    let userId: string | undefined;
    if (typeof rawActorId === 'string' && rawActorId.trim()) {
      userId = rawActorId.trim();
    }

    let roles: string[] | undefined;
    if (typeof rawActorRole === 'string' && rawActorRole.trim()) {
      roles = rawActorRole.includes(',')
        ? rawActorRole.split(',').map((r) => r.trim()).filter(Boolean)
        : [rawActorRole.trim()];
    } else if (Array.isArray(rawActorRole)) {
      roles = rawActorRole.map((r) => String(r).trim()).filter(Boolean);
    }

    request.actorContext = {
      userId,
      authorizationContext: { roles },
      isAuthenticated: !!userId
    };
  });
};

export default fp(actorContextPlugin, {
  name: 'actor-context-plugin'
});