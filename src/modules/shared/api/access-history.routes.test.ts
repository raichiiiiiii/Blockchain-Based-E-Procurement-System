import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';
import { createAccessAuditEvent } from '../../shared/application/access-audit-event-builder.js';
import type { CreateAccessAuditEventInput } from '../../shared/application/access-audit-event-builder.js';

// Local type for validation issues
type ValidationIssue = {
  path?: string;
  message?: string;
};

// Helper function to check if response contains a specific issue
function hasIssueContaining(responseBody: any, path: string, text: string): boolean {
  if (!responseBody.error || !responseBody.error.details || !Array.isArray(responseBody.error.details.issues)) {
    return false;
  }

  const issues: ValidationIssue[] = responseBody.error.details.issues;
  return issues.some(issue =>
    issue.path === path && issue.message && issue.message.includes(text)
  );
}

// Helper function to check if response contains an issue with specific text
function hasIssueWithText(responseBody: any, text: string): boolean {
  if (!responseBody.error || !responseBody.error.details || !Array.isArray(responseBody.error.details.issues)) {
    return false;
  }

  const issues: ValidationIssue[] = responseBody.error.details.issues;
  return issues.some(issue =>
    issue.message && issue.message.includes(text)
  );
}

test('should return approved response shape for authorized auditor with empty query', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 0, 'Items array should be empty');
});

test('should return recorded events for authorized auditor', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with an event
  const eventInput: CreateAccessAuditEventInput = {
    requestId: 'req-123',
    actorUserId: 'user-456',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-789',
    outcome: 'success',
    module: 'access-control'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');

  const returnedEvent = responseBody.data.items[0];
  assert.strictEqual(returnedEvent.eventId, event.eventId);
  assert.strictEqual(returnedEvent.schemaVersion, event.schemaVersion);
  assert.strictEqual(returnedEvent.occurredAt, event.occurredAt);
  assert.strictEqual(returnedEvent.requestId, event.requestId);
  assert.strictEqual(returnedEvent.actorUserId, event.actorUserId);
  assert.strictEqual(returnedEvent.actorSource, event.actorSource);
  assert.strictEqual(returnedEvent.action, event.action);
  assert.strictEqual(returnedEvent.targetType, event.targetType);
  assert.strictEqual(returnedEvent.targetId, event.targetId);
  assert.strictEqual(returnedEvent.outcome, event.outcome);
  assert.strictEqual(returnedEvent.module, event.module);
  assert.strictEqual(returnedEvent.evidence.payloadHash, event.evidence.payloadHash);
  assert.strictEqual(returnedEvent.evidence.canonicalization, event.evidence.canonicalization);
});

test('should deny access for non-auditor user', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'normal-user',
      'x-actor-role': 'coordinator'
    }
  });

  assert.strictEqual(response.statusCode, 403);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
  assert.strictEqual(responseBody.error.message, 'User must have auditor role to query access history');
});

// New tests for Slice 1C - Supported query filters

test('should filter events by actorUserId', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with two events from different users
  const event1Input: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-2',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-2',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?actorUserId=user-1',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].actorUserId, 'user-1');
});

test('should filter events by targetType and targetId', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with two events with different targets
  const event1Input: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-1',
    action: 'createRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'assignment-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?targetType=role&targetId=role-1',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].targetType, 'role');
  assert.strictEqual(responseBody.data.items[0].targetId, 'role-1');
});

test('should filter events by action and outcome', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events with different actions/outcomes
  const event1Input: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'changeRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'assignment-1',
    outcome: 'forbidden',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-2',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?action=changeRoleAssignment&outcome=forbidden',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].action, 'changeRoleAssignment');
  assert.strictEqual(responseBody.data.items[0].outcome, 'forbidden');
});

test('should filter events by time range', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events with different timestamps
  const event1Input: CreateAccessAuditEventInput = {
    occurredAt: '2026-03-15T10:00:00Z',
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-15T10:00:00Z',
    requestId: 'req-2',
    actorUserId: 'user-1',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event3Input: CreateAccessAuditEventInput = {
    occurredAt: '2026-05-15T10:00:00Z',
    requestId: 'req-3',
    actorUserId: 'user-1',
    action: 'deleteRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);
  const event3 = createAccessAuditEvent(event3Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);
  await auditEventRepository.save(event3);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?occurredFrom=2026-04-01T00:00:00Z&occurredTo=2026-04-30T23:59:59Z',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].occurredAt, '2026-04-15T10:00:00Z');
});

test('should filter events by module, route, and method', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with representative events
  const sensitiveReadEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'viewShariahReviewHistory',
    targetType: 'shariahReview',
    targetId: 'review-1',
    outcome: 'success',
    module: 'shariah-review',
    route: '/api/v1/shariah-reviews/:reviewId/history',
    method: 'GET'
  };

  const governedWriteEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-2',
    action: 'createRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'assignment-1',
    outcome: 'success',
    module: 'access-control',
    route: '/api/v1/role-assignments',
    method: 'POST'
  };

  const sensitiveReadEvent = createAccessAuditEvent(sensitiveReadEventInput);
  const governedWriteEvent = createAccessAuditEvent(governedWriteEventInput);

  await auditEventRepository.save(sensitiveReadEvent);
  await auditEventRepository.save(governedWriteEvent);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?module=shariah-review&route=/api/v1/shariah-reviews/:reviewId/history&method=GET',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].module, 'shariah-review');
  assert.strictEqual(responseBody.data.items[0].route, '/api/v1/shariah-reviews/:reviewId/history');
  assert.strictEqual(responseBody.data.items[0].method, 'GET');
});

