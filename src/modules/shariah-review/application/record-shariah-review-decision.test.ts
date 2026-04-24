import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { recordShariahReviewDecision } from './record-shariah-review-decision.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from './shariah-review-repository.js';

class TestShariahReviewRepository implements ShariahReviewRepository {
  public savedReviews: ShariahReview[] = [];

  async save(review: ShariahReview): Promise<ShariahReview> {
    // Remove any existing version
    this.savedReviews = this.savedReviews.filter(r => r.id !== review.id);
    this.savedReviews.push(review);
    return review;
  }

  async findById(id: string): Promise<ShariahReview | null> {
    return this.savedReviews.find(review => review.id === id) || null;
  }
}

describe('recordShariahReviewDecision', () => {
  it('should approve from checklistComplete successfully', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'approved',
      rationale: 'All good'
    }, repository);
    
    assert.strictEqual(result.status, 'success');
    if (result.status === 'success') {
      assert.strictEqual(result.review.status, 'approved');
      assert.strictEqual(result.review.rationale, 'All good');
      assert.ok(result.review.decidedAt);
    }
  });

  it('should reject from checklistComplete successfully', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'rejected',
      rationale: 'Not compliant'
    }, repository);
    
    assert.strictEqual(result.status, 'success');
    if (result.status === 'success') {
      assert.strictEqual(result.review.status, 'rejected');
      assert.strictEqual(result.review.rationale, 'Not compliant');
    }
  });

  it('should conditionally approve from checklistComplete with valid conditions', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'conditionalApproved',
      rationale: 'Needs fixes',
      conditions: [
        {
          description: 'Fix document formatting',
          dueDate: '2026-12-31'
        }
      ]
    }, repository);
    
    assert.strictEqual(result.status, 'success');
    if (result.status === 'success') {
      assert.strictEqual(result.review.status, 'conditionalApproved');
      assert.strictEqual(result.review.rationale, 'Needs fixes');
      assert.strictEqual(result.review.conditions?.length, 1);
      assert.strictEqual(result.review.conditions?.[0].description, 'Fix document formatting');
      assert.strictEqual(result.review.conditions?.[0].dueDate, '2026-12-31');
    }
  });

  it('should block decision from submitted state', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in submitted state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'approved',
      rationale: 'All good'
    }, repository);
    
    assert.strictEqual(result.status, 'invalidState');
    if (result.status === 'invalidState') {
      assert.strictEqual(result.currentStatus, 'submitted');
    }
  });

  it('should block decision from checklistInProgress state', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistInProgress state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistInProgress',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'approved',
      rationale: 'All good'
    }, repository);
    
    assert.strictEqual(result.status, 'invalidState');
    if (result.status === 'invalidState') {
      assert.strictEqual(result.currentStatus, 'checklistInProgress');
    }
  });

  it('should reject decision with missing rationale', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'approved',
      rationale: ''
    }, repository);
    
    assert.strictEqual(result.status, 'validationError');
    if (result.status === 'validationError') {
      assert.ok(result.issues.includes('Rationale is required for all final decisions'));
    }
  });

  it('should reject conditional approval without conditions', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'conditionalApproved',
      rationale: 'Needs fixes'
    }, repository);
    
    assert.strictEqual(result.status, 'validationError');
    if (result.status === 'validationError') {
      assert.ok(result.issues.includes('Conditional approval requires at least one condition'));
    }
  });

  it('should reject approved decision with conditions', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'approved',
      rationale: 'All good',
      conditions: [
        {
          description: 'Fix document formatting',
          dueDate: '2026-12-31'
        }
      ]
    }, repository);
    
    assert.strictEqual(result.status, 'validationError');
    if (result.status === 'validationError') {
      assert.ok(result.issues.includes('approved decisions must not include conditions'));
    }
  });

  it('should reject rejected decision with conditions', async () => {
    const repository = new TestShariahReviewRepository();
    
    // Setup a review in checklistComplete state
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'checklistComplete',
      submittedByUserId: 'user-1',
      createdAt: '2026-01-01T00:00:00Z'
    };
    
    await repository.save(review);
    
    const result = await recordShariahReviewDecision({
      reviewId: 'review-1',
      outcome: 'rejected',
      rationale: 'Not compliant',
      conditions: [
        {
          description: 'Fix document formatting',
          dueDate: '2026-12-31'
        }
      ]
    }, repository);
    
    assert.strictEqual(result.status, 'validationError');
    if (result.status === 'validationError') {
      assert.ok(result.issues.includes('rejected decisions must not include conditions'));
    }
  });

  it('should reject decision for non-existent review', async () => {
    const repository = new TestShariahReviewRepository();
    
    const result = await recordShariahReviewDecision({
      reviewId: 'non-existent',
      outcome: 'approved',
      rationale: 'All good'
    }, repository);
    
    assert.strictEqual(result.status, 'notFound');
  });
});
