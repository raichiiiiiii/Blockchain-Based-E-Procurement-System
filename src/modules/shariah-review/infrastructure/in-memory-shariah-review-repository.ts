import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from '../application/shariah-review-repository.js';

export class InMemoryShariahReviewRepository implements ShariahReviewRepository {
  private readonly reviews: ShariahReview[] = [];

  async save(review: ShariahReview): Promise<ShariahReview> {
    this.reviews.push(review);
    return review;
  }
}
