export type ShariahReviewStatus = 'submitted';

export interface ShariahReview {
  id: string;
  organizationId: string;
  title: string;
  summary: string;
  status: ShariahReviewStatus;
  submittedByUserId: string;
  createdAt: string;
}
