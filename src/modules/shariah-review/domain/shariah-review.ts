export type ShariahReviewStatus = 'submitted';

export interface ShariahReviewReference {
  type: string;
  name: string;
  uri: string;
  description: string;
  mediaType: string;
}

export interface ShariahReview {
  id: string;
  organizationId: string;
  title: string;
  summary: string;
  status: ShariahReviewStatus;
  submittedByUserId: string;
  createdAt: string;
  references?: ShariahReviewReference[];
}