test('should apply combined filters and preserve response shape', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with multiple events
  const event1Input: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-15T10:00:00Z',
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-16T10:00:00Z',
    requestId: 'req-2',
    actorUserId: 'user-1',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event3Input: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-17T10:00:00Z',
    requestId: 'req-3',
    actorUserId: 'user-2',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-2',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);
  const event3 = createAccessAuditEvent(event3Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);
  await auditEventRepository.save(event3);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?actorUserId=user-1&action=createRole&occurredFrom=2026-04-15T00:00:00Z&occurredTo=2026-04-16T23:59:59Z',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');

  // Verify the returned event preserves all AccessAuditEvent fields
  const returnedEvent = responseBody.data.items[0];
  assert.ok(returnedEvent.eventId, 'Event should have eventId');
  assert.ok(returnedEvent.schemaVersion, 'Event should have schemaVersion');
  assert.ok(returnedEvent.occurredAt, 'Event should have occurredAt');
  assert.ok(returnedEvent.requestId, 'Event should have requestId');
  assert.ok(returnedEvent.actorUserId, 'Event should have actorUserId');
  assert.ok(returnedEvent.actorSource, 'Event should have actorSource');
  assert.ok(returnedEvent.action, 'Event should have action');
  assert.ok(returnedEvent.targetType, 'Event should have targetType');
  assert.ok(returnedEvent.targetId, 'Event should have targetId');
  assert.ok(returnedEvent.outcome, 'Event should have outcome');
  assert.ok(returnedEvent.module, 'Event should have module');
  assert.ok(returnedEvent.evidence, 'Event should have evidence');
  assert.ok(returnedEvent.evidence.payloadHash, 'Event evidence should have payloadHash');
  assert.ok(returnedEvent.evidence.canonicalization, 'Event evidence should have canonicalization');
});

// New tests for Slice 1D - Invalid query input validation

test('should reject unknown query parameter with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?unknown=value',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
  assert.ok(responseBody.error.message.includes('Invalid query parameters'));
  assert.ok(Array.isArray(responseBody.error.details.issues));
  assert.ok(hasIssueWithText(responseBody, 'Unsupported query parameter'));
});

test('should reject pagination parameters with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  // Test limit parameter
  const response1 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?limit=50',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response1.statusCode, 400);

  const responseBody1 = response1.json();
  assert.ok(responseBody1.error, 'Response should have error object');
  assert.strictEqual(responseBody1.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody1.error.details.issues));
  assert.ok(hasIssueContaining(responseBody1, 'limit', 'Unsupported query parameter'));

  // Test cursor parameter
  const response2 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?cursor=abc',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response2.statusCode, 400);

  const responseBody2 = response2.json();
  assert.ok(responseBody2.error, 'Response should have error object');
  assert.strictEqual(responseBody2.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody2.error.details.issues));
  assert.ok(hasIssueContaining(responseBody2, 'cursor', 'Unsupported query parameter'));
});

test('should reject invalid outcome with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?outcome=invalidOutcome',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody.error.details.issues));
  assert.ok(hasIssueContaining(responseBody, 'outcome', 'Invalid outcome value'));
});

test('should reject invalid module and method with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  // Test invalid module
  const response1 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?module=invalid-module',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response1.statusCode, 400);

  const responseBody1 = response1.json();
  assert.ok(responseBody1.error, 'Response should have error object');
  assert.strictEqual(responseBody1.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody1.error.details.issues));
  assert.ok(hasIssueContaining(responseBody1, 'module', 'Invalid module value'));

  // Test invalid method
  const response2 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?method=INVALID',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response2.statusCode, 400);

  const responseBody2 = response2.json();
  assert.ok(responseBody2.error, 'Response should have error object');
  assert.strictEqual(responseBody2.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody2.error.details.issues));
  assert.ok(hasIssueContaining(responseBody2, 'method', 'Invalid method value'));
});

test('should reject invalid timestamp with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?occurredFrom=not-a-date',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody.error.details.issues));
  assert.ok(hasIssueContaining(responseBody, 'occurredFrom', 'Invalid date format'));
});

