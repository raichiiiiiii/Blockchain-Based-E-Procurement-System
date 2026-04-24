export type ShariahReviewStatus = 'submitted' | 'checklistInProgress' | 'checklistComplete' | 'approved' | 'rejected' | 'conditionalApproved';

export interface ShariahReviewReference {
  type: string;
  name: string;
  uri: string;
  description: string;
  mediaType: string;
}

export type ChecklistItemOutcome = 'pass' | 'fail' | 'notApplicable';

export interface ChecklistEntry {
  itemCode: string;
  outcome: ChecklistItemOutcome;
  comment?: string;
  evidenceRefs?: string[];
}

export interface Checklist {
  entries: ChecklistEntry[];
  reviewerComment?: string;
  status: ShariahReviewStatus;
}

export interface ChecklistItemDefinition {
  itemCode: string;
  isMandatory: boolean;
  requiresEvidence: boolean;
}

export interface Condition {
  description: string;
  dueDate: string; // ISO date string
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
  checklist?: Checklist;
  rationale?: string;
  conditions?: Condition[];
  decidedAt?: string;
}
