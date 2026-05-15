import { test, describe } from 'node:test';
import { strict as assert } from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryRoleAssignmentRepository } from '../infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { MemberOrganization } from '../../membership/domain/member-organization.js';
import { InMemoryUserExistenceLookup } from '../../membership/infrastructure/in-memory-user-existence-lookup.js';
import { InMemoryOrganizationMembershipLookup } from '../../membership/infrastructure/in-memory-organization-membership-lookup.js';
import { InMemoryAccessAuditEventRepository } from '../../shared/infrastructure/in-memory-access-audit-event-repository.js';

describe('Access Control Forbidden Audit Tests', () => {
  // Updated test: forbidden create now emits audit
  test('should emit audit event on forbidden role creation', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    const rolePayload = {
      roleCode: 'forbidden-test',
      displayName: 'Forbidden Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-forbidden'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    assert.strictEqual(auditEvents.length, 1);

    const auditEvent = auditEvents[0];
    assert.strictEqual(auditEvent.action, 'createRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.strictEqual(auditEvent.actorId, 'test-user-forbidden');
    assert.strictEqual(auditEvent.reason, 'admin_required');
  });

  // Updated audit test: forbidden update now emits audit
  test('should emit audit event on forbidden role update', async () => {
    let auditEvents: any[] = [];
    const auditCallback = (event: any) => {
      auditEvents.push(event);
    };

    const server = createTestableServer({ roleAudit: auditCallback });

    // First create a role as admin
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'forbidden-update-test',
        displayName: 'Forbidden Update Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update the role as non-admin
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Updated by non-admin'
      },
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-forbidden-update'
      }
    });

    assert.strictEqual(updateResponse.statusCode, 403);

    // Filter to just the update audit events with forbidden outcome
    const forbiddenAudits = auditEvents.filter(e => e.action === 'updateRole' && e.outcome === 'forbidden');
    assert.strictEqual(forbiddenAudits.length, 1);

    const auditEvent = forbiddenAudits[0];
    assert.strictEqual(auditEvent.action, 'updateRole');
    assert.strictEqual(auditEvent.targetType, 'role');
    assert.strictEqual(auditEvent.outcome, 'forbidden');
    assert.strictEqual(auditEvent.actorId, 'test-user-forbidden-update');
    assert.strictEqual(auditEvent.targetId, roleId);
    assert.ok(typeof auditEvent.requestId === 'string');
    assert.ok(typeof auditEvent.timestamp === 'string');
    assert.strictEqual(auditEvent.reason, 'admin_required');
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

  // New test: non-admin change denied
  test('should deny role assignment change for non-admin users', async () => {
    const server = createTestableServer();

    // First create two roles
    const currentRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'current-role',
        displayName: 'Current Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(currentRoleResponse.statusCode, 201);
    const currentRoleId = currentRoleResponse.json().data.id;

    const newRoleResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'new-role',
        displayName: 'New Role',
        scope: 'organization',
        permissions: ['read', 'write'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(newRoleResponse.statusCode, 201);
    const newRoleId = newRoleResponse.json().data.id;

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
      roleId: currentRoleId
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

    // Try to change the role assignment as non-admin
    const changePayload = {
      userId: 'user_123',
      organizationId: orgId,
      currentRoleId: currentRoleId,
      newRoleId: newRoleId
    };

    const changeResponse = await server.inject({
      method: 'PATCH',
      url: '/api/v1/role-assignments/change',
      payload: changePayload,
      headers: {
        'x-actor-role': 'user' // Non-admin role
      }
    });

    assert.strictEqual(changeResponse.statusCode, 403);
    const responseBody = changeResponse.json();
    assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
    assert.strictEqual(responseBody.error.message, 'Admin access required');
  });

  // New tests for shared access audit events
  test('should persist shared access audit event for forbidden role creation', async () => {
    const auditEventRepository = new InMemoryAccessAuditEventRepository();
    
    const server = createTestableServer({ 
      roleRepository: new InMemoryRoleRepository(),
      roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
      memberRepository: new InMemoryMemberOrganizationRepository(),
      accessAuditEventRepository: auditEventRepository
    });

    const rolePayload = {
      roleCode: 'shared-audit-forbidden-test',
      displayName: 'Shared Audit Forbidden Test Role',
      scope: 'organization',
      permissions: ['read'],
      status: 'active',
      isSystemReserved: false
    };

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: rolePayload,
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-shared-audit'
      }
    });

    assert.strictEqual(response.statusCode, 403);
    
    const events = await auditEventRepository.list();
    assert.strictEqual(events.length, 1);

    const event = events[0];
    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'access-control');
    assert.strictEqual(event.action, 'createRole');
    assert.strictEqual(event.targetType, 'role');
    assert.strictEqual(event.outcome, 'forbidden');
    assert.strictEqual(event.reason, 'admin_required');
    assert.strictEqual(event.actorUserId, 'test-user-shared-audit');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/roles');
    assert.strictEqual(event.method, 'POST');
    assert.strictEqual(event.targetId, 'unknown');
  });

  test('should persist shared access audit event for forbidden role update', async () => {
    const roleRepository = new InMemoryRoleRepository();
    const auditEventRepository = new InMemoryAccessAuditEventRepository();
    
    const server = createTestableServer({ 
      roleRepository,
      roleAssignmentRepository: new InMemoryRoleAssignmentRepository(),
      memberRepository: new InMemoryMemberOrganizationRepository(),
      accessAuditEventRepository: auditEventRepository
    });

    // First create a role as admin
    const createResponse = await server.inject({
      method: 'POST',
      url: '/api/v1/roles',
      payload: {
        roleCode: 'shared-audit-update-test',
        displayName: 'Shared Audit Update Test Role',
        scope: 'organization',
        permissions: ['read'],
        status: 'active',
        isSystemReserved: false
      },
      headers: {
        'x-actor-role': 'admin'
      }
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createdRole = createResponse.json().data;
    const roleId = createdRole.id;

    // Try to update the role as non-admin
    const updateResponse = await server.inject({
      method: 'PATCH',
      url: `/api/v1/roles/${roleId}`,
      payload: {
        displayName: 'Updated by non-admin'
      },
      headers: {
        'x-actor-role': 'user', // Non-admin role
        'x-actor-id': 'test-user-shared-audit-update'
      }
    });

    assert.strictEqual(updateResponse.statusCode, 403);
    
    const events = await auditEventRepository.list();
    // Should have 2 events: create success, then update forbidden
    assert.strictEqual(events.length, 2);

    // Check the last event which should be the update forbidden event
    const event = events[1];
    assert.strictEqual(event.schemaVersion, 'access-audit-event.v1');
    assert.strictEqual(event.module, 'access-control');
    assert.strictEqual(event.action, 'updateRole');
    assert.strictEqual(event.targetType, 'role');
    assert.strictEqual(event.outcome, 'forbidden');
    assert.strictEqual(event.reason, 'admin_required');
    assert.strictEqual(event.actorUserId, 'test-user-shared-audit-update');
    assert.ok(event.requestId);
    assert.ok(event.occurredAt);
    assert.ok(event.evidence.payloadHash);
    assert.strictEqual(event.evidence.canonicalization, 'json-stable-v1');
    assert.strictEqual(event.route, '/api/v1/roles/:id');
    assert.strictEqual(event.method, 'PATCH');
    assert.strictEqual(event.targetId, roleId);
  });
});
