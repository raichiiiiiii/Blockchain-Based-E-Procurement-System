export type ShariahReviewStatus = 'submitted' | 'checklistInProgress' | 'checklistComplete' | 'approved' | 'rejected' | 'conditionalApproved';

export interface ShariahReviewReference {
  type: string;
  name: string;
  uri: string;
  description: string;
  mediaType: string;
}

export type SubmitShariahReviewRequest = {
  organizationId: string;
  title: string;
  summary: string;
  references?: ShariahReviewReference[];
};

export type ShariahReviewResponse = {
  id: string;
  organizationId: string;
  title: string;
  summary: string;
  status: ShariahReviewStatus;
  submittedByUserId: string;
  createdAt: string;
  references?: ShariahReviewReference[];
};
