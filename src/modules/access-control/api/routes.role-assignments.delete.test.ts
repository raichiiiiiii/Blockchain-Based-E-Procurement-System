import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('DELETE /api/v1/role-assignments', () => {
  test('should remove (revoke) an active role assignment successfully', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
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

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);
    const responseBody = removeResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, orgId);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'revoked');
  });

  test('should return 404 when trying to remove a non-existent role assignment', async () => {
    const server = createTestableServer();

    const removeResponse = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&organizationId=org_123&roleId=role_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 404);
    const responseBody = removeResponse.json();
    assert.strictEqual(responseBody.error.code, 'NOT_FOUND');
    assert.strictEqual(responseBody.error.message, 'Role assignment not found');
  });

  test('should return 200 when trying to remove an already revoked role assignment', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
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

    // Manually save a revoked assignment
    await assignmentRepository.save({
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId,
      status: 'revoked'
    });

    // Try to remove the already revoked assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);
    const responseBody = removeResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, orgId);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'revoked');
  });

  test('should return 400 when required query parameters are missing', async () => {
    const server = createTestableServer();

    // Test with missing userId
    const response1 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?organizationId=org_123&roleId=role_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response1.statusCode, 400);

    // Test with missing organizationId
    const response2 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&roleId=role_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response2.statusCode, 400);

    // Test with missing roleId
    const response3 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&organizationId=org_123',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response3.statusCode, 400);

    // Test with completely empty query
    const response4 = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments',
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(response4.statusCode, 400);
  });

  // New test: non-admin delete denied
  test('should deny role assignment removal for non-admin users', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository,
      roleAudit: auditCallback
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

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Try to remove the role assignment as non-admin
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(removeResponse.statusCode, 403);
    const responseBody = removeResponse.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');

    const forbiddenAudits = auditEvents.filter(
      (e) => e.action === 'removeRoleAssignment' && e.outcome === 'forbidden'
    );

    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'removeRoleAssignment');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.reason, 'admin_required');
    assert.ok(typeof auditEvent.requestId === 'string');
  });

  // New test: admin delete still succeeds
  test('should allow role assignment removal for admin users', async () => {
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
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

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment as admin
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin' // Admin role
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);
    const responseBody = removeResponse.json();
    assert.ok(responseBody.data);
    assert.strictEqual(responseBody.data.userId, 'user_123');
    assert.strictEqual(responseBody.data.organizationId, orgId);
    assert.strictEqual(responseBody.data.roleId, roleId);
    assert.strictEqual(responseBody.data.status, 'revoked');
  });

  // New audit test: successful role assignment removal emits audit event
  test('should emit audit event on successful role assignment removal', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository,
      roleAudit: auditCallback
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

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-remover-456'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);

    // Filter to just the removeRoleAssignment audit events
    const removeAssignmentAudits = auditEvents.filter(e => e.action === 'removeRoleAssignment');
    assert.strictEqual(removeAssignmentAudits.length, 1);

    const auditEvent = removeAssignmentAudits[0];
    assert.strictEqual(auditEvent.action, 'removeRoleAssignment');
    assert.strictEqual(auditEvent.targetType, 'roleAssignment');
    assert.strictEqual(auditEvent.outcome, 'success');
    assert.strictEqual(auditEvent.actorId, 'test-remover-456');
    assert.ok(typeof auditEvent.targetId === 'string');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
  });

  // New test: admin-denied shared audit
  test('should persist shared access audit event for forbidden role assignment removal', async () => {
    const auditEventRepository = new InMemoryAccessAuditEventRepository();

    const server = createTestableServer({
      accessAuditEventRepository: auditEventRepository
    });

    // Try to remove a role assignment as non-admin
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: '/api/v1/role-assignments?userId=user_123&organizationId=org_123&roleId=role_123',
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-456'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 403);

    const events = await auditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'access-control');
    assert.strictEqual(event.action, 'removeRoleAssignment');
    assert.strictEqual(event.targetType, 'roleAssignment');
    assert.strictEqual(event.outcome, 'forbidden');
    assert.strictEqual(event.reason, 'admin_required');
    assert.strictEqual(event.actorUserId, 'test-user-456');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/role-assignments');
    assert.strictEqual(event.method, 'DELETE');
    assert.strictEqual(event.targetId, 'user_123:org_123:role_123');
  });

  // New test: success shared audit
  test('should persist shared access audit event for successful role assignment removal', async () => {
    const auditEventRepository = new InMemoryAccessAuditEventRepository();
    const assignmentRepository = new InMemoryRoleAssignmentRepository();
    const roleRepository = new InMemoryRoleRepository();
    const memberOrganizationRepository = new InMemoryMemberOrganizationRepository();

    const server = createTestableServer({
      roleRepository,
      roleAssignmentRepository: assignmentRepository,
      memberRepository: memberOrganizationRepository,
      accessAuditEventRepository: auditEventRepository
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

    // Create a role assignment
    const assignmentPayload = {
      userId: 'user_123',
      organizationId: orgId,
      roleId: roleId
    };

    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/role-assignments',
      payload: assignmentPayload,
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);

    // Remove the role assignment
    const removeResponse = await server.inject({
      method: 'DELETE',
      url: `/api/v1/role-assignments?userId=user_123&organizationId=${orgId}&roleId=${roleId}`,
      headers: {
        'x-actor-role': 'admin',
        'x-actor-id': 'test-admin-123'
      }
    });

    assert.strictEqual(removeResponse.statusCode, 200);

    const events = await auditEventRepository.list();
    const event = events.at(-1); // Get the last event
    assert.ok(event);

    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'access-control');
    assert.strictEqual(event.action, 'removeRoleAssignment');
    assert.strictEqual(event.targetType, 'roleAssignment');
    assert.strictEqual(event.outcome, 'success');
    assert.strictEqual(event.actorUserId, 'test-admin-123');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/role-assignments');
    assert.strictEqual(event.method, 'DELETE');
    assert.strictEqual(event.targetId, `user_123:${orgId}:${roleId}`);
  });
});
