import type { FastifyReply, FastifyRequest } from 'fastify';
import type { AuthSession } from '../domain/auth-session.js';
import type { AuthSessionRepository } from '../application/auth-session-repository.js';
import { hashToken, isSessionExpired } from '../application/session-token.js';

export function createAuthenticatedRequestPreHandler(sessionRepository: AuthSessionRepository) {
  return async function authenticatedRequestPreHandler(request: FastifyRequest, reply: FastifyReply) {
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    const bearerPrefix = 'Bearer ';
    if (!authHeader.startsWith(bearerPrefix)) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header'
        }
      });
    }

    const token = authHeader.substring(bearerPrefix.length);
    if (!token.trim()) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid authorization header'
        }
      });
    }

    const tokenHash = hashToken(token);
    const session = await sessionRepository.findByTokenHash(tokenHash);

    if (!session) {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session'
        }
      });
    }

    if (session.status === 'revoked') {
      return reply.status(401).send({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired session'
        }
      });
    }

    if (session.status === 'expired' || isSessionExpired(session.expiresAt)) {
      if (session.status !== 'expired') {
        const updatedSession: AuthSession = {
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

    request.actorContext = {
      userId: session.actorUserId,
      authorizationContext: {
        roles: session.actorRoleCodes
      },
      isAuthenticated: true,
      actorUserId: session.actorUserId,
      actorOrganizationId: session.actorOrganizationId,
      actorRoleCodes: session.actorRoleCodes,
      authenticationSessionId: session.sessionId,
      authenticationMethod: session.authenticationMethod
    };
  };
}