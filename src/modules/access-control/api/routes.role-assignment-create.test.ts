import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';
import type { RoleAssignment } from '../domain/role-assignment.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';
import { InMemoryUserExistenceLookup } from '../../membership/infrastructure/in-memory-user-existence-lookup.js';
import { InMemoryOrganizationMembershipLookup } from '../../membership/infrastructure/in-memory-organization-membership-lookup.js';

// Test double implementations for status lookups
class TestUserStatusLookup implements UserStatusLookup {
  private readonly statuses: Map<string, 'active' | 'inactive' | null>;
  
  constructor(statuses: Map<string, 'active' | 'inactive' | null> = new Map()) {
    this.statuses = statuses;
  }
  
  async getUserStatus(userId: string): Promise<'active' | 'inactive' | null> {
    return this.statuses.get(userId) ?? null;
  }
}

class TestMemberStatusLookup implements MemberStatusLookup {
  private readonly statuses: Map<string, 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null>;
  
  constructor(statuses: Map<string, 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null> = new Map()) {
    this.statuses = statuses;
  }
  
  async getMemberOrganizationStatus(organizationId: string): Promise<'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted' | null> {
    return this.statuses.get(organizationId) ?? null;
  }
}

// Mock audit callback to capture audit events
let capturedAuditEvents: any[] = [];
const mockAuditCallback = (event: any) => {
  capturedAuditEvents.push(event);
};

test('should return 400 with standardized validation error for invalid roleId in assignment', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  const testServer = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository: new InMemoryRoleRepository(),
    roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
    memberRepository: new InMemoryMemberOrganizationRepository(),
    userStatusLookup: new TestUserStatusLookup(),
    memberStatusLookup: new TestMemberStatusLookup()
  });

  await testServer.ready();

  const response = await testServer.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      userId: 'user-123',
      organizationId: 'org-123',
      roleId: 'nonexistent-role-id'
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  
  // Assert standardized validation error envelope
  assert.ok(responseBody.error, 'Response should have an error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR', 'Error code should be VALIDATION_ERROR');
  assert.strictEqual(typeof responseBody.error.message, 'string', 'Error message should be a string');
  assert.ok(responseBody.error.message.includes('Invalid roleId'), 'Error message should mention invalid roleId');
  assert.ok(Array.isArray(responseBody.error.details.issues), 'Error details should have issues array');
  assert.strictEqual(responseBody.error.details.issues.length, 0, 'Error details should have no issues');

  // Assert that an audit event was emitted
  assert.ok(capturedAuditEvents.length > 0, 'An audit event should be emitted');
});

// New tests for deactivation-aware access evaluation

test('should deny role assignment creation when actor user is inactive', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create a role directly in the repository
  const persistedRole = await roleRepository.save({
    roleCode: 'test-role',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-001',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create test server with inactive actor user
  const testServerWithInactiveActor = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userStatusLookup: new TestUserStatusLookup(new Map([['inactive-actor', 'inactive']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'active']]))
  });

  await testServerWithInactiveActor.ready();

  const response = await testServerWithInactiveActor.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'inactive-actor'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 403);

  const responseBody = response.json();
  
  // Assert forbidden error envelope
  assert.ok(responseBody.error, 'Response should have an error object');
  assert.strictEqual(responseBody.error.code, 'FORBIDDEN', 'Error code should be FORBIDDEN');
  assert.strictEqual(typeof responseBody.error.message, 'string', 'Error message should be a string');

  // Assert that an audit event was emitted with correct fields
  assert.ok(capturedAuditEvents.length > 0, 'An audit event should be emitted');
  const auditEvent = capturedAuditEvents[capturedAuditEvents.length - 1];
  assert.strictEqual(auditEvent.action, 'createRoleAssignment', 'Audit event should have correct action');
  assert.strictEqual(auditEvent.targetType, 'roleAssignment', 'Audit event should have correct targetType');
  assert.strictEqual(typeof auditEvent.targetId, 'string', 'Audit event should have targetId as string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string', 'Audit event should have timestamp as string');
  assert.strictEqual(typeof auditEvent.requestId, 'string', 'Audit event should have requestId as string');
  assert.strictEqual(auditEvent.outcome, 'forbidden', 'Audit event should have forbidden outcome');
  assert.strictEqual(auditEvent.actorId, 'inactive-actor', 'Audit event should have correct actorId');
  assert.strictEqual(auditEvent.reason, 'userInactive', 'Audit event should have correct reason');
});

