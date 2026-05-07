import { requestJson } from './http-client';
import type { SubmitShariahReviewRequest, ShariahReviewResponse } from '../types/shariah-review';

export async function submitShariahReview(payload: SubmitShariahReviewRequest): Promise<ShariahReviewResponse> {
  return requestJson<ShariahReviewResponse>('/api/v1/shariah-reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}
