import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { UserStatusLookup } from '../../shared/application/user-status-lookup.js';
import type { MemberStatusLookup } from '../../shared/application/member-status-lookup.js';
import type { RoleAssignment } from '../domain/role-assignment.js';

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

// Create test server with mock audit callback and in-memory repositories
const testServer = createTestableServer({ 
  roleAudit: mockAuditCallback,
  roleRepository: new InMemoryRoleRepository(),
  roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
  memberRepository: new InMemoryMemberOrganizationRepository(),
  userStatusLookup: new TestUserStatusLookup(),
  memberStatusLookup: new TestMemberStatusLookup()
});

before(async () => {
  await testServer.ready();
});

test('should return 400 with standardized validation error for immutable field update', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // First create a role to update
  const createResponse = await testServer.inject({
    method: 'POST',
    url: '/api/v1/roles',
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      roleCode: 'test-role-immutable', // Unique roleCode
      displayName: 'Test Role',
      scope: 'organization',
      permissions: ['read', 'write'],
      status: 'active',
      isSystemReserved: false
    }
  });

  assert.strictEqual(createResponse.statusCode, 201);
  const createdRole = createResponse.json().data;

  // Try to update an immutable field
  const response = await testServer.inject({
    method: 'PATCH',
    url: `/api/v1/roles/${createdRole.id}`,
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      roleCode: 'new-code' // This is an immutable field
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  
  // Assert standardized validation error envelope
  assert.ok(responseBody.error, 'Response should have an error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR', 'Error code should be VALIDATION_ERROR');
  assert.strictEqual(typeof responseBody.error.message, 'string', 'Error message should be a string');
  assert.ok(responseBody.error.message.includes('Cannot update immutable field'), 'Error message should mention immutable field');
  assert.ok(Array.isArray(responseBody.error.details.issues), 'Error details should have issues array');
  assert.strictEqual(responseBody.error.details.issues.length, 0, 'Error details should have no issues');

  // Note: No audit event is emitted for this validation error as it occurs before audit
});

