import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from '../application/shariah-review-repository.js';

export class InMemoryShariahReviewRepository implements ShariahReviewRepository {
  private readonly reviews: ShariahReview[] = [];

  async save(review: ShariahReview): Promise<ShariahReview> {
    // Check if review already exists, if so update it
    const index = this.reviews.findIndex(r => r.id === review.id);
    if (index !== -1) {
      this.reviews[index] = review;
    } else {
      this.reviews.push(review);
    }
    return review;
  }

  async findById(id: string): Promise<ShariahReview | null> {
    const review = this.reviews.find(r => r.id === id);
    return review || null;
  }
}
