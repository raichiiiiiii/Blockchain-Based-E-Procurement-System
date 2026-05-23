import { beforeEach, describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { createTestableServer } from '../../../app/server.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import { InMemoryPlatformUserCredentialRepository } from '../infrastructure/in-memory-platform-user-credential-repository.js';

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
});