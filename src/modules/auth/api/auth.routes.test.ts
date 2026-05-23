import { beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash, randomBytes } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { createTestableServer } from '../../../app/server.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import { InMemoryPlatformUserCredentialRepository } from '../infrastructure/in-memory-platform-user-credential-repository.js';
import type { AuthSession } from '../domain/auth-session.js';
import { hashToken } from '../application/session-token.js';

type ErrorEnvelope = {
  error?: {
    code?: string;
    message?: string;
  };
};

type LoginSuccessEnvelope = {
  data?: {
    sessionToken?: string;
    sessionId?: string;
    expiresAt?: string;
    actor?: {
      actorUserId?: string;
      authenticationSessionId?: string;
      authenticationMethod?: string;
    };
  };
};

type LogoutSuccessEnvelope = {
  data?: {
    loggedOut?: boolean;
  };
};

function createTestSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    sessionId: `session_${randomBytes(16).toString('hex')}`,
    tokenHash: hashToken(randomBytes(32).toString('hex')),
    actorUserId: 'user123',
    actorOrganizationId: undefined,
    actorRoleCodes: [],
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
    ...overrides
  };
}

describe('Auth Routes', () => {
  let server: FastifyInstance;
  let credentialRepository: InMemoryPlatformUserCredentialRepository;
  let sessionRepository: InMemoryAuthSessionRepository;

  beforeEach(async () => {
    credentialRepository = new InMemoryPlatformUserCredentialRepository();
    sessionRepository = new InMemoryAuthSessionRepository();

    const testCredential: PlatformUserCredential = {
      userId: 'user123',
      username: 'testuser',
      passwordHash: createHash('sha256').update('testpassword').digest('hex'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await credentialRepository.save(testCredential);

    server = createTestableServer({
      credentialRepository,
      sessionRepository
    });
  });

  it('returns HTTP 200 with session data for valid credentials', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'testuser',
        password: 'testpassword'
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<LoginSuccessEnvelope>();

    assert.ok(body.data?.sessionToken);
    assert.ok(body.data?.sessionId);
    assert.ok(body.data?.expiresAt);
    assert.equal(body.data?.actor?.actorUserId, 'user123');
    assert.equal(body.data?.actor?.authenticationSessionId, body.data?.sessionId);
    assert.equal(body.data?.actor?.authenticationMethod, 'localPassword');
  });

  it('returns HTTP 400 with VALIDATION_ERROR for blank username', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: '',
        password: 'testpassword'
      }
    });

    assert.equal(response.statusCode, 400);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('returns HTTP 400 with VALIDATION_ERROR for blank password', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'testuser',
        password: ''
      }
    });

    assert.equal(response.statusCode, 400);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'VALIDATION_ERROR');
  });

  it('returns HTTP 401 with UNAUTHORIZED for invalid credentials', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'testuser',
        password: 'wrongpassword'
      }
    });

    assert.equal(response.statusCode, 401);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
    assert.equal(body.error?.message, 'Invalid username or password');
  });

  it('trims username before lookup', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: '  testuser  ',
        password: 'testpassword'
      }
    });

    assert.equal(response.statusCode, 200);
    const body = response.json<LoginSuccessEnvelope>();
    assert.ok(body.data?.sessionToken);
  });

  it('returns HTTP 200 with loggedOut true for valid logout', async () => {
    // First login to get a session
    const loginResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/login',
      payload: {
        username: 'testuser',
        password: 'testpassword'
      }
    });

    assert.equal(loginResponse.statusCode, 200);
    const loginBody = loginResponse.json<LoginSuccessEnvelope>();
    const sessionToken = loginBody.data?.sessionToken;

    // Then logout with the session token
    const logoutResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${sessionToken}`
      }
    });

    assert.equal(logoutResponse.statusCode, 200);
    const logoutBody = logoutResponse.json<LogoutSuccessEnvelope>();
    assert.equal(logoutBody.data?.loggedOut, true);
  });

  it('returns HTTP 401 with UNAUTHORIZED for logout without authorization header', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout'
    });

    assert.equal(response.statusCode, 401);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
    assert.equal(body.error?.message, 'Authentication required');
  });

  it('returns HTTP 401 with UNAUTHORIZED for logout with malformed authorization header', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: 'InvalidHeader'
      }
    });

    assert.equal(response.statusCode, 401);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
    assert.equal(body.error?.message, 'Invalid authorization header');
  });

  it('returns HTTP 401 with UNAUTHORIZED for logout with invalid token', async () => {
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: 'Bearer invalidToken'
      }
    });

    assert.equal(response.statusCode, 401);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
    assert.equal(body.error?.message, 'Invalid or expired session');
  });

  it('returns HTTP 401 with UNAUTHORIZED for logout with revoked session', async () => {
    // Create a revoked session
    const session = createTestSession({ status: 'revoked' });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    // Try to logout with the revoked session
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/auth/logout',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.equal(response.statusCode, 401);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
    assert.equal(body.error?.message, 'Invalid or expired session');
  });

  it('prevents revoked session from authenticating protected routes', async () => {
    // Create a revoked session
    const session = createTestSession({ status: 'revoked' });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    // Try to access a protected route with the revoked session
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/member-organizations',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.equal(response.statusCode, 401);
    const body = response.json<ErrorEnvelope>();
    assert.equal(body.error?.code, 'UNAUTHORIZED');
    assert.equal(body.error?.message, 'Invalid or expired session');
  });
});
