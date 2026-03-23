import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from './shariah-review-repository.js';

export type SubmitShariahReviewInput = {
  organizationId: string;
  title: string;
  summary: string;
  submittedByUserId: string;
};

export type SubmitShariahReviewResult =
  | { status: 'submitted'; review: ShariahReview }
  | { status: 'invalidInput' };

function isValidString(value: string): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export async function submitShariahReview(
  input: SubmitShariahReviewInput,
  repository: ShariahReviewRepository
): Promise<SubmitShariahReviewResult> {
  // Validate required fields
  if (
    !isValidString(input.organizationId) ||
    !isValidString(input.title) ||
    !isValidString(input.summary) ||
    !isValidString(input.submittedByUserId)
  ) {
    return { status: 'invalidInput' };
  }

  // Trim required string fields
  const trimmedInput = {
    organizationId: input.organizationId.trim(),
    title: input.title.trim(),
    summary: input.summary.trim(),
    submittedByUserId: input.submittedByUserId.trim()
  };

  // Create the ShariahReview entity
  const newReview: ShariahReview = {
    id: `review_${Math.random().toString(36).substring(2, 15)}`, // Simple ID generation
    organizationId: trimmedInput.organizationId,
    title: trimmedInput.title,
    summary: trimmedInput.summary,
    status: 'submitted',
    submittedByUserId: trimmedInput.submittedByUserId,
    createdAt: new Date().toISOString()
  };

  // Save the review using the repository
  const savedReview = await repository.save(newReview);

  // Return the result
  return { status: 'submitted', review: savedReview };
}
