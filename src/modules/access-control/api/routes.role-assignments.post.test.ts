import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { MemberOrganization } from '../../membership/domain/member-organization.js';
import { InMemoryUserExistenceLookup } from '../../membership/infrastructure/in-memory-user-existence-lookup.js';
import { InMemoryOrganizationMembershipLookup } from '../../membership/infrastructure/in-memory-organization-membership-lookup.js';

describe('POST /api/v1/role-assignments', () => {
  test('should create a role assignment successfully', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);

    // Assert that the response contains the correct data
    assert.strictEqual(responseBody.data.userId, assignmentPayload.userId);
    assert.strictEqual(responseBody.data.organizationId, assignmentPayload.organizationId);
    assert.strictEqual(responseBody.data.roleId, assignmentPayload.roleId);
    assert.strictEqual(responseBody.data.status, 'active');
  });

  test('should return conflict when creating duplicate active role assignment', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    // First request
    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Second request with same userId, organizationId, and roleId
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(secondResponse.statusCode, 409);
    const responseBody = secondResponse.json();
    assert.strictEqual(responseBody.error.code, 'CONFLICT');
    assert.strictEqual(responseBody.error.message, 'Role assignment already exists');
  });

  test('should return 400 when required fields are missing', async () => {
    const server = createTestableServer();

    // Test with missing userId
    const response1 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        organizationId: 'org_456',
        roleId: 'role_789'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response1.statusCode, 400);

    // Test with missing organizationId
    const response2 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        userId: 'user_123',
        roleId: 'role_789'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response2.statusCode, 400);

    // Test with missing roleId
    const response3 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        userId: 'user_123',
        organizationId: 'org_456'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response3.statusCode, 400);

    // Test with completely empty payload
    const response4 = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {},
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response4.statusCode, 400);
  });

  test('should allow new assignment when previous assignment was revoked', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository
    });

    // create role through the same server
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    await assignmentRepository.save({
      userId: 'user_123',
      organizationId: persistedOrganization.id,
      roleId,
      status: 'revoked'
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        userId: 'user_123',
        organizationId: persistedOrganization.id,
        roleId
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, persistedOrganization.id);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'active');
  });

  test('should return 400 when role does not exist', async () => {
    const server = createTestableServer();

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: 'non-existent-role-id'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid roleId: Role does not exist');
  });

  test('should return 400 when organization does not exist', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: 'non-existent-org-id',
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid organizationId: Member organization does not exist');
  });

  test('should return 400 for non-existent user in role assignment', async () => {
    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations with no existing users
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: [] // No existing users
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [] // No memberships
    });

    // Create test server with injected lookups
    const server = createTestableServer({
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Try to create a role assignment with a non-existent user
    const assignmentPayload = {
      userId: 'non-existent-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid userId: User does not exist');
  });

  test('should return 400 for user not member of organization in role assignment', async () => {
    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations with existing user but no membership
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['existing-user']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [] // User is not a member of any organization
    });

    // Create test server with injected lookups
    const server = createTestableServer({
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Try to create a role assignment with a user that exists but is not a member of the organization
    const assignmentPayload = {
      userId: 'existing-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid userId: User is not a member of the specified organization');
  });

  test('should create role assignment when user exists and is member of organization', async () => {
    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['user1'] // User exists
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [{ userId: 'user1', organizationId: persistedOrganization.id }] // User is member of organization
    });

    // Create test server with injected lookups
    const server = createTestableServer({
      memberRepository: memberOrganizationRepository,
      userExistenceLookup,
      organizationMembershipLookup
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a role assignment with a user that exists and is a member of the organization
    const assignmentPayload = {
      userId: 'user1',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.strictEqual(responseBody.data.userId, 'user1');
    assert.strictEqual(responseBody.data.organizationId, persistedOrganization.id);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'active');
  });

  // New test: non-admin create denied
  test('should deny role assignment creation for non-admin users', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(response.statusCode, 403);
    const responseBody = response.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');

    const forbiddenAudits = auditEvents.filter(
      (e) => e.action === 'createRoleAssignment' && e.outcome === 'forbidden'
    );

    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'admin_required');
    assert.ok(typeof auditEvent.requestId === 'string');
  });

  // New test: admin create still succeeds
  test('should allow role assignment creation for admin users', async () => {
    const server = createTestableServer();

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(response.statusCode, 201);
    const responseBody = response.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, assignmentPayload.userId);
    assert.strictEqual(responseBody.data.organizationId, assignmentPayload.organizationId);
    assert.strictEqual(responseBody.data.roleId, assignmentPayload.roleId);
  });

  // New audit test: successful role assignment creation emits audit event
  test('should emit audit event on successful role assignment creation', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['user_123']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [{ userId: 'user_123', organizationId: persistedOrganization.id }]
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-123'
      }
    });

    assert.strictEqual(response.statusCode, 201);

    // Filter to just the createRoleAssignment audit events
    const createAssignmentAudits = auditEvents.filter(e => e.action === 'createRoleAssignment');
    assert.strictEqual(createAssignmentAudits.length, 1);

    const auditEvent = createAssignmentAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-actor-123');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: duplicate role assignment attempt emits audit event
  test('should emit audit event on duplicate role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    // Create an InMemoryMemberOrganizationRepository directly in the test
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    // Save a draft organization and capture its ID
    const organization: MemberOrganization = {
      registrationNumber: 'REG456',
      legalName: 'Test Organization 2',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };

    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    // Create lookup implementations
    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['user_123']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: [{ userId: 'user_123', organizationId: persistedOrganization.id }]
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    // First create a role
    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'user_123',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    // First request to create the assignment
    const firstResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(firstResponse.statusCode, 201);

    // Second request with the same assignment details
    const secondResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'duplicate-test-actor'
      }
    });

    assert.strictEqual(secondResponse.statusCode, 409);

    // Filter to just the conflict audit events for role assignment creation
    const conflictAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'conflict'
    );
    assert.strictEqual(conflictAudits.length, 1);

    const auditEvent = conflictAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'conflict');
    assert.strictEqual(auditEvent.actorId, 'duplicate-test-actor');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: invalid user role assignment attempt emits audit event
  test('should emit audit event on invalid user role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };
    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: []
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: []
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'non-existent-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-456'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const validationErrorAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'validationError'
    );
    assert.strictEqual(validationErrorAudits.length, 1);

    const auditEvent = validationErrorAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.actorId, 'test-actor-456');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: non-member role assignment attempt emits audit event
  test('should emit audit event on non-member role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const organization: MemberOrganization = {
      registrationNumber: 'REG123',
      legalName: 'Test Organization',
      organizationType: 'Corporation',
      status: 'pendingReview'
    };
    const persistedOrganization = await memberOrganizationRepository.saveDraft(organization);

    const userExistenceLookup = new InMemoryUserExistenceLookup({
      existingUserIds: ['existing-user']
    });

    const organizationMembershipLookup = new InMemoryOrganizationMembershipLookup({
      memberships: []
    });

    const server = createTestableServer({
      roleAudit: auditCallback,
      userExistenceLookup,
      organizationMembershipLookup,
      memberRepository: memberOrganizationRepository
    });

    const roleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'test-role',
        displayName: 'Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(roleResponse.statusCode, 201);
    const roleId = roleResponse.json().data.id;

    const assignmentPayload = {
      userId: 'existing-user',
      organizationId: persistedOrganization.id,
      roleId: roleId
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-789'
      }
    });

    assert.strictEqual(response.statusCode, 400);

    const validationErrorAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'validationError'
    );
    assert.strictEqual(validationErrorAudits.length, 1);

    const auditEvent = validationErrorAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.actorId, 'test-actor-789');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New audit test: invalid role role assignment attempt emits audit event
  test('should emit audit event on invalid role role assignment attempt', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // Create a member organization
    const orgResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/member-organizations',
      payload: {
        registrationNumber: 'REG123',
        legalName: 'Test Organization',
        organizationType: 'Corporation'
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(orgResponse.statusCode, 201);
    const orgId = orgResponse.json().data.id;

    // Try to create a role assignment with a non-existent role
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: 'non-existent-role-id'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-actor-invalid-role'
      }
    });

    // Assertions
    assert.strictEqual(response.statusCode, 400);

    // Filter to just the validationError audit events for role assignment creation with invalid role
    const validationErrorAudits = auditEvents.filter(
      e => e.action === 'createRoleAssignment' && e.outcome === 'validationError'
    );
    assert.strictEqual(validationErrorAudits.length, 1);

    const auditEvent = validationErrorAudits[0];
    assert.strictEqual(auditEvent.action, 'createRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'validationError');
    assert.strictEqual(auditEvent.actorId, 'test-actor-invalid-role');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // Test for schema validation error using standardized envelope
  test('should return standardized validation error envelope for schema validation failure', async () => {
    const server = createTestableServer();

    // Send request with invalid data that fails schema validation
    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: {
        // Missing required fields
        userId: '' // Empty string should fail validation
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    
    const responseBody = response.json();
    // Check standardized validation error envelope
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(typeof responseBody.error.message, 'string');
    // Should have details field even if empty
    assert.ok('details' in responseBody.error);
  });

  // Test for application validation error using standardized envelope
  test('should return standardized validation error envelope for application validation failure', async () => {
    const server = createTestableServer();

    // Try to assign a role that doesn't exist (application validation failure)
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: 'org_456',
      roleId: 'non-existent-role-id'
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response.statusCode, 400);
    
    const responseBody = response.json();
    // Check standardized validation error envelope
    assert.strictEqual(responseBody.error.code, 'VALIDATION_ERROR');
    assert.strictEqual(responseBody.error.message, 'Invalid roleId: Role does not exist');
    // Should have details field even if empty
    assert.ok('details' in responseBody.error);
  });
});
