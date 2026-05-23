import fp from 'fastify-plugin';
import type { FastifyPluginAsync } from 'fastify';

// Define the trusted actor context shape
export interface TrustedActorContext {
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId: string;
  authenticationMethod: 'localPassword';
  isAuthenticated: true;
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
 * Handles both legacy header-based context (for testing) and new session-based context
 */
const actorContextPlugin: FastifyPluginAsync = async (fastify) => {
  fastify.decorateRequest('actorContext', null);

  fastify.addHook('onRequest', async (request) => {
    // If actorContext is already set by auth middleware, don't override it
    if (request.actorContext) {
      return;
    }

    // Legacy header-based context for testing purposes
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

    // Only set legacy context if we have a user ID
    if (userId) {
      request.actorContext = {
        actorUserId: userId,
        actorRoleCodes: roles || [],
        authenticationSessionId: 'legacy-session',
        authenticationMethod: 'localPassword',
        isAuthenticated: true
      };
    }
  });
};

export default fp(actorContextPlugin, {
  name: 'actor-context-plugin'
});
