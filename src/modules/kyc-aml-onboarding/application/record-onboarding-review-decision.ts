import type {
  OnboardingCase,
  OnboardingCaseStatus,
  DecisionOutcome,
  ReasonCode
} from '../domain/onboarding-case.js';

type DecisionStatus = Exclude<OnboardingCaseStatus, 'submitted'>;

export interface RecordOnboardingReviewDecisionInput {
  caseId: string;
  outcome?: string;
  rationale?: string;
  reasonCodes?: string[];
  decidedByUserId: string;
}

export interface RecordOnboardingReviewDecisionResult {
  status: 'recorded';
  onboardingCase: OnboardingCase;
}

export interface RecordOnboardingReviewDecisionError {
  status: 'invalidInput';
  issues: string[];
}

export interface RecordOnboardingReviewDecisionNotFound {
  status: 'notFound';
  message: string;
}

export interface RecordOnboardingReviewDecisionConflict {
  status: 'conflict';
  message: string;
}

export type RecordOnboardingReviewDecisionResponse = 
  | RecordOnboardingReviewDecisionResult 
  | RecordOnboardingReviewDecisionError 
  | RecordOnboardingReviewDecisionNotFound
  | RecordOnboardingReviewDecisionConflict;

export interface OnboardingCaseRepository {
  save(onboardingCase: OnboardingCase): Promise<void>;
  findById(id: string): Promise<OnboardingCase | null>;
}

const ALLOWED_OUTCOMES: DecisionOutcome[] = ['pass', 'fail', 'flag', 'block'];
const ALLOWED_REASON_CODES: ReasonCode[] = [
  'identity_verification_failed',
  'beneficial_ownership_unverified',
  'sanctions_exposure',
  'pep_exposure',
  'inconsistent_business_activity',
  'missing_or_invalid_evidence',
  'high_risk_activity',
  'manual_compliance_concern'
];

const OUTCOME_TO_STATUS_MAP: Record<DecisionOutcome, DecisionStatus> = {
  'pass': 'approved',
  'fail': 'rejected',
  'flag': 'flagged',
  'block': 'blocked'
};

export async function recordOnboardingReviewDecision(
  input: RecordOnboardingReviewDecisionInput,
  repository: OnboardingCaseRepository
): Promise<RecordOnboardingReviewDecisionResponse> {
  // Validate required fields
  const issues: string[] = [];

  if (!input.outcome) {
    issues.push('Outcome is required');
  } else if (!ALLOWED_OUTCOMES.includes(input.outcome as DecisionOutcome)) {
    issues.push(`Invalid outcome value: ${input.outcome}. Must be one of: ${ALLOWED_OUTCOMES.join(', ')}`);
  }

  if (!input.rationale || input.rationale.trim() === '') {
    issues.push('Rationale is required');
  }

  // Validate reason codes
  if (input.reasonCodes) {
    for (const code of input.reasonCodes) {
      if (!ALLOWED_REASON_CODES.includes(code as ReasonCode)) {
        issues.push(`Invalid reason code: ${code}`);
      }
    }
  }

  // Check reason codes requirement for certain outcomes
  if (input.outcome && ['fail', 'flag', 'block'].includes(input.outcome)) {
    if (!input.reasonCodes || input.reasonCodes.length === 0) {
      issues.push(`${input.outcome} outcome requires at least one reason code`);
    }
  }

  if (issues.length > 0) {
    return {
      status: 'invalidInput',
      issues
    };
  }

  const outcome = input.outcome as DecisionOutcome;
  const reasonCodes = input.reasonCodes as ReasonCode[] | undefined;
  const rationale = input.rationale?.trim();

  if (!rationale) {
    return {
      status: 'invalidInput',
      issues: ['Rationale is required']
    };
  }

  // Find the onboarding case
  const onboardingCase = await repository.findById(input.caseId);
  if (!onboardingCase) {
    return {
      status: 'notFound',
      message: 'Onboarding case not found'
    };
  }

  // Check if decision already exists
  if (onboardingCase.decision) {
    return {
      status: 'conflict',
      message: 'Decision already recorded for this onboarding case'
    };
  }

  // Validate state transition
  if (onboardingCase.status !== 'submitted') {
    return {
      status: 'conflict',
      message: 'Cannot record decision for onboarding case that is not in submitted status'
    };
  }

  // Create decision metadata
  const now = new Date().toISOString();

  const decision = {
    outcome,
    rationale,
    reasonCodes,
    decidedByUserId: input.decidedByUserId,
    decidedAt: now
  };

  // Update the onboarding case
  const updatedCase: OnboardingCase = {
    ...onboardingCase,
    status: OUTCOME_TO_STATUS_MAP[outcome],
    decision,
    updatedAt: now
  };

  await repository.save(updatedCase);

  return {
    status: 'recorded',
    onboardingCase: updatedCase
  };
}