test('should reject invalid time range with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?occurredFrom=2026-05-02T00:00:00Z&occurredTo=2026-05-01T00:00:00Z',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
  assert.ok(Array.isArray(responseBody.error.details.issues));
  assert.ok(hasIssueContaining(responseBody, 'occurredFrom', 'occurredFrom must be less than or equal to occurredTo'));
});

test('should still work with valid filter after validation added', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with an event
  const eventInput: CreateAccessAuditEventInput = {
    requestId: 'req-123',
    actorUserId: 'user-test',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-test',
    outcome: 'success',
    module: 'access-control'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?actorUserId=user-test',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].actorUserId, 'user-test');
});

// New tests for Slice 1B - API-level stable ordering and payload preservation

test('should return access history in stable occurredAt and eventId order', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events deliberately out of order
  const event1Input: CreateAccessAuditEventInput = {
    eventId: 'zzz-late-event',
    occurredAt: '2026-04-03T10:00:00Z',
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    eventId: 'aaa-early-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-2',
    actorUserId: 'user-2',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-2',
    outcome: 'success',
    module: 'access-control'
  };

  const event3Input: CreateAccessAuditEventInput = {
    eventId: 'mid-event',
    occurredAt: '2026-04-02T10:00:00Z',
    requestId: 'req-3',
    actorUserId: 'user-3',
    action: 'deleteRole',
    targetType: 'role',
    targetId: 'role-3',
    outcome: 'success',
    module: 'access-control'
  };

  // Two events with the same occurredAt but different eventIds
  const event4Input: CreateAccessAuditEventInput = {
    eventId: 'zzz-same-time-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-4',
    actorUserId: 'user-4',
    action: 'assignRole',
    targetType: 'role',
    targetId: 'role-4',
    outcome: 'success',
    module: 'access-control'
  };

  const event5Input: CreateAccessAuditEventInput = {
    eventId: 'aaa-same-time-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-5',
    actorUserId: 'user-5',
    action: 'revokeRole',
    targetType: 'role',
    targetId: 'role-5',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);
  const event3 = createAccessAuditEvent(event3Input);
  const event4 = createAccessAuditEvent(event4Input);
  const event5 = createAccessAuditEvent(event5Input);

  // Save in random order
  await auditEventRepository.save(event1);
  await auditEventRepository.save(event3);
  await auditEventRepository.save(event5);
  await auditEventRepository.save(event2);
  await auditEventRepository.save(event4);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 5, 'Items array should contain five events');

  // Check ordering: occurredAt ascending, then eventId ascending
  const items = responseBody.data.items;

  // First three items have the same occurredAt and are ordered by eventId ascending
  assert.strictEqual(items[0].eventId, 'aaa-early-event');
  assert.strictEqual(items[0].occurredAt, '2026-04-01T10:00:00Z');
  assert.strictEqual(items[1].eventId, 'aaa-same-time-event');
  assert.strictEqual(items[1].occurredAt, '2026-04-01T10:00:00Z');
  assert.strictEqual(items[2].eventId, 'zzz-same-time-event');
  assert.strictEqual(items[2].occurredAt, '2026-04-01T10:00:00Z');

  // Next items should be ordered by occurredAt
  assert.strictEqual(items[3].eventId, 'mid-event');
  assert.strictEqual(items[3].occurredAt, '2026-04-02T10:00:00Z');
  assert.strictEqual(items[4].eventId, 'zzz-late-event');
  assert.strictEqual(items[4].occurredAt, '2026-04-03T10:00:00Z');
});

