import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createTestableServer } from '../../../app/server.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import { InMemoryShariahReviewRepository } from '../infrastructure/in-memory-shariah-review-repository.js';
import { InMemoryRoleAssignmentRepository } from '../../access-control/infrastructure/in-memory-role-assignment-repository.js';
import { InMemoryRoleRepository } from '../../access-control/infrastructure/in-memory-role-repository.js';

test('Shariah review history endpoint', async (t) => {
  await t.test('returns 404 for non-existent review', async () => {
    const server = await createTestableServer();
    
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/nonexistent/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });
    
    assert.equal(response.statusCode, 404);
    const payload = JSON.parse(response.payload);
    assert.equal(payload.error.code, 'NOT_FOUND');
  });

  await t.test('returns history for submitted-only review', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    
    // Create a submitted review
    const submittedReview: ShariahReview = {
      id: 'review1',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z'
    };
    
    await reviewRepo.save(submittedReview);
    
    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });
    
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review1/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });
    
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;
    
    assert.equal(data.reviewId, 'review1');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'submitted');
    assert.equal(data.history.length, 1);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[0].toStatus, 'submitted');
    assert.equal(data.history[0].fromStatus, null);
  });

  await t.test('returns history for checklistInProgress review', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    
    // Create a review with checklist in progress
    const inProgressReview: ShariahReview = {
      id: 'review2',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistInProgress',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z',
      checklist: {
        entries: [
          { itemCode: 'item1', outcome: 'pass' }
        ],
        status: 'checklistInProgress'
      }
    };
    
    await reviewRepo.save(inProgressReview);
    
    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });
    
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review2/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });
    
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;
    
    assert.equal(data.reviewId, 'review2');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'checklistInProgress');
    assert.equal(data.history.length, 2);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[1].action, 'checklistSaved');
    assert.equal(data.history[1].toStatus, 'checklistInProgress');
  });

  await t.test('returns history for checklistComplete review without decision', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    
    // Create a review with completed checklist but no decision
    const completeReview: ShariahReview = {
      id: 'review3',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z',
      checklist: {
        entries: [
          { itemCode: 'item1', outcome: 'pass' },
          { itemCode: 'item2', outcome: 'pass' }
        ],
        status: 'checklistComplete'
      }
    };
    
    await reviewRepo.save(completeReview);
    
    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });
    
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review3/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });
    
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;
    
    assert.equal(data.reviewId, 'review3');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'checklistComplete');
    assert.equal(data.history.length, 3);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[1].action, 'checklistSaved');
    assert.equal(data.history[2].action, 'checklistCompleted');
    assert.equal(data.history[2].toStatus, 'checklistComplete');
  });

  await t.test('returns history for conditionalApproved review with decision details', async () => {
    // Setup repositories
    const reviewRepo = new InMemoryShariahReviewRepository();
    const roleAssignmentRepo = new InMemoryRoleAssignmentRepository();
    const roleRepo = new InMemoryRoleRepository();
    
    // Create a conditionally approved review
    const approvedReview: ShariahReview = {
      id: 'review4',
      organizationId: 'org1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'conditionalApproved',
      submittedByUserId: 'user123',
      createdAt: '2026-01-01T00:00:00.000Z',
      decidedAt: '2026-01-02T00:00:00.000Z',
      rationale: 'Approved with conditions',
      conditions: [
        {
          description: 'Update documentation',
          dueDate: '2026-06-01'
        }
      ],
      checklist: {
        entries: [
          { itemCode: 'item1', outcome: 'pass' },
          { itemCode: 'item2', outcome: 'pass' }
        ],
        status: 'checklistComplete'
      }
    };
    
    await reviewRepo.save(approvedReview);
    
    const server = await createTestableServer({
      shariahReviewRepository: reviewRepo,
      roleAssignmentRepository: roleAssignmentRepo,
      roleRepository: roleRepo
    });
    
    const response = await server.inject({
      method: 'GET',
      url: '/api/v1/shariah-reviews/review4/history',
      headers: {
        'x-actor-id': 'user123'
      }
    });
    
    assert.equal(response.statusCode, 200);
    const payload = JSON.parse(response.payload);
    const data = payload.data;
    
    assert.equal(data.reviewId, 'review4');
    assert.equal(data.organizationId, 'org1');
    assert.equal(data.currentStatus, 'conditionalApproved');
    assert.equal(data.history.length, 4);
    assert.equal(data.history[0].action, 'reviewSubmitted');
    assert.equal(data.history[1].action, 'checklistSaved');
    assert.equal(data.history[2].action, 'checklistCompleted');
    assert.equal(data.history[3].action, 'decisionRecorded');
    assert.equal(data.history[3].toStatus, 'conditionalApproved');
    assert.equal(data.history[3].rationale, 'Approved with conditions');
    assert.ok(Array.isArray(data.history[3].conditions));
    assert.equal(data.history[3].conditions.length, 1);
    assert.equal(data.history[3].conditions[0].description, 'Update documentation');
    assert.equal(data.history[3].conditions[0].dueDate, '2026-06-01');
  });
});
