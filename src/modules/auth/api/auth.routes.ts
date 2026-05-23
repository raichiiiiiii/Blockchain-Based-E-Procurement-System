import type { FastifyPluginAsync } from 'fastify';
import type { PlatformUserCredentialRepository } from '../application/platform-user-credential-repository.js';
import type { AuthSessionRepository } from '../application/auth-session-repository.js';
import { LoginUserError, LoginUserService } from '../application/login-user.js';
import type { ValidationErrorEnvelope } from '../../shared/api/validation-error-helper.js';

interface AuthRoutesOptions {
  credentialRepository: PlatformUserCredentialRepository;
  sessionRepository: AuthSessionRepository;
}

function isValidationErrorEnvelope(error: unknown): error is ValidationErrorEnvelope {
  if (typeof error !== 'object' || error === null || !('error' in error)) {
    return false;
  }

  const candidate = error as { error?: { code?: unknown } };
  return candidate.error?.code === 'VALIDATION_ERROR';
}

const authRoutes: FastifyPluginAsync<AuthRoutesOptions> = async (fastify, opts) => {
  const loginService = new LoginUserService(
    opts.credentialRepository,
    opts.sessionRepository
  );

  fastify.post('/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['username', 'password'],
        properties: {
          username: { type: 'string' },
          password: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { username, password } = request.body as { username: string; password: string };
      const result = await loginService.login({ username, password });

      return reply.status(200).send({
        data: result
      });
    } catch (error) {
      if (isValidationErrorEnvelope(error)) {
        return reply.status(400).send(error);
      }

      if (error instanceof LoginUserError) {
        return reply.status(401).send({
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      request.log.error(error);
      return reply.status(500).send({
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An internal server error occurred'
        }
      });
    }
  });
};

export default authRoutes;