test('should deny role assignment creation when target organization is inactive', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create a role directly in the repository
  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-org-inactive',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-005',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create test server with active actor user and inactive organization
  const testServerWithInactiveOrg = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'inactive']]))
  });

  await testServerWithInactiveOrg.ready();

  const response = await testServerWithInactiveOrg.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'active-actor'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 403);

  const responseBody = response.json();
  
  // Assert forbidden error envelope
  assert.ok(responseBody.error, 'Response should have an error object');
  assert.strictEqual(responseBody.error.code, 'FORBIDDEN', 'Error code should be FORBIDDEN');
  assert.strictEqual(typeof responseBody.error.message, 'string', 'Error message should be a string');
  assert.ok(responseBody.error.message.includes('Organization is inactive'), 'Error message should mention organization is inactive');

  // Assert that an audit event was emitted with correct fields
  assert.ok(capturedAuditEvents.length > 0, 'An audit event should be emitted');
  const auditEvent = capturedAuditEvents[capturedAuditEvents.length - 1];
  assert.strictEqual(auditEvent.action, 'createRoleAssignment', 'Audit event should have correct action');
  assert.strictEqual(auditEvent.targetType, 'roleAssignment', 'Audit event should have correct targetType');
  assert.strictEqual(typeof auditEvent.targetId, 'string', 'Audit event should have targetId as string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string', 'Audit event should have timestamp as string');
  assert.strictEqual(typeof auditEvent.requestId, 'string', 'Audit event should have requestId as string');
  assert.strictEqual(auditEvent.outcome, 'forbidden', 'Audit event should have forbidden outcome');
  assert.strictEqual(auditEvent.actorId, 'active-actor', 'Audit event should have correct actorId');
  assert.strictEqual(auditEvent.reason, 'organizationInactive', 'Audit event should have correct reason');
});

test('should allow role assignment creation when actor user and target organization are active', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create a role directly in the repository
  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-active',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-002',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create test server with active actor user and organization
  const testServerWithActiveEntities = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'active']]))
  });

  await testServerWithActiveEntities.ready();

  const response = await testServerWithActiveEntities.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'active-actor'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 201);

  const responseBody = response.json();
  
  // Assert successful creation
  assert.ok(responseBody.data, 'Response should have data');
  assert.strictEqual(responseBody.data.status, 'active', 'Assignment should be active');

  // Assert that an audit event was emitted
  assert.ok(capturedAuditEvents.length > 0, 'An audit event should be emitted');
  const auditEvent = capturedAuditEvents[capturedAuditEvents.length - 1];
  assert.strictEqual(auditEvent.outcome, 'success', 'Audit event should have success outcome');
  assert.strictEqual(auditEvent.actorId, 'active-actor', 'Audit event should have correct actorId');
});

// New tests for shared access audit events for role assignment creation
test('should persist shared access audit event for successful role assignment creation', async () => {
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-assignment-success',
    displayName: 'Test Role Assignment Success',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG123',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  const userExistenceLookup = new InMemoryUserExistenceLookup({ existingUserIds: ['target-user'] });
  const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({ 
    memberships: [{ userId: 'target-user', organizationId: persistedOrganization.id }] 
  });
  
  const server = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userExistenceLookup,
    organizationMembershipLookup,
    accessAuditEventRepository: auditEventRepository
  });
  
  await server.ready();

  // Create role assignment
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'test-admin-123'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  assert.strictEqual(response.statusCode, 201);
  
  const events = await auditEventRepository.list();
  const event = events.at(-1); // Get the last event
  assert.ok(event);
  
  assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
  assert.strictEqual(event.module, 'access-control');
  assert.strictEqual(event.action, 'createRoleAssignment');
  assert.strictEqual(event.targetType, 'roleAssignment');
  assert.strictEqual(event.outcome, 'success');
  assert.strictEqual(event.actorUserId, 'test-admin-123');
  assert.ok(event.requestId);
  assert.ok(event.occurredAt);
  assert.ok(event.evidence.payloadHash);
  assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
  assert.strictEqual(event.route, '/api/v1/role-assignments');
  assert.strictEqual(event.method, 'POST');
  assert.strictEqual(event.targetId, `target-user:${persistedOrganization.id}:${persistedRole.id}`);
});

test('should persist shared access audit event for forbidden role assignment creation', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();
  
  const server = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository: new InMemoryRoleRepository(),
    roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
    memberRepository: new InMemoryMemberOrganizationRepository(),
    accessAuditEventRepository: auditEventRepository
  });
  
  await server.ready();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'user', // Non-admin role
      'x-actor-id': 'test-user-456'
    },
    payload: {
      userId: 'target-user',
      organizationId: 'test-org-id',
      roleId: 'test-role-id'
    }
  });

  assert.strictEqual(response.statusCode, 403);
  
  const events = await auditEventRepository.list();
  const event = events.at(-1); // Get the last event
  assert.ok(event);
  
  assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
  assert.strictEqual(event.module, 'access-control');
  assert.strictEqual(event.action, 'createRoleAssignment');
  assert.strictEqual(event.targetType, 'roleAssignment');
  assert.strictEqual(event.outcome, 'forbidden');
  assert.strictEqual(event.reason, 'admin_required');
  assert.strictEqual(event.actorUserId, 'test-user-456');
  assert.ok(event.requestId);
  assert.ok(event.occurredAt);
  assert.ok(event.evidence.payloadHash);
  assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
  assert.strictEqual(event.route, '/api/v1/role-assignments');
  assert.strictEqual(event.method, 'POST');
  assert.strictEqual(event.targetId, 'unknown');
});

