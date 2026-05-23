import { test } from 'node:test';
import * as assert from 'node:assert';
import fastify from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import { createAuthenticatedRequestPreHandler } from './authenticated-request.js';
import type { AuthSession } from '../domain/auth-session.js';

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

function createTestSession(overrides: Partial<AuthSession> = {}): AuthSession {
  const token = randomBytes(32).toString('hex');
  return {
    sessionId: `session_${randomBytes(16).toString('hex')}`,
    tokenHash: hashToken(token),
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

test('authenticated request middleware - valid token populates actor context', async () => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  const session = createTestSession();
  await sessionRepository.save(session);

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const updatedSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  const session = createTestSession({
    status: 'active',
    expiresAt: new Date(Date.now() - 1000).toISOString()
  });
  await sessionRepository.save(session);

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const updatedSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();

  const session = createTestSession({
    status: 'revoked'
  });
  await sessionRepository.save(session);

  const token = randomBytes(32).toString('hex');
  const tokenHash = hashToken(token);

  const updatedSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  let handlerExecuted = false;

  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));

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