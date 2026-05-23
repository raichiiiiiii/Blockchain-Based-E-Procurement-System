import { test, beforeEach, afterEach } from 'node:test';
import * as assert from 'node:assert';
import fastify from 'fastify';
import { InMemoryAuthSessionRepository } from '../infrastructure/in-memory-auth-session-repository.js';
import { createAuthenticatedRequestPreHandler } from './authenticated-request.js';
import { randomBytes } from 'node:crypto';
import type { AuthSession } from '../domain/auth-session.js';

// Helper function to create a test session
function createTestSession(overrides: Partial<AuthSession> = {}): AuthSession {
  const token = randomBytes(32).toString('hex');
  return {
    sessionId: `session_${randomBytes(16).toString('hex')}`,
    tokenHash: require('node:crypto').createHash('sha256').update(token).digest('hex'),
    actorUserId: 'user-123',
    actorOrganizationId: 'org-123',
    actorRoleCodes: ['auditor', 'viewer'],
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(), // 8 hours from now
    authenticationMethod: 'localPassword',
    ...overrides
  };
}

test('authenticated request middleware - valid token populates actor context', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Create and save a test session
  const session = createTestSession();
  await sessionRepository.save(session);
  
  // Create a token that matches the session
  const token = randomBytes(32).toString('hex');
  const tokenHash = require('node:crypto').createHash('sha256').update(token).digest('hex');
  
  // Update session with correct token hash
  const updatedSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { 
      success: true, 
      actorContext: request.actorContext 
    };
  });
  
  // Make request with valid token
  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 200);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.success, true);
  assert.strictEqual(payload.actorContext.actorUserId, 'user-123');
  assert.strictEqual(payload.actorContext.actorOrganizationId, 'org-123');
  assert.deepStrictEqual(payload.actorContext.actorRoleCodes, ['auditor', 'viewer']);
  assert.strictEqual(payload.actorContext.authenticationSessionId, updatedSession.sessionId);
  assert.strictEqual(payload.actorContext.authenticationMethod, 'localPassword');
  assert.strictEqual(payload.actorContext.isAuthenticated, true);
});

test('authenticated request middleware - missing authorization header', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { success: true };
  });
  
  // Make request without authorization header
  const response = await app.inject({
    method: 'GET',
    url: '/protected'
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Authentication required');
});

test('authenticated request middleware - malformed authorization header', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { success: true };
  });
  
  // Make request with malformed authorization header
  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: 'InvalidHeader'
    }
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid authorization header');
});

test('authenticated request middleware - unsupported auth scheme', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { success: true };
  });
  
  // Make request with unsupported auth scheme
  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: 'Basic someToken'
    }
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid authorization header');
});

test('authenticated request middleware - invalid token', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { success: true };
  });
  
  // Make request with invalid token
  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: 'Bearer invalidToken'
    }
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid or expired session');
});

test('authenticated request middleware - expired session', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Create and save an expired session
  const session = createTestSession({
    status: 'active',
    expiresAt: new Date(Date.now() - 1000).toISOString() // 1 second ago
  });
  await sessionRepository.save(session);
  
  // Create a token that matches the session
  const token = randomBytes(32).toString('hex');
  const tokenHash = require('node:crypto').createHash('sha256').update(token).digest('hex');
  
  // Update session with correct token hash
  const updatedSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { success: true };
  });
  
  // Make request with expired token
  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid or expired session');
  
  // Verify session was marked as expired
  const savedSession = await sessionRepository.findByTokenHash(tokenHash);
  assert.strictEqual(savedSession?.status, 'expired');
});

test('authenticated request middleware - revoked session', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  
  // Create and save a revoked session
  const session = createTestSession({
    status: 'revoked'
  });
  await sessionRepository.save(session);
  
  // Create a token that matches the session
  const token = randomBytes(32).toString('hex');
  const tokenHash = require('node:crypto').createHash('sha256').update(token).digest('hex');
  
  // Update session with correct token hash
  const updatedSession = { ...session, tokenHash };
  await sessionRepository.save(updatedSession);
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    return { success: true };
  });
  
  // Make request with revoked token
  const response = await app.inject({
    method: 'GET',
    url: '/protected',
    headers: {
      authorization: `Bearer ${token}`
    }
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.error.code, 'UNAUTHORIZED');
  assert.strictEqual(payload.error.message, 'Invalid or expired session');
});

test('authenticated request middleware - auth failure prevents protected handler execution', async (t) => {
  const app = fastify();
  const sessionRepository = new InMemoryAuthSessionRepository();
  let handlerExecuted = false;
  
  // Register the middleware
  app.addHook('preHandler', createAuthenticatedRequestPreHandler(sessionRepository));
  
  // Register a test route
  app.get('/protected', (request, reply) => {
    handlerExecuted = true;
    return { success: true };
  });
  
  // Make request without authorization header
  const response = await app.inject({
    method: 'GET',
    url: '/protected'
  });
  
  // Check response
  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(handlerExecuted, false); // Handler should not have been executed
});