test('should preserve approved AccessAuditEvent payload fields in API response', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with a comprehensive event
  const eventInput: CreateAccessAuditEventInput = {
    eventId: 'test-event-id',
    occurredAt: '2026-04-15T10:30:00Z',
    requestId: 'req-test-123',
    actorUserId: 'test-user-456',
    action: 'testAction',
    targetType: 'testTargetType',
    targetId: 'testTargetId',
    outcome: 'success',
    module: 'access-control',
    reason: 'test reason',
    route: '/api/v1/test-route',
    method: 'POST'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?action=testAction',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');

  const returnedEvent = responseBody.data.items[0];

  // Verify all required AccessAuditEvent fields are preserved
  assert.strictEqual(returnedEvent.eventId, event.eventId, 'eventId should be preserved');
  assert.strictEqual(returnedEvent.schemaVersion, event.schemaVersion, 'schemaVersion should be preserved');
  assert.strictEqual(returnedEvent.occurredAt, event.occurredAt, 'occurredAt should be preserved');
  assert.strictEqual(returnedEvent.requestId, event.requestId, 'requestId should be preserved');
  assert.strictEqual(returnedEvent.actorUserId, event.actorUserId, 'actorUserId should be preserved');
  assert.strictEqual(returnedEvent.actorSource, event.actorSource, 'actorSource should be preserved');
  assert.strictEqual(returnedEvent.action, event.action, 'action should be preserved');
  assert.strictEqual(returnedEvent.targetType, event.targetType, 'targetType should be preserved');
  assert.strictEqual(returnedEvent.targetId, event.targetId, 'targetId should be preserved');
  assert.strictEqual(returnedEvent.outcome, event.outcome, 'outcome should be preserved');
  assert.strictEqual(returnedEvent.module, event.module, 'module should be preserved');
  assert.strictEqual(returnedEvent.reason, event.reason, 'reason should be preserved');
  assert.strictEqual(returnedEvent.route, event.route, 'route should be preserved');
  assert.strictEqual(returnedEvent.method, event.method, 'method should be preserved');
  assert.strictEqual(returnedEvent.evidence.payloadHash, event.evidence.payloadHash, 'evidence.payloadHash should be preserved');
  assert.strictEqual(returnedEvent.evidence.canonicalization, event.evidence.canonicalization, 'evidence.canonicalization should be preserved');

  // Verify evidence object structure
  assert.ok(returnedEvent.evidence, 'evidence should be present');
  assert.ok(returnedEvent.evidence.payloadHash, 'evidence should have payloadHash');
  assert.ok(returnedEvent.evidence.canonicalization, 'evidence should have canonicalization');
});

// New tests for Slice 1C - API-level representative protected-write, denied-action, and sensitive-read search tests

test('should return representative protected write event through API search', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with a protected write event
  const protectedWriteEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-001',
    action: 'createRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'user-001:org-001:role-reviewer',
    outcome: 'success',
    module: 'access-control',
    route: '/api/v1/role-assignments',
    method: 'POST'
  };

  const unrelatedEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-002',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-123',
    outcome: 'success',
    module: 'access-control'
  };

  const protectedWriteEvent = createAccessAuditEvent(protectedWriteEventInput);
  const unrelatedEvent = createAccessAuditEvent(unrelatedEventInput);

  await auditEventRepository.save(protectedWriteEvent);
  await auditEventRepository.save(unrelatedEvent);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?action=createRoleAssignment&outcome=success',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');

  const returnedEvent = responseBody.data.items[0];
  assert.strictEqual(returnedEvent.action, 'createRoleAssignment');
  assert.strictEqual(returnedEvent.outcome, 'success');
  assert.strictEqual(returnedEvent.targetType, 'roleAssignment');
  assert.strictEqual(returnedEvent.module, 'access-control');
  assert.strictEqual(returnedEvent.route, '/api/v1/role-assignments');
  assert.strictEqual(returnedEvent.method, 'POST');
  assert.ok(returnedEvent.evidence.payloadHash, 'Evidence should have payloadHash');
  assert.strictEqual(returnedEvent.evidence.canonicalization, 'json-stable-v1');
});

test('should return representative denied protected action event through API search', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with a denied protected action event
  const deniedEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-001',
    action: 'changeRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'user-001:org-001:role-coordinator',
    outcome: 'forbidden',
    reason: 'admin_required',
    module: 'access-control',
    route: '/api/v1/role-assignments/change',
    method: 'PATCH'
  };

  const unrelatedEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-002',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-123',
    outcome: 'success',
    module: 'access-control'
  };

  const deniedEvent = createAccessAuditEvent(deniedEventInput);
  const unrelatedEvent = createAccessAuditEvent(unrelatedEventInput);

  await auditEventRepository.save(deniedEvent);
  await auditEventRepository.save(unrelatedEvent);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?action=changeRoleAssignment&outcome=forbidden',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');

  const returnedEvent = responseBody.data.items[0];
  assert.strictEqual(returnedEvent.action, 'changeRoleAssignment');
  assert.strictEqual(returnedEvent.outcome, 'forbidden');
  assert.strictEqual(returnedEvent.reason, 'admin_required');
  assert.strictEqual(returnedEvent.targetType, 'roleAssignment');
  assert.strictEqual(returnedEvent.module, 'access-control');
  assert.strictEqual(returnedEvent.route, '/api/v1/role-assignments/change');
  assert.strictEqual(returnedEvent.method, 'PATCH');
  assert.ok(returnedEvent.evidence.payloadHash, 'Evidence should have payloadHash');
  assert.strictEqual(returnedEvent.evidence.canonicalization, 'json-stable-v1');
});

