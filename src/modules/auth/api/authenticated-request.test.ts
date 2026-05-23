import { test } from 'node:test';
import * as assert from 'node:assert';
import fastify from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import { createAuthenticatedRequestPreHandler } from './authenticated-request.js';
import type { AuthSession } from '../domain/auth-session.js';

function hashTestToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createTestSession(overrides: Partial<AuthSession> = {}): AuthSession {
  return {
    sessionId: `session_${randomBytes(16).toString('hex')}`,
    tokenHash: hashTestToken(randomBytes(32).toString('hex')),
    actorUserId: 'user-123',
    actorOrganizationId: 'org-123',
    actorRoleCodes: ['auditor', 'viewer'],
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
    ...overrides
  };
}

async function createProtectedTestApp(sessionRepository: InMemoryAuthSessionRepository) {
  const app = fastify();
  await app.register(actorContextPlugin);
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  return app;
}

test('authenticated request middleware - valid token populates actor context', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const session = createTestSession();
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashTestToken(token);
  const updatedSession: AuthSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);

  const app = await createProtectedTestApp(sessionRepository);
  app.get('/protected', (request) => {
    return {
      success: true,
      actorContext: request.actorContext
    };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  assert.strictEqual(response.statusCode, 200);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.success, true);
  assert.strictEqual(payload.actorContext.actorUserId, 'user-123');
  assert.strictEqual(payload.actorContext.actorOrganizationId, 'org-123');
  assert.deepStrictEqual(payload.actorContext.actorRoleCodes, ['auditor', 'viewer']);
  assert.strictEqual(payload.actorContext.authenticationSessionId, updatedSession.sessionId);
  assert.strictEqual(payload.actorContext.authenticationMethod, 'localPassword');
  assert.strictEqual(payload.actorContext.isAuthenticated, true);
  assert.strictEqual(payload.actorContext.userId, 'user-123');
  assert.deepStrictEqual(payload.actorContext.authorizationContext.roles, ['auditor', 'viewer']);
});

test('authenticated request middleware - missing authorization header', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const app = await createProtectedTestApp(sessionRepository);

  app.get('/protected', () => {
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected'
  });

  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Authentication required');
});

test('authenticated request middleware - malformed authorization header', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const app = await createProtectedTestApp(sessionRepository);

  app.get('/protected', () => {
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: 'InvalidHeader'
    }
  });

  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid authorization header');
});

test('authenticated request middleware - unsupported auth scheme', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const app = await createProtectedTestApp(sessionRepository);

  app.get('/protected', () => {
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: 'Basic someToken'
    }
  });

  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid authorization header');
});

test('authenticated request middleware - invalid token', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const app = await createProtectedTestApp(sessionRepository);

  app.get('/protected', () => {
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: 'Bearer invalidToken'
    }
  });

  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid or expired session');
});

test('authenticated request middleware - expired session', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const session = createTestSession({
    status: 'active',
    expiresAt: new Date(Date.now() - 1000).toISOString()
  });
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashTestToken(token);
  const updatedSession: AuthSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);

  const app = await createProtectedTestApp(sessionRepository);
  app.get('/protected', () => {
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid or expired session');

  const savedSession = await sessionRepository.findByTokenHash(tokenHash);
  assert.strictEqual(savedSession?.status, 'expired');
});

test('authenticated request middleware - revoked session', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const session = createTestSession({
    status: 'revoked'
  });
  const token = randomBytes(32).toString('hex');
  const tokenHash = hashTestToken(token);
  const updatedSession: AuthSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);

  const app = await createProtectedTestApp(sessionRepository);
  app.get('/protected', () => {
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: `Bearer ${token}`
    }
  });

  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid or expired session');
});

test('authenticated request middleware - auth failure prevents protected handler execution', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const app = await createProtectedTestApp(sessionRepository);
  let handlerExecuted = false;

  app.get('/protected', () => {
    handlerExecuted = true;
    return { success: true };
  });

  const response = await app.inject({
    method: 'GET',
    url: '/protected'
  });

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(handlerExecuted, false);
});