import { test, before } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { server } from '../../../app/server.js';

before(async () => {
  await server.ready();
});

test('should return 400 for missing required fields', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/member-organizations',
    payload: {}
  });

  assert.strictEqual(response.statusCode, 400);
  
  // Parse response body to check structure
  const responseBody = response.json();
  
  // Assert basic structure of Fastify validation error
  assert(typeof responseBody.message === 'string', 'Response should have a message string');
  
  // Assert this is NOT using the custom application format
  assert.strictEqual(responseBody.issues, undefined, 'Should not have issues array in Fastify validation error');
});

test('should return 400 for whitespace-only required fields', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/member-organizations',
    payload: {
      registrationNumber: '   ',
      legalName: '   ',
      organizationType: '   '
    }
  });

  assert.strictEqual(response.statusCode, 400);
  
  const responseBody = response.json();
  assert.strictEqual(responseBody.message, 'Invalid input');
  assert(Array.isArray(responseBody.issues));
  assert(responseBody.issues.length > 0);
});

test('should return 501 for valid input', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/member-organizations',
    payload: {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation'
    }
  });

  assert.strictEqual(response.statusCode, 501);
  
  const responseBody = response.json();
  assert.strictEqual(
    responseBody.message,
    'Membership organization creation endpoint registered but not yet implemented'
  );
});
