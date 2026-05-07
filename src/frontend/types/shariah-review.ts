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

// Decision types
export type ShariahDecisionOutcome =
  | 'approved'
  | 'rejected'
  | 'conditionalApproved';

export type ShariahDecisionCondition = {
  description: string;
  dueDate: string;
};

export type RecordShariahDecisionRequest = {
  outcome: ShariahDecisionOutcome;
  rationale: string;
  conditions?: ShariahDecisionCondition[];
};

export type ShariahDecisionResponse = {
  reviewId: string;
  status: ShariahDecisionOutcome;
  decidedAt: string;
};

// History types
export type ShariahReviewHistoryAction =
  | 'reviewSubmitted'
  | 'checklistSaved'
  | 'checklistCompleted'
  | 'decisionRecorded';

export type ShariahReviewStatusHistoryEntry = {
  action: ShariahReviewHistoryAction;
  fromStatus: ShariahReviewStatus | null;
  toStatus: ShariahReviewStatus;
  performedAt: string;
  performedByUserId: string;
  notes?: string;
  rationale?: string;
  conditions?: ShariahDecisionCondition[];
};

export type ShariahReviewHistoryResponse = {
  reviewId: string;
  organizationId: string;
  currentStatus: ShariahReviewStatus;
  history: ShariahReviewStatusHistoryEntry[];
};
