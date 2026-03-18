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

test('should return 201 for valid input', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/member-organizations',
    payload: {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      displayName: 'Test Org',
      businessType: 'LLC',
      contactEmail: 'test@example.com',
      contactPhone: '+1234567890',
      countryCode: 'US',
      notes: 'Test notes'
    }
  });

  assert.strictEqual(response.statusCode, 201);
  
  const responseBody = response.json();
  
  // Assert response structure
  assert.strictEqual(typeof responseBody.data, 'object');
  assert.strictEqual(typeof responseBody.data.id, 'string');
  assert.strictEqual(responseBody.data.registrationNumber, 'REG123');
  assert.strictEqual(responseBody.data.legalName, 'Test Organization');
  assert.strictEqual(responseBody.data.displayName, 'Test Org');
  assert.strictEqual(responseBody.data.organizationType, 'Corporation');
  assert.strictEqual(responseBody.data.businessType, 'LLC');
  assert.strictEqual(responseBody.data.status, 'pendingReview');
  assert.strictEqual(typeof responseBody.data.createdAt, 'string');
  assert.strictEqual(typeof responseBody.data.updatedAt, 'string');
  
  // Assert that excluded fields are not present
  assert.strictEqual(responseBody.data.contactEmail, undefined);
  assert.strictEqual(responseBody.data.contactPhone, undefined);
  assert.strictEqual(responseBody.data.countryCode, undefined);
  assert.strictEqual(responseBody.data.notes, undefined);
});
