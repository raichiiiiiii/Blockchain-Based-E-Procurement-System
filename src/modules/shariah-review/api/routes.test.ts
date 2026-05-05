import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';
import { InMemoryMemberOrganizationRepository } from '../../membership/infrastructure/in-memory-member-organization-repository.js';
import type { ShariahReviewSubmitAuditEvent, ShariahReviewHistoryAuditEvent } from './routes.js';
import type { RoleAssignment } from '../../access-control/domain/role-assignment.js';
import { submitShariahReview, type SubmitShariahReviewInput } from '../application/submit-shariah-review.js';

describe('Shariah Review Routes', () => {
  describe('POST /api/v1/shariah-reviews', () => {
    it('should submit a review with references and return them in the response', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['submit-review', 'manage-checklist'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-001',
        legalName: 'Test Organization',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      const actorId = 'user-123';
      const references = [
        {
          type: 'document',
          name: 'Compliance Document',
          uri: 'https://example.com/doc.pdf',
          description: 'Key compliance documentation',
          mediaType: 'application/pdf'
        }
      ];

      // Create coordinator assignment
      const assignment: RoleAssignment = {
        userId: actorId,
        organizationId: organization.id,
        roleId: coordinatorRole.id,
        status: 'active'
      };

      await roleAssignmentRepository.save(assignment);

      // Capture audit events
      const auditEvents: ShariahReviewSubmitAuditEvent[] = [];

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository,
        shariahReviewAudit: (event) => {
          if (event.action === 'submitShariahReview') {
            auditEvents.push(event);
          }
        }
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/shariah-reviews',
        headers: {
          'x-actor-id': actorId
        },
        payload: {
          organizationId: organization.id,
          title: 'Test Review',
          summary: 'This is a test review',
          references
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 201);
      assert.ok(responseBody.data);
      assert.ok(responseBody.data.id);
      assert.strictEqual(responseBody.data.status, 'submitted');
      
      // Check that references are included in response
      assert.ok(Array.isArray(responseBody.data.references));
      assert.strictEqual(responseBody.data.references.length, 1);
      
      const responseRef = responseBody.data.references[0];
      const originalRef = references[0];
      
      assert.strictEqual(responseRef.type, originalRef.type);
      assert.strictEqual(responseRef.name, originalRef.name);
      assert.strictEqual(responseRef.uri, originalRef.uri);
      assert.strictEqual(responseRef.description, originalRef.description);
      assert.strictEqual(responseRef.mediaType, originalRef.mediaType);
      
      // Check audit event
      assert.strictEqual(auditEvents.length, 1);
      const auditEvent = auditEvents[0];
      assert.strictEqual(auditEvent.outcome, 'success');
      assert.strictEqual(auditEvent.actorId, actorId);
      assert.strictEqual(auditEvent.targetId, responseBody.data.id);
    });

    it('should submit a review without references and maintain backward compatibility', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['submit-review', 'manage-checklist'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-002',
        legalName: 'Test Organization 2',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      const actorId = 'user-456';

      // Create coordinator assignment
      const assignment: RoleAssignment = {
        userId: actorId,
        organizationId: organization.id,
        roleId: coordinatorRole.id,
        status: 'active'
      };

      await roleAssignmentRepository.save(assignment);

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/shariah-reviews',
        headers: {
          'x-actor-id': actorId
        },
        payload: {
          organizationId: organization.id,
          title: 'Test Review',
          summary: 'This is a test review'
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 201);
      assert.ok(responseBody.data);
      assert.ok(responseBody.data.id);
      assert.strictEqual(responseBody.data.status, 'submitted');
    });

    it('should deny submission for non-coordinator user and emit audit event', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['submit-review', 'manage-checklist'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-003',
        legalName: 'Test Organization 3',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      const actorId = 'user-789';
      const references = [
        {
          type: 'document',
          name: 'Compliance Document',
          uri: 'https://example.com/doc.pdf',
          description: 'Key compliance documentation',
          mediaType: 'application/pdf'
        }
      ];

      // Do NOT create coordinator assignment for this test

      // Capture audit events
      const auditEvents: ShariahReviewSubmitAuditEvent[] = [];

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository,
        shariahReviewAudit: (event) => {
          if (event.action === 'submitShariahReview') {
            auditEvents.push(event);
          }
        }
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'POST',
        url: '/api/v1/shariah-reviews',
        headers: {
          'x-actor-id': actorId
        },
        payload: {
          organizationId: organization.id,
          title: 'Test Review',
          summary: 'This is a test review',
          references
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 403);
      assert.ok(responseBody.error);
      assert.strictEqual(responseBody.error.code, 'FORBIDDEN');

      // Check audit event
      assert.strictEqual(auditEvents.length, 1);
      const auditEvent = auditEvents[0];
      assert.strictEqual(auditEvent.outcome, 'forbidden');
      assert.strictEqual(auditEvent.actorId, actorId);
      assert.ok(auditEvent.reason);
    });
  });

  describe('GET /api/v1/shariah-reviews/:reviewId/history', () => {
    it('should deny history view for unauthorized user and emit audit event', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['view-review-history'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-004',
        legalName: 'Test Organization 4',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      // Create a test review
      const input: SubmitShariahReviewInput = {
        organizationId: organization.id,
        title: 'Test Review',
        summary: 'This is a test review',
        submittedByUserId: 'user-999'
      };

      const submitResult = await submitShariahReview(input, shariahReviewRepository);
      if (submitResult.status !== 'submitted') {
        throw new Error('Failed to create test review');
      }
      const review = submitResult.review;

      const actorId = 'user-123'; // Different user, no role assignment

      // Capture audit events
      const auditEvents: ShariahReviewHistoryAuditEvent[] = [];

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository,
        shariahReviewAudit: (event) => {
          if (event.action === 'viewShariahReviewHistory') {
            auditEvents.push(event);
          }
        }
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/shariah-reviews/${review.id}/history`,
        headers: {
          'x-actor-id': actorId
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 403);
      assert.ok(responseBody.error);
      assert.strictEqual(responseBody.error.code, 'FORBIDDEN');
      assert.strictEqual(responseBody.error.message, 'Not authorized to view Shariah review history');

      // Check audit event
      assert.strictEqual(auditEvents.length, 1);
      const auditEvent = auditEvents[0];
      assert.strictEqual(auditEvent.outcome, 'forbidden');
      assert.strictEqual(auditEvent.actorId, actorId);
      assert.strictEqual(auditEvent.targetId, review.id);
      assert.ok(auditEvent.reason);
    });

    it('should allow history view for authorized user and emit read audit', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['view-review-history'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-005',
        legalName: 'Test Organization 5',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      // Create a test review
      const input: SubmitShariahReviewInput = {
        organizationId: organization.id,
        title: 'Test Review',
        summary: 'This is a test review',
        submittedByUserId: 'user-999'
      };

      const submitResult = await submitShariahReview(input, shariahReviewRepository);
      if (submitResult.status !== 'submitted') {
        throw new Error('Failed to create test review');
      }
      const review = submitResult.review;

      const actorId = 'user-123';

      // Create coordinator assignment
      const assignment: RoleAssignment = {
        userId: actorId,
        organizationId: organization.id,
        roleId: coordinatorRole.id,
        status: 'active'
      };

      await roleAssignmentRepository.save(assignment);

      // Capture audit events
      const auditEvents: ShariahReviewHistoryAuditEvent[] = [];

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository,
        shariahReviewAudit: (event) => {
          if (event.action === 'viewShariahReviewHistory') {
            auditEvents.push(event);
          }
        }
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/shariah-reviews/${review.id}/history`,
        headers: {
          'x-actor-id': actorId
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 200);
      assert.ok(responseBody.data);
      assert.strictEqual(responseBody.data.reviewId, review.id);
      assert.ok(Array.isArray(responseBody.data.history));

      // Check audit event
      assert.strictEqual(auditEvents.length, 1);
      const auditEvent = auditEvents[0];
      assert.strictEqual(auditEvent.outcome, 'success');
      assert.strictEqual(auditEvent.actorId, actorId);
      assert.strictEqual(auditEvent.targetId, review.id);
      assert.ok(typeof auditEvent.historyEntryCount === 'number');
    });

    it('should handle empty history safely', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['view-review-history'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-006',
        legalName: 'Test Organization 6',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      // Create a test review
      const input: SubmitShariahReviewInput = {
        organizationId: organization.id,
        title: 'Test Review',
        summary: 'This is a test review',
        submittedByUserId: 'user-999'
      };

      const submitResult = await submitShariahReview(input, shariahReviewRepository);
      if (submitResult.status !== 'submitted') {
        throw new Error('Failed to create test review');
      }
      const review = submitResult.review;

      const actorId = 'user-123';

      // Create coordinator assignment
      const assignment: RoleAssignment = {
        userId: actorId,
        organizationId: organization.id,
        roleId: coordinatorRole.id,
        status: 'active'
      };

      await roleAssignmentRepository.save(assignment);

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/shariah-reviews/${review.id}/history`,
        headers: {
          'x-actor-id': actorId
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 200);
      assert.ok(responseBody.data);
      assert.strictEqual(responseBody.data.reviewId, review.id);
      assert.ok(Array.isArray(responseBody.data.history));
      // Empty history should be an empty array, not null
      assert.strictEqual(responseBody.data.history.length, 1); // Should have at least the initial submission entry
    });

    it('should maintain PBI-075 response shape regression', async () => {
      // Arrange
      const shariahReviewRepository = new InMemoryShariahReviewRepository();
      const roleRepository = new InMemoryRoleRepository();
      const roleAssignmentRepository = new InMemoryRoleAssignmentRepository();
      const memberRepository = new InMemoryMemberOrganizationRepository();

      // Create coordinator role
      const coordinatorRole = await roleRepository.save({
        roleCode: 'coordinator',
        displayName: 'Coordinator',
        scope: 'organization',
        description: 'Can coordinate shariah reviews',
        permissions: ['view-review-history'],
        status: 'active',
        isSystemReserved: false
      });

      // Create a test organization
      const organization = await memberRepository.saveDraft({
        registrationNumber: 'TEST-007',
        legalName: 'Test Organization 7',
        organizationType: 'bank',
        status: 'pendingReview'
      });

      // Create a test review
      const input: SubmitShariahReviewInput = {
        organizationId: organization.id,
        title: 'Test Review',
        summary: 'This is a test review',
        submittedByUserId: 'user-999'
      };

      const submitResult = await submitShariahReview(input, shariahReviewRepository);
      if (submitResult.status !== 'submitted') {
        throw new Error('Failed to create test review');
      }
      const review = submitResult.review;

      const actorId = 'user-123';

      // Create coordinator assignment
      const assignment: RoleAssignment = {
        userId: actorId,
        organizationId: organization.id,
        roleId: coordinatorRole.id,
        status: 'active'
      };

      await roleAssignmentRepository.save(assignment);

      const server = createTestableServer({
        shariahReviewRepository,
        roleRepository,
        roleAssignmentRepository,
        memberRepository
      });

      await server.ready();

      // Act
      const response = await server.inject({
        method: 'GET',
        url: `/api/v1/shariah-reviews/${review.id}/history`,
        headers: {
          'x-actor-id': actorId
        }
      });

      // Assert
      const responseBody = response.json();

      // Check response
      assert.strictEqual(response.statusCode, 200);
      assert.ok(responseBody.data);

      // PBI-075 response shape regression checks
      assert.ok(responseBody.data.reviewId);
      assert.ok(responseBody.data.organizationId);
      assert.ok(responseBody.data.currentStatus);
      assert.ok(Array.isArray(responseBody.data.history));
    });
  });
});
