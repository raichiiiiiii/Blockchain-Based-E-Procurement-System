import { test, describe, beforeEach } from 'node:test';
import * as assert from 'node:assert';
import fastify from 'fastify';
import { randomBytes, createHash } from 'node:crypto';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import { InMemoryPlatformUserCredentialRepository } from '../infrastructure/in-memory-platform-user-credential-repository.js';
import { createAuthenticatedRequestPreHandler } from './authenticated-request.js';
import { LoginUserError, LoginUserService } from '../application/login-user.js';
import { LogoutUserService } from '../application/logout-user.js';
import type { AuthSession } from '../domain/auth-session.js';
import type { PlatformUserCredential } from '../domain/platform-user-credential.js';
import { getRequestActorContext } from './request-actor-context.js';

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

async function createTestCredential(credentialRepository: InMemoryPlatformUserCredentialRepository): Promise<PlatformUserCredential> {
  const credential: PlatformUserCredential = {
    userId: 'user-123',
    username: 'testuser',
    passwordHash: createHash('sha256').update('testpassword').digest('hex'),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await credentialRepository.save(credential);
  return credential;
}

async function loginAndGetToken(loginService: LoginUserService, username: string, password: string): Promise<string> {
  const result = await loginService.login({ username, password });
  return result.sessionToken;
}

async function createProtectedTestApp(sessionRepository: InMemoryAuthSessionRepository) {
  const app = fastify();
  await app.register(actorContextPlugin);
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  return app;
}

describe('Auth Regression Tests', () => {
  let credentialRepository: InMemoryPlatformUserCredentialRepository;
  let sessionRepository: InMemoryAuthSessionRepository;
  let loginService: LoginUserService;
  let logoutService: LogoutUserService;

  beforeEach(() => {
    credentialRepository = new InMemoryPlatformUserCredentialRepository();
    sessionRepository = new InMemoryAuthSessionRepository();
    loginService = new LoginUserService(credentialRepository, sessionRepository);
    logoutService = new LogoutUserService(sessionRepository);
  });

  test('login success returns session token and actor data', async () => {
    await createTestCredential(credentialRepository);

    const result = await loginService.login({
      username: 'testuser',
      password: 'testpassword'
    });

    assert.ok(result.sessionToken);
    assert.ok(result.sessionId);
    assert.ok(result.expiresAt);
    assert.equal(result.actor.actorUserId, 'user-123');
    assert.equal(result.actor.authenticationSessionId, result.sessionId);
    assert.equal(result.actor.authenticationMethod, 'localPassword');
  });

  test('invalid login rejects with HTTP 401 UNAUTHORIZED', async () => {
    await createTestCredential(credentialRepository);

    await assert.rejects(
      () => loginService.login({
        username: 'testuser',
        password: 'wrongpassword'
      }),
      (error: unknown) => error instanceof LoginUserError
        && error.code === 'UNAUTHORIZED'
        && error.message === 'Invalid username or password'
    );
  });

  test('missing bearer token rejects protected route before handler executes', async () => {
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

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
    assert.strictEqual(payload.error.message, 'Authentication required');
  });

  test('invalid bearer token rejects protected route before handler executes', async () => {
    const app = await createProtectedTestApp(sessionRepository);
    let handlerExecuted = false;

    app.get('/protected', () => {
      handlerExecuted = true;
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
    assert.strictEqual(handlerExecuted, false);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
    assert.strictEqual(payload.error.message, 'Invalid or expired session');
  });

  test('expired session rejects protected route before handler executes', async () => {
    const session = createTestSession({
      status: 'active',
      expiresAt: new Date(Date.now() - 1000).toISOString()
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    const app = await createProtectedTestApp(sessionRepository);
    let handlerExecuted = false;

    app.get('/protected', () => {
      handlerExecuted = true;
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
    assert.strictEqual(handlerExecuted, false);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
    assert.strictEqual(payload.error.message, 'Invalid or expired session');

    const savedSession = await sessionRepository.findByTokenHash(tokenHash);
    assert.strictEqual(savedSession?.status, 'expired');
  });

  test('revoked session rejects protected route before handler executes', async () => {
    const session = createTestSession({
      status: 'revoked'
    });
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    const app = await createProtectedTestApp(sessionRepository);
    let handlerExecuted = false;

    app.get('/protected', () => {
      handlerExecuted = true;
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
    assert.strictEqual(handlerExecuted, false);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
    assert.strictEqual(payload.error.message, 'Invalid or expired session');
  });

  test('logout revokes session', async () => {
    await createTestCredential(credentialRepository);
    const token = await loginAndGetToken(loginService, 'testuser', 'testpassword');
    const tokenHash = hashTestToken(token);

    await logoutService.logout(`Bearer ${token}`);

    const revokedSession = await sessionRepository.findByTokenHash(tokenHash);
    assert.ok(revokedSession);
    assert.equal(revokedSession.status, 'revoked');
    assert.ok(revokedSession.revokedAt);
  });

  test('logged-out/revoked token cannot authenticate protected request middleware', async () => {
    await createTestCredential(credentialRepository);
    const token = await loginAndGetToken(loginService, 'testuser', 'testpassword');

    await logoutService.logout(`Bearer ${token}`);

    const app = await createProtectedTestApp(sessionRepository);
    let handlerExecuted = false;

    app.get('/protected', () => {
      handlerExecuted = true;
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
    assert.strictEqual(handlerExecuted, false);

    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
    assert.strictEqual(payload.error.message, 'Invalid or expired session');
  });

  test('valid authenticated request populates trusted actor context', async () => {
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

  test('trusted actor context includes all required attributes', async () => {
    const session = createTestSession();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    const app = await createProtectedTestApp(sessionRepository);

    app.get('/protected', (request) => {
      const actorContext = getRequestActorContext(request);
      return {
        success: true,
        actorContext
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
  });

  test('protected route test consumes actor context from trusted request lifecycle', async () => {
    await createTestCredential(credentialRepository);
    const token = await loginAndGetToken(loginService, 'testuser', 'testpassword');

    const app = await createProtectedTestApp(sessionRepository);

    app.get('/test-protected', (request) => {
      return {
        success: true,
        actorUserId: request.actorContext?.actorUserId,
        isAuthenticated: request.actorContext?.isAuthenticated,
        roles: request.actorContext?.authorizationContext.roles
      };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/test-protected',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.actorUserId, 'user-123');
    assert.strictEqual(payload.isAuthenticated, true);
    assert.deepStrictEqual(payload.roles, []);
  });

  test('audit attribution test uses trusted actor context, not client-authored actor identity', async () => {
    await createTestCredential(credentialRepository);
    const token = await loginAndGetToken(loginService, 'testuser', 'testpassword');

    const auditRecords: Array<{ actorUserId: string; action: string }> = [];

    const app = await createProtectedTestApp(sessionRepository);

    app.post('/test-action', (request) => {
      const actorContext = getRequestActorContext(request);
      const actorUserId = actorContext.actorUserId || 'unknown';

      auditRecords.push({
        actorUserId,
        action: 'testAction'
      });

      return {
        success: true,
        auditRecorded: true
      };
    });

    const response = await app.inject({
      method: 'POST',
      url: '/test-action',
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        actorUserId: 'fake-user-id'
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.auditRecorded, true);

    assert.strictEqual(auditRecords.length, 1);
    assert.strictEqual(auditRecords[0]?.actorUserId, 'user-123');
    assert.strictEqual(auditRecords[0]?.action, 'testAction');
  });

  test('legacy actor-context compatibility remains available for existing tests', async () => {
    const session = createTestSession();
    const token = randomBytes(32).toString('hex');
    const tokenHash = hashTestToken(token);
    const updatedSession: AuthSession = { ...session, tokenHash };
    await sessionRepository.save(updatedSession);

    const app = await createProtectedTestApp(sessionRepository);

    app.get('/legacy-test', (request) => {
      return {
        success: true,
        userId: request.actorContext?.userId,
        roles: request.actorContext?.authorizationContext?.roles,
        isAuthenticated: request.actorContext?.isAuthenticated
      };
    });

    const response = await app.inject({
      method: 'GET',
      url: '/legacy-test',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    assert.strictEqual(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    assert.strictEqual(payload.success, true);
    assert.strictEqual(payload.userId, 'user-123');
    assert.deepStrictEqual(payload.roles, ['auditor', 'viewer']);
    assert.strictEqual(payload.isAuthenticated, true);
  });
});