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
