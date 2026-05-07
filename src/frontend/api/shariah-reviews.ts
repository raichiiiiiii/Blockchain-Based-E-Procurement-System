import { requestJson } from './http-client';
import type { SubmitShariahReviewRequest, ShariahReviewResponse } from '../types/shariah-review';
import type { UpdateChecklistRequest, ChecklistResponse } from '../types/shariah-review';
import type {
  RecordShariahDecisionRequest,
  ShariahDecisionResponse
} from '../types/shariah-review';
import type { ShariahReviewHistoryResponse } from '../types/shariah-review';

export async function submitShariahReview(payload: SubmitShariahReviewRequest): Promise<ShariahReviewResponse> {
  return requestJson<ShariahReviewResponse>('/api/v1/shariah-reviews', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function updateShariahReviewChecklist(
  reviewId: string,
  payload: UpdateChecklistRequest
): Promise<ChecklistResponse> {
  return requestJson<ChecklistResponse>(`/api/v1/shariah-reviews/${reviewId}/checklist`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
}

export async function recordShariahReviewDecision(
  reviewId: string,
  payload: RecordShariahDecisionRequest
): Promise<ShariahDecisionResponse> {
  return requestJson<ShariahDecisionResponse>(
    `/api/v1/shariah-reviews/${reviewId}/decision`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }
  );
}

export async function getShariahReviewHistory(
  reviewId: string
): Promise<ShariahReviewHistoryResponse> {
  return requestJson<ShariahReviewHistoryResponse>(
    `/api/v1/shariah-reviews/${reviewId}/history`
  );
}