test('should return representative selected sensitive read event through API search', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with a sensitive read event
  const sensitiveReadEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-001',
    action: 'viewShariahReviewHistory',
    targetType: 'shariahReview',
    targetId: 'review-001',
    outcome: 'success',
    module: 'shariah-review',
    route: '/api/v1/shariah-reviews/:reviewId/history',
    method: 'GET'
  };

  const unrelatedEventInput: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-002',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-123',
    outcome: 'success',
    module: 'access-control'
  };

  const sensitiveReadEvent = createAccessAuditEvent(sensitiveReadEventInput);
  const unrelatedEvent = createAccessAuditEvent(unrelatedEventInput);

  await auditEventRepository.save(sensitiveReadEvent);
  await auditEventRepository.save(unrelatedEvent);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history?action=viewShariahReviewHistory&module=shariah-review&method=GET',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');

  const returnedEvent = responseBody.data.items[0];
  assert.strictEqual(returnedEvent.action, 'viewShariahReviewHistory');
  assert.strictEqual(returnedEvent.outcome, 'success');
  assert.strictEqual(returnedEvent.targetType, 'shariahReview');
  assert.strictEqual(returnedEvent.targetId, 'review-001');
  assert.strictEqual(returnedEvent.module, 'shariah-review');
  assert.strictEqual(returnedEvent.route, '/api/v1/shariah-reviews/:reviewId/history');
  assert.strictEqual(returnedEvent.method, 'GET');
  assert.ok(returnedEvent.evidence.payloadHash, 'Evidence should have payloadHash');
  assert.strictEqual(returnedEvent.evidence.canonicalization, 'json-stable-v1');
});

test('should return mixed representative events in stable order', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events having different occurredAt values
  const protectedWriteEventInput: CreateAccessAuditEventInput = {
    eventId: 'write-event',
    occurredAt: '2026-04-03T10:00:00Z',
    requestId: 'req-1',
    actorUserId: 'user-001',
    action: 'createRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'user-001:org-001:role-reviewer',
    outcome: 'success',
    module: 'access-control',
    route: '/api/v1/role-assignments',
    method: 'POST'
  };

  const deniedEventInput: CreateAccessAuditEventInput = {
    eventId: 'denied-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-2',
    actorUserId: 'user-001',
    action: 'changeRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'user-001:org-001:role-coordinator',
    outcome: 'forbidden',
    reason: 'admin_required',
    module: 'access-control',
    route: '/api/v1/role-assignments/change',
    method: 'PATCH'
  };

  const sensitiveReadEventInput: CreateAccessAuditEventInput = {
    eventId: 'read-event',
    occurredAt: '2026-04-02T10:00:00Z',
    requestId: 'req-3',
    actorUserId: 'user-001',
    action: 'viewShariahReviewHistory',
    targetType: 'shariahReview',
    targetId: 'review-001',
    outcome: 'success',
    module: 'shariah-review',
    route: '/api/v1/shariah-reviews/:reviewId/history',
    method: 'GET'
  };

  const protectedWriteEvent = createAccessAuditEvent(protectedWriteEventInput);
  const deniedEvent = createAccessAuditEvent(deniedEventInput);
  const sensitiveReadEvent = createAccessAuditEvent(sensitiveReadEventInput);

  await auditEventRepository.save(protectedWriteEvent);
  await auditEventRepository.save(deniedEvent);
  await auditEventRepository.save(sensitiveReadEvent);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 3, 'Items array should contain three events');

  // Check ordering: occurredAt ascending
  const items = responseBody.data.items;
  assert.strictEqual(items[0].eventId, 'denied-event');
  assert.strictEqual(items[0].occurredAt, '2026-04-01T10:00:00Z');
  assert.strictEqual(items[1].eventId, 'read-event');
  assert.strictEqual(items[1].occurredAt, '2026-04-02T10:00:00Z');
  assert.strictEqual(items[2].eventId, 'write-event');
  assert.strictEqual(items[2].occurredAt, '2026-04-03T10:00:00Z');
});

// New tests for Slice 1C - Event detail endpoint

