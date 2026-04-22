import { test } from 'node:test';
import * as assert from 'node:assert';
import fastify from 'fastify';
import actorContextPlugin from './actor-context-plugin.js';
import type { TrustedActorContext } from './actor-context-plugin.js';

test('actor-context-plugin registers actorContext on every request', async (t) => {
  const app = fastify();
  app.register(actorContextPlugin);
  
  app.get('/test', async (request) => {
    return { hasActorContext: !!request.actorContext };
  });
  
  const response = await app.inject({
    method: 'GET',
    url: '/test'
  });
  
  const payload = JSON.parse(response.payload);
  assert.strictEqual(payload.hasActorContext, true);
});

test('actor-context-plugin populates userId from x-actor-id header', async (t) => {
  const app = fastify();
  app.register(actorContextPlugin);
  
  app.get('/test', async (request) => {
    return request.actorContext;
  });
  
  const response = await app.inject({
    method: 'GET',
    url: '/test',
    headers: {
      'x-actor-id': 'user_123'
    }
  });
  
  const payload: TrustedActorContext = JSON.parse(response.payload);
  assert.strictEqual(payload.userId, 'user_123');
  assert.strictEqual(payload.isAuthenticated, true);
});

test('actor-context-plugin populates roles from x-actor-role header (single role)', async (t) => {
  const app = fastify();
  app.register(actorContextPlugin);
  
  app.get('/test', async (request) => {
    return request.actorContext;
  });
  
  const response = await app.inject({
    method: 'GET',
    url: '/test',
    headers: {
      'x-actor-role': 'admin'
    }
  });
  
  const payload: TrustedActorContext = JSON.parse(response.payload);
  assert.deepStrictEqual(payload.authorizationContext.roles, ['admin']);
  assert.strictEqual(payload.isAuthenticated, false); // No x-actor-id
});

test('actor-context-plugin populates roles from x-actor-role header (multiple roles)', async (t) => {
  const app = fastify();
  app.register(actorContextPlugin);
  
  app.get('/test', async (request) => {
    return request.actorContext;
  });
  
  const response = await app.inject({
    method: 'GET',
    url: '/test',
    headers: {
      'x-actor-role': ['admin', 'editor']
    }
  });
  
  const payload: TrustedActorContext = JSON.parse(response.payload);
  assert.deepStrictEqual(payload.authorizationContext.roles, ['admin', 'editor']);
  assert.strictEqual(payload.isAuthenticated, false); // No x-actor-id
});

test('actor-context-plugin creates unauthenticated context when headers are missing', async (t) => {
  const app = fastify();
  app.register(actorContextPlugin);
  
  app.get('/test', async (request) => {
    return request.actorContext;
  });
  
  const response = await app.inject({
    method: 'GET',
    url: '/test'
  });
  
  const payload: TrustedActorContext = JSON.parse(response.payload);
  assert.strictEqual(payload.userId, undefined);
  assert.strictEqual(payload.isAuthenticated, false);
  assert.deepStrictEqual(payload.authorizationContext.roles, undefined);
});
