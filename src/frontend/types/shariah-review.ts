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

// Checklist types
export type ChecklistItemOutcome = 'pass' | 'fail' | 'notApplicable';

export type ChecklistWorkflowStatus = 'checklistInProgress' | 'checklistComplete';

export type ChecklistEntry = {
  itemCode: string;
  outcome: ChecklistItemOutcome;
  comment?: string;
  evidenceRefs?: string[];
};

export type UpdateChecklistRequest = {
  entries: ChecklistEntry[];
  reviewerComment?: string;
  completeChecklist?: boolean;
};

export type ChecklistResponse = {
  reviewId: string;
  status: ChecklistWorkflowStatus;
};
