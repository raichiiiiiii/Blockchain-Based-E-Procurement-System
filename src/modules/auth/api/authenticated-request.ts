import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthSessionRepository } from '../application/auth-session-repository.js';
import { hashToken, isSessionExpired } from '../application/session-token.js';

// Define the trusted actor context shape as per AUTH_SESSION_CONTRACT.md
export interface TrustedActorContext {
  actorUserId: string;
  actorOrganizationId?: string;
  actorRoleCodes: string[];
  authenticationSessionId: string;
  authenticationMethod: 'localPassword';
  isAuthenticated: true;
}

// Augment Fastify request type
declare module 'fastify' {
  interface FastifyRequest {
    actorContext: TrustedActorContext | null;
  }
}

/**
 * Creates a preHandler middleware for validating authenticated requests
 * @param sessionRepository The repository to lookup sessions
 * @returns Fastify preHandler function
 */
export function createAuthenticatedRequestPreHandler(sessionRepository: AuthSessionRepository) {
  return async function(request: FastifyRequest, reply: FastifyReply) {
    // Get authorization header
    const authHeader = request.headers.authorization;
    
    // Check if authorization header exists
    if (!authHeader) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }
    
    // Check if it's a bearer token
    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header'
        }
      });
    }
    
    // Extract token
    const token = authHeader.substring(bearerPrefix.length);
    
    // Hash token for lookup
    const tokenHash = hashToken(token);
    
    // Find session
    const session = await sessionRepository.findByTokenHash(tokenHash);
    
    // Check if session exists
    if (!session) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session'
        }
      });
    }
    
    // Check session status
    if (session.status === 'revoked') {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session'
        }
      });
    }
    
    // Check if session is expired
    if (session.status === 'expired' || isSessionExpired(session.expiresAt)) {
      // Update session status to expired if it wasn't already marked
      if (session.status !== 'expired') {
        const updatedSession = {
          ...session,
          status: 'expired'
        };
        await sessionRepository.save(updatedSession);
      }
      
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session'
        }
      });
    }
    
    // Attach trusted actor context to request
    request.actorContext = {
      actorUserId: session.actorUserId,
      actorOrganizationId: session.actorOrganizationId,
      actorRoleCodes: session.actorRoleCodes,
      authenticationSessionId: session.sessionId,
      authenticationMethod: session.authenticationMethod,
      isAuthenticated: true
    };
  };
}