test('should return event detail for authorized auditor with valid eventId', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with a comprehensive event
  const eventInput: CreateAccessAuditEventInput = {
    eventId: 'test-event-id',
    occurredAt: '2026-04-15T10:30:00Z',
    requestId: 'req-test-123',
    actorUserId: 'test-user-456',
    action: 'testAction',
    targetType: 'testTargetType',
    targetId: 'testTargetId',
    outcome: 'success',
    module: 'access-control',
    reason: 'test reason',
    route: '/api/v1/test-route',
    method: 'POST'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/events/test-event-id',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(responseBody.data.event, 'Response should have event object');

  const returnedEvent = responseBody.data.event;

  // Verify all required AccessAuditEvent fields are preserved
  assert.strictEqual(returnedEvent.eventId, event.eventId, 'eventId should be preserved');
  assert.strictEqual(returnedEvent.schemaVersion, event.schemaVersion, 'schemaVersion should be preserved');
  assert.strictEqual(returnedEvent.occurredAt, event.occurredAt, 'occurredAt should be preserved');
  assert.strictEqual(returnedEvent.requestId, event.requestId, 'requestId should be preserved');
  assert.strictEqual(returnedEvent.actorUserId, event.actorUserId, 'actorUserId should be preserved');
  assert.strictEqual(returnedEvent.actorSource, event.actorSource, 'actorSource should be preserved');
  assert.strictEqual(returnedEvent.action, event.action, 'action should be preserved');
  assert.strictEqual(returnedEvent.targetType, event.targetType, 'targetType should be preserved');
  assert.strictEqual(returnedEvent.targetId, event.targetId, 'targetId should be preserved');
  assert.strictEqual(returnedEvent.outcome, event.outcome, 'outcome should be preserved');
  assert.strictEqual(returnedEvent.module, event.module, 'module should be preserved');
  assert.strictEqual(returnedEvent.reason, event.reason, 'reason should be preserved');
  assert.strictEqual(returnedEvent.route, event.route, 'route should be preserved');
  assert.strictEqual(returnedEvent.method, event.method, 'method should be preserved');
  assert.strictEqual(returnedEvent.evidence.payloadHash, event.evidence.payloadHash, 'evidence.payloadHash should be preserved');
  assert.strictEqual(returnedEvent.evidence.canonicalization, event.evidence.canonicalization, 'evidence.canonicalization should be preserved');

  // Verify evidence object structure
  assert.ok(returnedEvent.evidence, 'evidence should be present');
  assert.ok(returnedEvent.evidence.payloadHash, 'evidence should have payloadHash');
  assert.ok(returnedEvent.evidence.canonicalization, 'evidence should have canonicalization');
});

test('should return 404 NOT_FOUND for missing eventId', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/events/missing-event-id',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 404);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
  assert.strictEqual(responseBody.error.message, 'Access audit event not found');
});

test('should deny access for non-auditor user requesting event detail', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with an event
  const eventInput: CreateAccessAuditEventInput = {
    eventId: 'test-event-id',
    requestId: 'req-123',
    actorUserId: 'user-456',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-789',
    outcome: 'success',
    module: 'access-control'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/events/test-event-id',
    headers: {
      'x-actor-id': 'normal-user',
      'x-actor-role': 'coordinator'
    }
  });

  assert.strictEqual(response.statusCode, 403);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
  assert.strictEqual(responseBody.error.message, 'User must have auditor role to query access history');
});

test('should not break existing access-history list endpoint after adding event detail endpoint', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with an event
  const eventInput: CreateAccessAuditEventInput = {
    requestId: 'req-123',
    actorUserId: 'user-456',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-789',
    outcome: 'success',
    module: 'access-control'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.ok(responseBody.data.items.length >= 1, 'Items array should contain at least one event');
});

// New tests for Slice 1C - Sequence endpoint

test('should return actor sequence for authorized auditor', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events for two actors
  const event1Input: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'actor-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'actor-2',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-2',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(responseBody.data.scope, 'Response should have scope object');
  assert.ok(responseBody.data.ordering, 'Response should have ordering object');
  assert.ok(responseBody.data.completeness, 'Response should have completeness object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.scope.type, 'actor');
  assert.strictEqual(responseBody.data.scope.actorUserId, 'actor-1');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].actorUserId, 'actor-1');
  assert.strictEqual(responseBody.data.ordering.primary, 'occurredAt');
  assert.strictEqual(responseBody.data.ordering.secondary, 'eventId');
  assert.strictEqual(responseBody.data.ordering.direction, 'ascending');
  assert.strictEqual(responseBody.data.completeness.status, 'unknown');
});

test('should return target sequence for authorized auditor', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events for two targets
  const event1Input: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'user-1',
    action: 'createRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'user-001:org-001:role-reviewer',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    requestId: 'req-2',
    actorUserId: 'user-2',
    action: 'createRoleAssignment',
    targetType: 'roleAssignment',
    targetId: 'user-002:org-002:role-coordinator',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);

  await auditEventRepository.save(event1);
  await auditEventRepository.save(event2);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=target&targetType=roleAssignment&targetId=user-001:org-001:role-reviewer',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(responseBody.data.scope, 'Response should have scope object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.scope.type, 'target');
  assert.strictEqual(responseBody.data.scope.targetType, 'roleAssignment');
  assert.strictEqual(responseBody.data.scope.targetId, 'user-001:org-001:role-reviewer');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].targetType, 'roleAssignment');
  assert.strictEqual(responseBody.data.items[0].targetId, 'user-001:org-001:role-reviewer');
});

