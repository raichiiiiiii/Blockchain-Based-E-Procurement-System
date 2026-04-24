import type { ShariahReview } from '../domain/shariah-review.js';
import type { ShariahReviewRepository } from './shariah-review-repository.js';

export type DecisionOutcome = 'approved' | 'rejected' | 'conditionalApproved';

export interface DecisionInput {
  reviewId: string;
  outcome: DecisionOutcome;
  rationale: string;
  conditions?: {
    description: string;
    dueDate: string;
  }[];
}

export type DecisionResult = 
  | { status: 'success'; review: ShariahReview }
  | { status: 'notFound' }
  | { status: 'invalidState'; currentStatus: string }
  | { status: 'validationError'; issues: string[] };

export async function recordShariahReviewDecision(
  input: DecisionInput,
  repository: ShariahReviewRepository
): Promise<DecisionResult> {
  // Validate input
  const validationIssues: string[] = [];

  if (!input.rationale || input.rationale.trim().length === 0) {
    validationIssues.push('Rationale is required for all final decisions');
  }

  if (input.outcome === 'conditionalApproved') {
    if (!input.conditions || input.conditions.length === 0) {
      validationIssues.push('Conditional approval requires at least one condition');
    } else {
      for (const condition of input.conditions) {
        if (!condition.description || condition.description.trim().length === 0) {
          validationIssues.push('Each condition must include a description');
        }
        if (!condition.dueDate) {
          validationIssues.push('Each condition must include a due date');
        }
      }
    }
  } else if (input.conditions && input.conditions.length > 0) {
    validationIssues.push(`${input.outcome} decisions must not include conditions`);
  }

  if (validationIssues.length > 0) {
    return { status: 'validationError', issues: validationIssues };
  }

  // Load review
  const review = await repository.findById(input.reviewId);
  if (!review) {
    return { status: 'notFound' };
  }

  // Validate state transition
  if (review.status !== 'checklistComplete') {
    return { 
      status: 'invalidState', 
      currentStatus: review.status 
    };
  }

  // Apply decision
  const updatedReview: ShariahReview = {
    ...review,
    status: input.outcome,
    rationale: input.rationale.trim(),
    decidedAt: new Date().toISOString()
  };

  if (input.outcome === 'conditionalApproved' && input.conditions) {
    updatedReview.conditions = input.conditions.map(condition => ({
      description: condition.description.trim(),
      dueDate: condition.dueDate
    }));
  }

  // Save updated review
  const savedReview = await repository.save(updatedReview);
  
  return { status: 'success', review: savedReview };
}
