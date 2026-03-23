import type { ShariahReview } from '../domain/shariah-review.js';

export interface ShariahReviewRepository {
  save(review: ShariahReview): Promise<ShariahReview>;
}
