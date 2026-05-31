import type { FastifyPluginAsync } from 'fastify';
import type { PlatformUserCredentialRepository } from '../application/platform-user-credential-repository.js';
import type { AuthSessionRepository } from '../application/auth-session-repository.js';
import { LoginUserError, LoginUserService } from '../application/login-user.js';
import { LogoutUserError, LogoutUserService } from '../application/logout-user.js';
import { LocalPasswordAuthProvider } from '../application/local-password-auth-provider.js';
import { ExternalOidcAuthProvider } from '../application/external-oidc-auth-provider.js';
import { roleScopeMap } from '../application/auth-provider.js';
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
  const localPasswordProvider = new LocalPasswordAuthProvider(loginService);
  const externalOidcProvider = new ExternalOidcAuthProvider();

  const logoutService = new LogoutUserService(
    opts.sessionRepository
  );

  fastify.get('/auth/providers', async (_request, reply) => {
    return reply.status(200).send({
      data: {
        providers: [
          localPasswordProvider.status(),
          externalOidcProvider.status(),
        ],
        roleScopeMap,
        tokenModel: 'opaqueBearerSession',
        oidcReadiness: 'boundaryOnly',
      },
    });
  });

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
      const result = await localPasswordProvider.login({ username, password });

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

  fastify.post('/auth/oidc/callback', async (_request, reply) => {
    return reply.status(503).send({
      error: {
        code: 'EXTERNAL_SERVICE_ERROR',
        message: 'External OIDC provider is not configured',
        details: {
          provider: 'externalOidc',
          status: 'notConfigured',
          tokenModel: 'opaqueBearerSession',
        },
      },
    });
  });

  fastify.post('/auth/logout', async (request, reply) => {
    try {
      await logoutService.logout(request.headers.authorization);

      return reply.status(200).send({
        data: {
          loggedOut: true
        }
      });
    } catch (error) {
      if (error instanceof LogoutUserError) {
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
