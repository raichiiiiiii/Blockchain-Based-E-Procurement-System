import type { FastifyRequest } from 'fastify';
import type { TrustedActorContext } from '../../../app/plugins/actor-context-plugin.js';

/**
 * Extracts authenticated actor context from a Fastify request
 * Provides a normalized interface for accessing actor identity attributes
 */
export function getRequestActorContext(request: FastifyRequest): {
  actorUserId: string | undefined;
  actorOrganizationId: string | undefined;
  actorRoleCodes: string[];
  authenticationSessionId: string | undefined;
  authenticationMethod: 'localPassword' | undefined;
} {
  const context = request.actorContext as TrustedActorContext | null;
  
  if (!context) {
    return {
      actorUserId: undefined,
      actorOrganizationId: undefined,
      actorRoleCodes: [],
      authenticationSessionId: undefined,
      authenticationMethod: undefined
    };
  }

  return {
    actorUserId: context.actorUserId,
    actorOrganizationId: context.actorOrganizationId,
    actorRoleCodes: context.actorRoleCodes,
    authenticationSessionId: context.authenticationSessionId,
    authenticationMethod: context.authenticationMethod
  };
}