test('should return 400 with standardized validation error for invalid roleId in assignment', async () => {
  // Reset captured events
  capturedAuditEvents = [];

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

test('should return 400 with standardized validation error for same current/new role IDs', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // First create a role
  const createResponse = await testServer.inject({
    method: 'POST',
    url: '/api/v1/roles',
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      roleCode: 'test-role-same-role', // Unique roleCode
      displayName: 'Test Role',
      scope: 'organization',
      permissions: ['read', 'write'],
      status: 'active',
      isSystemReserved: false
    }
  });

  assert.strictEqual(createResponse.statusCode, 201);
  const createdRole = createResponse.json().data;

  // Try to change role assignment with same current and new role IDs
  const response = await testServer.inject({
    method: 'PATCH',
    url: '/api/v1/role-assignments/change',
    headers: {
      'x-actor-role': 'admin'
    },
    payload: {
      userId: 'user-123',
      organizationId: 'org-123',
      currentRoleId: createdRole.id,
      newRoleId: createdRole.id // Same as currentRoleId
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 400);

  const responseBody = response.json();
  
  // Assert standardized validation error envelope
  assert.ok(responseBody.error, 'Response should have an error object');
  assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR', 'Error code should be VALIDATION_ERROR');
  assert.strictEqual(typeof responseBody.error.message, 'string', 'Error message should be a string');
  assert.ok(responseBody.error.message.includes('Current and new role IDs must be different'), 'Error message should mention role IDs must be different');
  assert.ok(Array.isArray(responseBody.error.details.issues), 'Error details should have issues array');
  assert.strictEqual(responseBody.error.details.issues.length, 0, 'Error details should have no issues');
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

test('should deny role assignment change when actor user is inactive', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create first role directly in the repository
  const persistedCurrentRole = await roleRepository.save({
    roleCode: 'test-role-change-1',
    displayName: 'Test Role 1',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create second role directly in the repository
  const persistedNewRole = await roleRepository.save({
    roleCode: 'test-role-change-2',
    displayName: 'Test Role 2',
    scope: 'organization',
    permissions: ['write'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-006',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create an existing role assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedCurrentRole.id,
    status: 'active'
  };
  await roleAssignmentRepository.save(assignment);

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
    method: 'PATCH',
    url: '/api/v1/role-assignments/change',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'inactive-actor'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      currentRoleId: persistedCurrentRole.id,
      newRoleId: persistedNewRole.id
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
  assert.strictEqual(auditEvent.action, 'changeRoleAssignment', 'Audit event should have correct action');
  assert.strictEqual(auditEvent.targetType, 'roleAssignment', 'Audit event should have correct targetType');
  assert.strictEqual(typeof auditEvent.targetId, 'string', 'Audit event should have targetId as string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string', 'Audit event should have timestamp as string');
  assert.strictEqual(typeof auditEvent.requestId, 'string', 'Audit event should have requestId as string');
  assert.strictEqual(auditEvent.outcome, 'forbidden', 'Audit event should have forbidden outcome');
  assert.strictEqual(auditEvent.actorId, 'inactive-actor', 'Audit event should have correct actorId');
  assert.strictEqual(auditEvent.reason, 'userInactive', 'Audit event should have correct reason');
});

test('should deny role assignment change when target organization is suspended', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create first role directly in the repository
  const persistedCurrentRole = await roleRepository.save({
    roleCode: 'test-role-1',
    displayName: 'Test Role 1',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create second role directly in the repository
  const persistedNewRole = await roleRepository.save({
    roleCode: 'test-role-2',
    displayName: 'Test Role 2',
    scope: 'organization',
    permissions: ['write'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-003',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create an existing role assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedCurrentRole.id,
    status: 'active'
  };
  await roleAssignmentRepository.save(assignment);

  // Create test server with active actor user and suspended organization
  const testServerWithSuspendedOrg = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'suspended']]))
  });

  await testServerWithSuspendedOrg.ready();

  const response = await testServerWithSuspendedOrg.inject({
    method: 'PATCH',
    url: '/api/v1/role-assignments/change',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'active-actor'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      currentRoleId: persistedCurrentRole.id,
      newRoleId: persistedNewRole.id
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
  assert.strictEqual(auditEvent.action, 'changeRoleAssignment', 'Audit event should have correct action');
  assert.strictEqual(auditEvent.targetType, 'roleAssignment', 'Audit event should have correct targetType');
  assert.strictEqual(typeof auditEvent.targetId, 'string', 'Audit event should have targetId as string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string', 'Audit event should have timestamp as string');
  assert.strictEqual(typeof auditEvent.requestId, 'string', 'Audit event should have requestId as string');
  assert.strictEqual(auditEvent.outcome, 'forbidden', 'Audit event should have forbidden outcome');
  assert.strictEqual(auditEvent.actorId, 'active-actor', 'Audit event should have correct actorId');
  assert.strictEqual(auditEvent.reason, 'organizationSuspended', 'Audit event should have correct reason');
});

test('should allow role assignment change when actor user and target organization are active', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create first role directly in the repository
  const persistedCurrentRole = await roleRepository.save({
    roleCode: 'test-role-change-success-1',
    displayName: 'Test Role 1',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create second role directly in the repository
  const persistedNewRole = await roleRepository.save({
    roleCode: 'test-role-change-success-2',
    displayName: 'Test Role 2',
    scope: 'organization',
    permissions: ['write'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-007',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create an existing role assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedCurrentRole.id,
    status: 'active'
  };
  await roleAssignmentRepository.save(assignment);

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
    method: 'PATCH',
    url: '/api/v1/role-assignments/change',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'active-actor'
    },
    payload: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      currentRoleId: persistedCurrentRole.id,
      newRoleId: persistedNewRole.id
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  
  // Assert successful change
  assert.ok(responseBody.data, 'Response should have data');
  assert.ok(responseBody.data.oldAssignment, 'Response should have oldAssignment');
  assert.ok(responseBody.data.newAssignment, 'Response should have newAssignment');
  assert.strictEqual(responseBody.data.oldAssignment.status, 'revoked', 'Old assignment should be revoked');
  assert.strictEqual(responseBody.data.newAssignment.status, 'active', 'New assignment should be active');

  // Assert that an audit event was emitted
  assert.ok(capturedAuditEvents.length > 0, 'An audit event should be emitted');
  const auditEvent = capturedAuditEvents[capturedAuditEvents.length - 1];
  assert.strictEqual(auditEvent.outcome, 'success', 'Audit event should have success outcome');
  assert.strictEqual(auditEvent.actorId, 'active-actor', 'Audit event should have correct actorId');
});

test('should deny role assignment removal when actor user is inactive', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create a role directly in the repository
  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-remove',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-004',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create an existing role assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };
  await roleAssignmentRepository.save(assignment);

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
    method: 'DELETE',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'inactive-actor'
    },
    query: {
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
  assert.strictEqual(auditEvent.action, 'removeRoleAssignment', 'Audit event should have correct action');
  assert.strictEqual(auditEvent.targetType, 'roleAssignment', 'Audit event should have correct targetType');
  assert.strictEqual(typeof auditEvent.targetId, 'string', 'Audit event should have targetId as string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string', 'Audit event should have timestamp as string');
  assert.strictEqual(typeof auditEvent.requestId, 'string', 'Audit event should have requestId as string');
  assert.strictEqual(auditEvent.outcome, 'forbidden', 'Audit event should have forbidden outcome');
  assert.strictEqual(auditEvent.actorId, 'inactive-actor', 'Audit event should have correct actorId');
  assert.strictEqual(auditEvent.reason, 'userInactive', 'Audit event should have correct reason');
});

test('should deny role assignment removal when target organization is deleted', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create a role directly in the repository
  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-remove-deleted',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-008',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create an existing role assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };
  await roleAssignmentRepository.save(assignment);

  // Create test server with active actor user and deleted organization
  const testServerWithDeletedOrg = createTestableServer({ 
    roleAudit: mockAuditCallback,
    roleRepository,
    roleAssignmentRepository,
    memberRepository,
    userStatusLookup: new TestUserStatusLookup(new Map([['active-actor', 'active']])),
    memberStatusLookup: new TestMemberStatusLookup(new Map([[persistedOrganization.id, 'deleted']]))
  });

  await testServerWithDeletedOrg.ready();

  const response = await testServerWithDeletedOrg.inject({
    method: 'DELETE',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'active-actor'
    },
    query: {
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
  assert.strictEqual(auditEvent.action, 'removeRoleAssignment', 'Audit event should have correct action');
  assert.strictEqual(auditEvent.targetType, 'roleAssignment', 'Audit event should have correct targetType');
  assert.strictEqual(typeof auditEvent.targetId, 'string', 'Audit event should have targetId as string');
  assert.strictEqual(typeof auditEvent.timestamp, 'string', 'Audit event should have timestamp as string');
  assert.strictEqual(typeof auditEvent.requestId, 'string', 'Audit event should have requestId as string');
  assert.strictEqual(auditEvent.outcome, 'forbidden', 'Audit event should have forbidden outcome');
  assert.strictEqual(auditEvent.actorId, 'active-actor', 'Audit event should have correct actorId');
  assert.strictEqual(auditEvent.reason, 'organizationDeleted', 'Audit event should have correct reason');
});

test('should allow role assignment removal when actor user and target organization are active', async () => {
  // Reset captured events
  capturedAuditEvents = [];

  // Create repositories for this test
  const roleRepository = new InMemoryRoleRepository();
  const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
  const memberRepository = new InMemoryMemberOrganizationRepository();

  // Create a role directly in the repository
  const persistedRole = await roleRepository.save({
    roleCode: 'test-role-remove-success',
    displayName: 'Test Role',
    scope: 'organization',
    permissions: ['read'],
    status: 'active',
    isSystemReserved: false
  });

  // Create an organization directly in the repository
  const persistedOrganization = await memberRepository.saveDraft({
    registrationNumber: 'REG-TEST-009',
    legalName: 'Test Organization',
    organizationType: 'Corporation',
    status: 'pendingReview'
  });

  // Create an existing role assignment
  const assignment: RoleAssignment = {
    userId: 'target-user',
    organizationId: persistedOrganization.id,
    roleId: persistedRole.id,
    status: 'active'
  };
  await roleAssignmentRepository.save(assignment);

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
    method: 'DELETE',
    url: '/api/v1/role-assignments',
    headers: {
      'x-actor-role': 'admin',
      'x-actor-id': 'active-actor'
    },
    query: {
      userId: 'target-user',
      organizationId: persistedOrganization.id,
      roleId: persistedRole.id
    }
  });

  // Assert response
  assert.strictEqual(response.statusCode, 200);

  const responseBody = response.json();
  
  // Assert successful removal
  assert.ok(responseBody.data, 'Response should have data');
  assert.strictEqual(responseBody.data.status, 'revoked', 'Assignment should be revoked');

  // Assert that an audit event was emitted
  assert.ok(capturedAuditEvents.length > 0, 'An audit event should be emitted');
  const auditEvent = capturedAuditEvents[capturedAuditEvents.length - 1];
  assert.strictEqual(auditEvent.outcome, 'success', 'Audit event should have success outcome');
  assert.strictEqual(auditEvent.actorId, 'active-actor', 'Audit event should have correct actorId');
});
