import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryRoleAssignmentRepository } from './in-memory-role-assignment-repository.js';
import type { RoleAssignmentStatus } from '../domain/role-assignment.js';

describe('InMemoryRoleAssignmentRepository', () => {
  let repository: InMemoryRoleAssignmentRepository;

  beforeEach(() => {
    repository = new InMemoryRoleAssignmentRepository();
  });

  describe('existsActiveAssignmentByUserAndOrganization', () => {
    test('returns true when an active assignment exists for the user and organization', async () => {
      // Arrange
      const assignment = {
        userId: 'user1',
        organizationId: 'org1',
        roleId: 'role1',
        status: 'active' as RoleAssignmentStatus
      };
      await repository.save(assignment);

      // Act
      const result = await repository.existsActiveAssignmentByUserAndOrganization('user1', 'org1');

      // Assert
      assert.strictEqual(result, true);
    });

    test('returns false when only revoked assignments exist', async () => {
      // Arrange
      const assignment = {
        userId: 'user1',
        organizationId: 'org1',
        roleId: 'role1',
        status: 'revoked' as RoleAssignmentStatus
      };
      await repository.save(assignment);

      // Act
      const result = await repository.existsActiveAssignmentByUserAndOrganization('user1', 'org1');

      // Assert
      assert.strictEqual(result, false);
    });

    test('returns false when no assignments exist', async () => {
      // Act
      const result = await repository.existsActiveAssignmentByUserAndOrganization('user1', 'org1');

      // Assert
      assert.strictEqual(result, false);
    });

    test('returns false when assignments exist for a different organization', async () => {
      // Arrange
      const assignment = {
        userId: 'user1',
        organizationId: 'org1',
        roleId: 'role1',
        status: 'active' as RoleAssignmentStatus
      };
      await repository.save(assignment);

      // Act
      const result = await repository.existsActiveAssignmentByUserAndOrganization('user1', 'org2');

      // Assert
      assert.strictEqual(result, false);
    });

    test('returns false when assignments exist for a different user', async () => {
      // Arrange
      const assignment = {
        userId: 'user1',
        organizationId: 'org1',
        roleId: 'role1',
        status: 'active' as RoleAssignmentStatus
      };
      await repository.save(assignment);

      // Act
      const result = await repository.existsActiveAssignmentByUserAndOrganization('user2', 'org1');

      // Assert
      assert.strictEqual(result, false);
    });
  });
});
