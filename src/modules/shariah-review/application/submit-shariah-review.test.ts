import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { submitShariahReview, type SubmitShariahReviewInput } from './submit-shariah-review.js';
import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from './shariah-review-repository.js';

class TestShariahReviewRepository implements ShariahReviewRepository {
  public savedReviews: ShariahReview[] = [];

  async save(review: ShariahReview): Promise<ShariahReview> {
    this.savedReviews.push(review);
    return review;
  }
}

describe('submitShariahReview', () => {
  it('should return status "submitted" and persist a review with status "submitted" for valid input', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.',
      submittedByUserId: 'user456'
    };

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'submitted');
    assert.ok(result.review);
    assert.strictEqual(result.review.status, 'submitted');
    assert.strictEqual(repository.savedReviews.length, 1);
    assert.strictEqual(repository.savedReviews[0], result.review);
  });

  it('should return invalidInput for missing organizationId', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      // organizationId: 'org123', // Missing
      title: 'Test Review',
      summary: 'This is a test summary.',
      submittedByUserId: 'user456'
    } as any; // Cast to any to simulate missing property

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for whitespace-only organizationId', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: '   ', // Whitespace-only
      title: 'Test Review',
      summary: 'This is a test summary.',
      submittedByUserId: 'user456'
    };

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for missing title', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      // title: 'Test Review', // Missing
      summary: 'This is a test summary.',
      submittedByUserId: 'user456'
    } as any; // Cast to any to simulate missing property

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for whitespace-only title', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      title: '   ', // Whitespace-only
      summary: 'This is a test summary.',
      submittedByUserId: 'user456'
    };

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for missing summary', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      title: 'Test Review',
      // summary: 'This is a test summary.', // Missing
      submittedByUserId: 'user456'
    } as any; // Cast to any to simulate missing property

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for whitespace-only summary', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: '   ', // Whitespace-only
      submittedByUserId: 'user456'
    };

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for missing submittedByUserId', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.', // Added missing comma here
      // submittedByUserId: 'user456' // Missing
    } as any; // Cast to any to simulate missing property

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should return invalidInput for whitespace-only submittedByUserId', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: 'org123',
      title: 'Test Review',
      summary: 'This is a test summary.',
      submittedByUserId: '   ' // Whitespace-only
    };

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'invalidInput');
    assert.strictEqual(repository.savedReviews.length, 0);
  });

  it('should trim values and persist them trimmed', async () => {
    const repository = new TestShariahReviewRepository();
    const input: SubmitShariahReviewInput = {
      organizationId: '  org123  ',
      title: '  Test Review  ',
      summary: '  This is a test summary.  ',
      submittedByUserId: '  user456  '
    };

    const result = await submitShariahReview(input, repository);

    assert.strictEqual(result.status, 'submitted');
    assert.ok(result.review);
    assert.strictEqual(result.review.organizationId, 'org123');
    assert.strictEqual(result.review.title, 'Test Review');
    assert.strictEqual(result.review.summary, 'This is a test summary.');
    assert.strictEqual(result.review.submittedByUserId, 'user456');
    assert.strictEqual(repository.savedReviews.length, 1);
    assert.strictEqual(repository.savedReviews[0], result.review);
  });
});