test('should filter sequence by time range', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events before, inside, and after range
  const eventBeforeInput: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-before',
    actorUserId: 'actor-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const eventInsideInput: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-02T10:00:00Z',
    requestId: 'req-inside',
    actorUserId: 'actor-1',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const eventAfterInput: CreateAccessAuditEventInput = {
    occurredAt: '2026-04-03T10:00:00Z',
    requestId: 'req-after',
    actorUserId: 'actor-1',
    action: 'deleteRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const eventBefore = createAccessAuditEvent(eventBeforeInput);
  const eventInside = createAccessAuditEvent(eventInsideInput);
  const eventAfter = createAccessAuditEvent(eventAfterInput);

  await auditEventRepository.save(eventBefore);
  await auditEventRepository.save(eventInside);
  await auditEventRepository.save(eventAfter);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1&occurredFrom=2026-04-02T00:00:00Z&occurredTo=2026-04-02T23:59:59Z',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 1, 'Items array should contain one event');
  assert.strictEqual(responseBody.data.items[0].eventId, eventInside.eventId);
  assert.strictEqual(responseBody.data.items[0].occurredAt, '2026-04-02T10:00:00Z');
});

test('should return sequence in stable order', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with events out of order, including two with same occurredAt
  const event1Input: CreateAccessAuditEventInput = {
    eventId: 'zzz-early-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-1',
    actorUserId: 'actor-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event2Input: CreateAccessAuditEventInput = {
    eventId: 'aaa-late-event',
    occurredAt: '2026-04-03T10:00:00Z',
    requestId: 'req-2',
    actorUserId: 'actor-1',
    action: 'updateRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event3Input: CreateAccessAuditEventInput = {
    eventId: 'mid-event',
    occurredAt: '2026-04-02T10:00:00Z',
    requestId: 'req-3',
    actorUserId: 'actor-1',
    action: 'deleteRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  // Two events with same occurredAt but different eventIds
  const event4Input: CreateAccessAuditEventInput = {
    eventId: 'zzz-same-time-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-4',
    actorUserId: 'actor-1',
    action: 'assignRole',
    targetType: 'role',
    targetId: 'role-2',
    outcome: 'success',
    module: 'access-control'
  };

  const event5Input: CreateAccessAuditEventInput = {
    eventId: 'aaa-same-time-event',
    occurredAt: '2026-04-01T10:00:00Z',
    requestId: 'req-5',
    actorUserId: 'actor-1',
    action: 'revokeRole',
    targetType: 'role',
    targetId: 'role-3',
    outcome: 'success',
    module: 'access-control'
  };

  const event1 = createAccessAuditEvent(event1Input);
  const event2 = createAccessAuditEvent(event2Input);
  const event3 = createAccessAuditEvent(event3Input);
  const event4 = createAccessAuditEvent(event4Input);
  const event5 = createAccessAuditEvent(event5Input);

  // Save in random order
  await auditEventRepository.save(event1);
  await auditEventRepository.save(event3);
  await auditEventRepository.save(event5);
  await auditEventRepository.save(event2);
  await auditEventRepository.save(event4);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 5, 'Items array should contain five events');

  // Check ordering: occurredAt ascending, then eventId ascending
  const items = responseBody.data.items;

  // First three items have the same occurredAt and should be ordered by eventId
  assert.strictEqual(items[0].eventId, 'aaa-same-time-event');
  assert.strictEqual(items[0].occurredAt, '2026-04-01T10:00:00Z');
  assert.strictEqual(items[1].eventId, 'zzz-early-event');
  assert.strictEqual(items[1].occurredAt, '2026-04-01T10:00:00Z');
  assert.strictEqual(items[2].eventId, 'zzz-same-time-event');
  assert.strictEqual(items[2].occurredAt, '2026-04-01T10:00:00Z');

  // Next items should be ordered by occurredAt
  assert.strictEqual(items[3].eventId, 'mid-event');
  assert.strictEqual(items[3].occurredAt, '2026-04-02T10:00:00Z');
  assert.strictEqual(items[4].eventId, 'aaa-late-event');
  assert.strictEqual(items[4].occurredAt, '2026-04-03T10:00:00Z');
});

test('should return empty sequence for authorized auditor with no matching events', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with one unrelated event
  const eventInput: CreateAccessAuditEventInput = {
    requestId: 'req-1',
    actorUserId: 'actor-1',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-1',
    outcome: 'success',
    module: 'access-control'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=non-existent-actor',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  assert.ok(responseBody.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody.data.items), 'Response should have items array');
  assert.strictEqual(responseBody.data.items.length, 0, 'Items array should be empty');
  assert.strictEqual(responseBody.data.completeness.status, 'unknown');
});

test('should deny access for non-auditor user requesting sequence', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1',
    headers: {
      'x-actor-id': 'normal-user',
      'x-actor-role': 'coordinator'
    }
  });

  assert.strictEqual(response.statusCode, 403);

  const responseBody = response.json();
  assert.ok(responseBody.error, 'Response should have error object');
  assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
  assert.strictEqual(responseBody.error.message, 'User must have auditor role to query access history');
});

