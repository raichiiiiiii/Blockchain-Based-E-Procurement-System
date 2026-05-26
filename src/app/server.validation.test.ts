import { test } from 'node:test';
import * as assert from 'node:assert';
import { createTestableServer } from './server.js';

test('schema validation failure returns standardized error envelope', async () => {
  // Create a test server with a route that has schema validation
  const server = createTestableServer();
  
  // Register a test route with schema validation
  server.post('/test-validation', {
    schema: {
      body: {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    return { success: true };
  });

  // Send a request that will fail schema validation (missing required 'name' field)
  const response = await server.inject({
    method: 'POST',
    url: '/test-validation',
    payload: {}
  });

  // Assert response status is 400 (validation error)
  assert.strictEqual(response.statusCode, 400);
  
  // Parse response body
  const body = JSON.parse(response.body);
  
  // Assert standardized error envelope structure
  assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
  assert.strictEqual(body.error.message, 'Request validation failed');
  assert.ok(Array.isArray(body.error.details.issues));
  assert.ok(body.error.details.issues.length > 0);
  
  // Assert no raw Fastify fields are exposed
  assert.strictEqual(body.validation, undefined);
  assert.strictEqual(body.validationContext, undefined);
  assert.strictEqual(body.statusCode, undefined);
});

test('health endpoint returns an ok status envelope', async () => {
  const server = createTestableServer();

  const response = await server.inject({
    method: 'GET',
    url: '/health'
  });

  assert.strictEqual(response.statusCode, 200);
  assert.deepStrictEqual(JSON.parse(response.body), {
    data: {
      status: 'ok'
    }
  });
});

test('readiness endpoint reports dependency checks and degrades with HTTP 503', async () => {
  const server = createTestableServer({
    readiness: async () => ({
      status: 'degraded',
      checks: {
        database: {
          mode: 'postgres',
          reachable: false
        },
        fabric: {
          mode: 'unavailable'
        },
        demoSeed: {
          enabled: true
        }
      }
    })
  });

  const response = await server.inject({
    method: 'GET',
    url: '/ready'
  });

  assert.strictEqual(response.statusCode, 503);
  assert.deepStrictEqual(JSON.parse(response.body), {
    data: {
      status: 'degraded',
      checks: {
        database: {
          mode: 'postgres',
          reachable: false
        },
        fabric: {
          mode: 'unavailable'
        },
        demoSeed: {
          enabled: true
        }
      }
    }
  });
});