test('should persist shared access audit event for duplicate role assignment creation', async () => {
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();
  const auditEventRepository = new InMemoryAccessAuditEventRepository();

  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-assignment-duplicate',
    displayName: 'Test Role Assignment Duplicate',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG124',
    legalName: 'Test Organization 2',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  const userExistenceLookup = new InMemoryUserExistenceLookup({ existingUserIds: ['target-user'] });
  const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({ 
    memberships: [{ userId: 'target-user', organizationId: persistedOrganization.id }] 
  });
  
  const server = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userExistenceLookup,
    organizationMembershipLookup,
    accessAuditEventRepository: auditEventRepository
  });
  
  await server.ready();

  // Create first role assignment
  const firstAssignmentResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  assert.strictEqual(firstAssignmentResponse.statusCode, 201);

  // Try to create the same role assignment again
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'test-admin-789'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  assert.strictEqual(response.statusCode, 409);
  
  const events = await auditEventRepository.list();
  const event = events.at(-1); // Get the last event
  assert.ok(event);
  
  assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
  assert.strictEqual(event.module, 'access-control');
  assert.strictEqual(event.action, 'createRoleAssignment');
  assert.strictEqual(event.targetType, 'roleAssignment');
  assert.strictEqual(event.outcome, 'conflict');
  assert.strictEqual(event.reason, 'duplicate_assignment');
  assert.strictEqual(event.actorUserId, 'test-admin-789');
  assert.ok(event.requestId);
  assert.ok(event.occurredAt);
  assert.ok(event.evidence.payloadHash);
  assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
  assert.strictEqual(event.route, '/api/v1/role-assignments');
  assert.strictEqual(event.method, 'POST');
  assert.strictEqual(event.targetId, `target-user:${persistedOrganization.id}:${persistedRole.id}`);
});

test('should persist shared access audit event for role not found validation error', async () => {
  const auditEventRepository = new InMemoryAccessAuditEventRepository();
  
  const server = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository: new InMemoryRoleRepository(),
    roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
    memberRepository: new InMemoryMemberOrganizationRepository(),
    accessAuditEventRepository: auditEventRepository
  });
  
  await server.ready();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'test-admin-123'
    },
    payload: {
      userId: 'target-user',
      organizationId: 'test-org-id',
      roleId: 'non-existent-role-id'
    }
  });

  assert.strictEqual(response.statusCode, 400);
  
  const events = await auditEventRepository.list();
  const event = events.at(-1); // Get the last event
  assert.ok(event);
  
  assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
  assert.strictEqual(event.module, 'access-control');
  assert.strictEqual(event.action, 'createRoleAssignment');
  assert.strictEqual(event.targetType, 'roleAssignment');
  assert.strictEqual(event.outcome, 'validationError');
  assert.strictEqual(event.reason, 'role_not_found');
  assert.strictEqual(event.actorUserId, 'test-admin-123');
  assert.ok(event.requestId);
  assert.ok(event.occurredAt);
  assert.ok(event.evidence.payloadHash);
  assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
  assert.strictEqual(event.route, '/api/v1/role-assignments');
  assert.strictEqual(event.method, 'POST');
  assert.strictEqual(event.targetId, 'target-user:test-org-id:non-existent-role-id');
});

test('should work without accessAuditEventRepository for role assignment backward compatibility', async () => {
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  const persistedRole = await roleRepository.save({
    roleCode: 'backward-compat-test-role',
    displayName: 'Backward Compatibility Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG125',
    legalName: 'Test Organization 3',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  const userExistenceLookup = new InMemoryUserExistenceLookup({ existingUserIds: ['target-user'] });
  const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({ 
    memberships: [{ userId: 'target-user', organizationId: persistedOrganization.id }] 
  });
  
  // Create server without accessAuditEventRepository
  const server = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userExistenceLookup,
    organizationMembershipLookup
  });
  
  await server.ready();

  // Create role assignment
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  assert.strictEqual(response.statusCode, 201);
  
  const responseBody = response.json();
  assert.strictEqual(responseBody.data.status, 'active');
});
