import type { ShariahReviewRepository } from './shariah-review-repository.js';
import type { 
  ShariahReview, 
  ShariahReviewStatus, 
  Checklist 
} from '../domain/shariah-review.js';

export interface HistoryEntry {
  action: 'reviewSubmitted' | 'checklistSaved' | 'checklistCompleted' | 'decisionRecorded';
  fromStatus: ShariahReviewStatus | null;
  toStatus: ShariahReviewStatus;
  performedAt: string;
  performedByUserId: string;
  notes?: string;
  rationale?: string;
  conditions?: {
    description: string;
    dueDate: string;
  }[];
}

export interface ShariahReviewHistory {
  reviewId: string;
  organizationId: string;
  currentStatus: ShariahReviewStatus;
  history: HistoryEntry[];
}

export type GetShariahReviewHistoryResult = 
  | { status: 'found'; history: ShariahReviewHistory }
  | { status: 'notFound' };

export async function getShariahReviewHistory(
  reviewId: string,
  repository: ShariahReviewRepository
): Promise<GetShariahReviewHistoryResult> {
  const review = await repository.findById(reviewId);
  
  if (!review) {
    return { status: 'notFound' };
  }

  const history: HistoryEntry[] = [];
  
  // Initial submission entry
  history.push({
    action: 'reviewSubmitted',
    fromStatus: null,
    toStatus: 'submitted',
    performedAt: review.createdAt,
    performedByUserId: review.submittedByUserId,
    notes: 'Initial submission for review'
  });

  // Checklist entries
  if (review.checklist) {
    const checklist = review.checklist;
    
    if (checklist.status === 'checklistInProgress') {
      // Add checklist saved entry
      history.push({
        action: 'checklistSaved',
        fromStatus: 'submitted',
        toStatus: 'checklistInProgress',
        performedAt: review.createdAt, // In a real implementation, this would be the actual save time
        performedByUserId: review.submittedByUserId // In a real implementation, this would be the actual author
      });
    } else if (checklist.status === 'checklistComplete') {
      // Add checklist saved entry
      history.push({
        action: 'checklistSaved',
        fromStatus: 'submitted',
        toStatus: 'checklistInProgress',
        performedAt: review.createdAt, // In a real implementation, this would be the actual save time
        performedByUserId: review.submittedByUserId // In a real implementation, this would be the actual author
      });
      
      // Add checklist completed entry
      history.push({
        action: 'checklistCompleted',
        fromStatus: 'checklistInProgress',
        toStatus: 'checklistComplete',
        performedAt: review.createdAt, // In a real implementation, this would be the actual completion time
        performedByUserId: review.submittedByUserId, // In a real implementation, this would be the actual author
        notes: 'All mandatory items evaluated'
      });
    }
  }

  // Decision entry
  if (review.status === 'approved' || review.status === 'rejected' || review.status === 'conditionalApproved') {
    const decisionEntry: HistoryEntry = {
      action: 'decisionRecorded',
      fromStatus: 'checklistComplete',
      toStatus: review.status,
      performedAt: review.decidedAt || review.createdAt, // Fallback to createdAt if decidedAt is not available
      performedByUserId: review.submittedByUserId, // In a real implementation, this would be the decision maker
      rationale: review.rationale
    };

    if (review.conditions && review.conditions.length > 0) {
      decisionEntry.conditions = review.conditions;
    }

    history.push(decisionEntry);
  }

  // Derive current status from the latest valid recorded state
  let currentStatus: ShariahReviewStatus = 'submitted';
  
  if (review.checklist) {
    if (review.checklist.status === 'checklistInProgress') {
      currentStatus = 'checklistInProgress';
    } else if (review.checklist.status === 'checklistComplete') {
      currentStatus = 'checklistComplete';
    }
  }
  
  if (review.status === 'approved' || review.status === 'rejected' || review.status === 'conditionalApproved') {
    currentStatus = review.status;
  }

  return {
    status: 'found',
    history: {
      reviewId: review.id,
      organizationId: review.organizationId,
      currentStatus,
      history
    }
  };
}
