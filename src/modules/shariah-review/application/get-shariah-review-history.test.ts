import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import { getShariahReviewHistory } from './get-shariah-review-history.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from './shariah-review-repository.js';

class TestShariahReviewRepository implements ShariahReviewRepository {
  private reviews: ShariahReview[] = [];

  addReview(review: ShariahReview) {
    this.reviews.push(review);
  }

  async save(review: ShariahReview): Promise<ShariahReview> {
    const existingIndex = this.reviews.findIndex(r => r.id === review.id);
    if (existingIndex >= 0) {
      this.reviews[existingIndex] = review;
    } else {
      this.reviews.push(review);
    }
    return review;
  }

  async findById(id: string): Promise<ShariahReview | null> {
    return this.reviews.find(review => review.id === id) || null;
  }
}

describe('getShariahReviewHistory', () => {
  it('should return notFound for non-existent review', async () => {
    const repository = new TestShariahReviewRepository();
    const result = await getShariahReviewHistory('non-existent', repository);
    
    assert.deepStrictEqual(result, { status: 'notFound' });
  });

  it('should return submitted-only history', async () => {
    const repository = new TestShariahReviewRepository();
    const review: ShariahReview = {
      id: 'review-1',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user-1',
      createdAt: '2026-03-15T00:00:00Z'
    };
    
    repository.addReview(review);
    
    const result = await getShariahReviewHistory('review-1', repository);
    
    assert.deepStrictEqual(result, {
      status: 'found',
      history: {
        reviewId: 'review-1',
        organizationId: 'org-1',
        currentStatus: 'submitted',
        history: [{
          action: 'reviewSubmitted',
          fromStatus: null,
          toStatus: 'submitted',
          performedAt: '2026-03-15T00:00:00Z',
          performedByUserId: 'user-1',
          notes: 'Initial submission for review'
        }]
      }
    });
  });

  it('should return checklistInProgress history', async () => {
    const repository = new TestShariahReviewRepository();
    const review: ShariahReview = {
      id: 'review-2',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user-1',
      createdAt: '2026-03-15T00:00:00Z',
      checklist: {
        entries: [{ itemCode: 'item-1', outcome: 'pass' }],
        status: 'checklistInProgress'
      }
    };
    
    repository.addReview(review);
    
    const result = await getShariahReviewHistory('review-2', repository);
    
    assert.deepStrictEqual(result, {
      status: 'found',
      history: {
        reviewId: 'review-2',
        organizationId: 'org-1',
        currentStatus: 'checklistInProgress',
        history: [
          {
            action: 'reviewSubmitted',
            fromStatus: null,
            toStatus: 'submitted',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'Initial submission for review'
          },
          {
            action: 'checklistSaved',
            fromStatus: 'submitted',
            toStatus: 'checklistInProgress',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1'
          }
        ]
      }
    });
  });

  it('should return checklistComplete with no final decision', async () => {
    const repository = new TestShariahReviewRepository();
    const review: ShariahReview = {
      id: 'review-3',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'submitted',
      submittedByUserId: 'user-1',
      createdAt: '2026-03-15T00:00:00Z',
      checklist: {
        entries: [{ itemCode: 'item-1', outcome: 'pass' }],
        status: 'checklistComplete'
      }
    };
    
    repository.addReview(review);
    
    const result = await getShariahReviewHistory('review-3', repository);
    
    assert.deepStrictEqual(result, {
      status: 'found',
      history: {
        reviewId: 'review-3',
        organizationId: 'org-1',
        currentStatus: 'checklistComplete',
        history: [
          {
            action: 'reviewSubmitted',
            fromStatus: null,
            toStatus: 'submitted',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'Initial submission for review'
          },
          {
            action: 'checklistSaved',
            fromStatus: 'submitted',
            toStatus: 'checklistInProgress',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1'
          },
          {
            action: 'checklistCompleted',
            fromStatus: 'checklistInProgress',
            toStatus: 'checklistComplete',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'All mandatory items evaluated'
          }
        ]
      }
    });
  });

  it('should return approved history', async () => {
    const repository = new TestShariahReviewRepository();
    const review: ShariahReview = {
      id: 'review-4',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'approved',
      submittedByUserId: 'user-1',
      createdAt: '2026-03-15T00:00:00Z',
      decidedAt: '2026-03-18T09:15:00Z',
      rationale: 'All items passed review',
      checklist: {
        entries: [{ itemCode: 'item-1', outcome: 'pass' }],
        status: 'checklistComplete'
      }
    };
    
    repository.addReview(review);
    
    const result = await getShariahReviewHistory('review-4', repository);
    
    assert.deepStrictEqual(result, {
      status: 'found',
      history: {
        reviewId: 'review-4',
        organizationId: 'org-1',
        currentStatus: 'approved',
        history: [
          {
            action: 'reviewSubmitted',
            fromStatus: null,
            toStatus: 'submitted',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'Initial submission for review'
          },
          {
            action: 'checklistSaved',
            fromStatus: 'submitted',
            toStatus: 'checklistInProgress',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1'
          },
          {
            action: 'checklistCompleted',
            fromStatus: 'checklistInProgress',
            toStatus: 'checklistComplete',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'All mandatory items evaluated'
          },
          {
            action: 'decisionRecorded',
            fromStatus: 'checklistComplete',
            toStatus: 'approved',
            performedAt: '2026-03-18T09:15:00Z',
            performedByUserId: 'user-1',
            rationale: 'All items passed review'
          }
        ]
      }
    });
  });

  it('should return conditionalApproved history with rationale and conditions', async () => {
    const repository = new TestShariahReviewRepository();
    const review: ShariahReview = {
      id: 'review-5',
      organizationId: 'org-1',
      title: 'Test Review',
      summary: 'Test Summary',
      status: 'conditionalApproved',
      submittedByUserId: 'user-1',
      createdAt: '2026-03-15T00:00:00Z',
      decidedAt: '2026-03-18T09:15:00Z',
      rationale: 'Approved with conditions due to minor compliance issues',
      conditions: [
        {
          description: 'Update disclosure documentation',
          dueDate: '2026-04-30'
        }
      ],
      checklist: {
        entries: [{ itemCode: 'item-1', outcome: 'pass' }],
        status: 'checklistComplete'
      }
    };
    
    repository.addReview(review);
    
    const result = await getShariahReviewHistory('review-5', repository);
    
    assert.deepStrictEqual(result, {
      status: 'found',
      history: {
        reviewId: 'review-5',
        organizationId: 'org-1',
        currentStatus: 'conditionalApproved',
        history: [
          {
            action: 'reviewSubmitted',
            fromStatus: null,
            toStatus: 'submitted',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'Initial submission for review'
          },
          {
            action: 'checklistSaved',
            fromStatus: 'submitted',
            toStatus: 'checklistInProgress',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1'
          },
          {
            action: 'checklistCompleted',
            fromStatus: 'checklistInProgress',
            toStatus: 'checklistComplete',
            performedAt: '2026-03-15T00:00:00Z',
            performedByUserId: 'user-1',
            notes: 'All mandatory items evaluated'
          },
          {
            action: 'decisionRecorded',
            fromStatus: 'checklistComplete',
            toStatus: 'conditionalApproved',
            performedAt: '2026-03-18T09:15:00Z',
            performedByUserId: 'user-1',
            rationale: 'Approved with conditions due to minor compliance issues',
            conditions: [
              {
                description: 'Update disclosure documentation',
                dueDate: '2026-04-30'
              }
            ]
          }
        ]
      }
    });
  });
});