test('should reject invalid sequence requests with validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  // Test missing scope
  const response1 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response1.statusCode, 400);
  const responseBody1 = response1.json();
  assert.ok(responseBody1.error, 'Response should have error object');
  assert.strictEqual(responseBody1.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody1, 'scope', 'Scope is required'));

  // Test invalid scope
  const response2 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=invalid',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response2.statusCode, 400);
  const responseBody2 = response2.json();
  assert.ok(responseBody2.error, 'Response should have error object');
  assert.strictEqual(responseBody2.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody2, 'scope', 'Invalid scope value'));

  // Test actor scope missing actorUserId
  const response3 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response3.statusCode, 400);
  const responseBody3 = response3.json();
  assert.ok(responseBody3.error, 'Response should have error object');
  assert.strictEqual(responseBody3.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody3, 'actorUserId', 'actorUserId is required for actor scope'));

  // Test target scope missing targetType
  const response4 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=target&targetId=some-id',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response4.statusCode, 400);
  const responseBody4 = response4.json();
  assert.ok(responseBody4.error, 'Response should have error object');
  assert.strictEqual(responseBody4.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody4, 'targetType', 'targetType is required for target scope'));

  // Test target scope missing targetId
  const response5 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=target&targetType=some-type',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response5.statusCode, 400);
  const responseBody5 = response5.json();
  assert.ok(responseBody5.error, 'Response should have error object');
  assert.strictEqual(responseBody5.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody5, 'targetId', 'targetId is required for target scope'));

  // Test actor scope with target parameters
  const response6 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1&targetType=some-type',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response6.statusCode, 400);
  const responseBody6 = response6.json();
  assert.ok(responseBody6.error, 'Response should have error object');
  assert.strictEqual(responseBody6.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody6, 'targetType', 'targetType is not allowed for actor scope'));

  // Test target scope with actor parameters
  const response7 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=target&targetType=some-type&targetId=some-id&actorUserId=actor-1',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response7.statusCode, 400);
  const responseBody7 = response7.json();
  assert.ok(responseBody7.error, 'Response should have error object');
  assert.strictEqual(responseBody7.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody7, 'actorUserId', 'actorUserId is not allowed for target scope'));

  // Test invalid timestamp
  const response8 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1&occurredFrom=not-a-date',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response8.statusCode, 400);
  const responseBody8 = response8.json();
  assert.ok(responseBody8.error, 'Response should have error object');
  assert.strictEqual(responseBody8.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody8, 'occurredFrom', 'Invalid date format'));

  // Test invalid time range
  const response9 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1&occurredFrom=2026-05-02T00:00:00Z&occurredTo=2026-05-01T00:00:00Z',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response9.statusCode, 400);
  const responseBody9 = response9.json();
  assert.ok(responseBody9.error, 'Response should have error object');
  assert.strictEqual(responseBody9.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody9, 'occurredFrom', 'occurredFrom must be less than or equal to occurredTo'));

  // Test unknown query parameter
  const response10 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history/sequences?scope=actor&actorUserId=actor-1&unknown=value',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response10.statusCode, 400);
  const responseBody10 = response10.json();
  assert.ok(responseBody10.error, 'Response should have error object');
  assert.strictEqual(responseBody10.error.code, 'VALIDATION_ERROR');
  assert.ok(hasIssueContaining(responseBody10, 'unknown', 'Unsupported query parameter'));
});

test('should not break existing access-history routes after adding sequence endpoint', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  // Seed repository with an event
  const eventInput: CreateAccessAuditEventInput = {
    requestId: 'req-123',
    actorUserId: 'user-456',
    action: 'createRole',
    targetType: 'role',
    targetId: 'role-789',
    outcome: 'success',
    module: 'access-control'
  };

  const event = createAccessAuditEvent(eventInput);
  await auditEventRepository.save(event);

  const server = createTestableServer({
    accessAuditEventRepository: auditEventRepository
  });

  await server.ready();

  // Test existing access-history endpoint
  const response1 = await server.inject({
    method: 'GET',
    url: '/api/v1/access-history',
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response1.statusCode, 200);

  const responseBody1 = response1.json();
  assert.ok(responseBody1.data, 'Response should have data object');
  assert.ok(Array.isArray(responseBody1.data.items), 'Response should have items array');
  assert.ok(responseBody1.data.items.length >= 1, 'Items array should contain at least one event');

  // Test existing event detail endpoint
  const response2 = await server.inject({
    method: 'GET',
    url: `/api/v1/access-history/events/${event.eventId}`,
    headers: {
      'x-actor-id': 'auditor-user',
      'x-actor-role': 'auditor'
    }
  });

  assert.strictEqual(response2.statusCode, 200);

  const responseBody2 = response2.json();
  assert.ok(responseBody2.data, 'Response should have data object');
  assert.ok(responseBody2.data.event, 'Response should have event object');
  assert.strictEqual(responseBody2.data.event.eventId, event.eventId);
});
