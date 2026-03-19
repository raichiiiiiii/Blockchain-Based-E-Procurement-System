import { test, before } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';

// Mock audit callback to capture audit events
let capturedAuditEvents: any[] = [];
const mockAuditCallback = (event: any) => {
  capturedAuditEvents.push(event);
};

// Create test server with mock audit callback
const testServer = createTestableServer({ audit: mockAuditCallback });

before(async () => {
  await testServer.ready();
});

test('should return 400 for missing required fields', async () => {
  // Reset captured events
  capturedAuditEvents = [];
  
  const response = await testServer.inject({
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
  
  // No audit events should be emitted for invalid input
  assert.strictEqual(capturedAuditEvents.length, 0, 'No audit events should be emitted for invalid input');
});

test('should return 400 for whitespace-only required fields', async () => {
  // Reset captured events
  capturedAuditEvents = [];
  
  const response = await testServer.inject({
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
  
  // No audit events should be emitted for invalid input
  assert.strictEqual(capturedAuditEvents.length, 0, 'No audit events should be emitted for invalid input');
});

test('should return 201 for valid input without x-actor-id header', async () => {
  // Reset captured events
  capturedAuditEvents = [];
  
  const response = await testServer.inject({
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
  
  // Assert exactly one audit event was emitted
  assert.strictEqual(capturedAuditEvents.length, 1, 'Exactly one audit event should be emitted');
  
  // Assert audit event structure and values
  const auditEvent = capturedAuditEvents[0];
  assert.strictEqual(auditEvent.action, 'createMemberOrganization');
  assert.strictEqual(auditEvent.targetType, 'memberOrganization');
  assert.strictEqual(typeof auditEvent.targetId, 'string');
  assert.strictEqual(auditEvent.outcome, 'success');
  assert.strictEqual(auditEvent.actorId, 'unknown');
  assert.strictEqual(typeof auditEvent.requestId, 'string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string');
});

test('should return 201 for valid input with x-actor-id header', async () => {
  // Reset captured events
  capturedAuditEvents = [];
  
  const response = await testServer.inject({
    method: 'POST',
    url: '/api/v1/member-organizations',
    headers: {
      'x-actor-id': 'test-user-123'
    },
    payload: {
      registrationNumber: 'REG456',
      legalName: 'Another Test Organization',
      organizationType: 'LLC',
      displayName: 'Another Test Org'
    }
  });

  assert.strictEqual(response.statusCode, 201);
  
  const responseBody = response.json();
  
  // Assert response structure
  assert.strictEqual(typeof responseBody.data, 'object');
  assert.strictEqual(typeof responseBody.data.id, 'string');
  assert.strictEqual(responseBody.data.registrationNumber, 'REG456');
  assert.strictEqual(responseBody.data.legalName, 'Another Test Organization');
  assert.strictEqual(responseBody.data.displayName, 'Another Test Org');
  assert.strictEqual(responseBody.data.organizationType, 'LLC');
  assert.strictEqual(responseBody.data.status, 'pendingReview');
  assert.strictEqual(typeof responseBody.data.createdAt, 'string');
  assert.strictEqual(typeof responseBody.data.updatedAt, 'string');
  
  // Assert exactly one audit event was emitted
  assert.strictEqual(capturedAuditEvents.length, 1, 'Exactly one audit event should be emitted');
  
  // Assert audit event structure and values
  const auditEvent = capturedAuditEvents[0];
  assert.strictEqual(auditEvent.action, 'createMemberOrganization');
  assert.strictEqual(auditEvent.targetType, 'memberOrganization');
  assert.strictEqual(typeof auditEvent.targetId, 'string');
  assert.strictEqual(auditEvent.outcome, 'success');
  assert.strictEqual(auditEvent.actorId, 'test-user-123'); // Should match header value
  assert.strictEqual(typeof auditEvent.requestId, 'string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string');
  assert.strictEqual(auditEvent.targetId, responseBody.data.id); // Should match created org ID
});
