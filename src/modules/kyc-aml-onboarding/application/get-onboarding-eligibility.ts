import type { OnboardingCase } from '../domain/onboarding-case.js';
import type { DecisionOutcome, ReasonCode, OnboardingCaseStatus } from '../domain/onboarding-case.js';

export type OnboardingEligibility = 
  | 'eligible'
  | 'flagged'
  | 'blocked'
  | 'notEligible'
  | 'pendingReview'
  | 'unknown';

export interface OnboardingEligibilityResult {
  memberOrganizationId: string;
  eligibility: OnboardingEligibility;
  onboardingStatus: OnboardingCaseStatus | null;
  decisionOutcome: DecisionOutcome | null;
  isFinal: boolean;
  sourceCaseId: string | null;
  checkedAt: string;
  reasonCodes?: ReasonCode[];
  rationale?: string;
}

export interface OnboardingCaseRepository {
  findLatestByOrganizationId(memberOrganizationId: string): Promise<OnboardingCase | null>;
}

export async function getOnboardingEligibility(
  memberOrganizationId: string,
  repository: OnboardingCaseRepository
): Promise<OnboardingEligibilityResult> {
  const onboardingCase = await repository.findLatestByOrganizationId(memberOrganizationId);
  
  const checkedAt = new Date().toISOString();
  
  // No case found
  if (!onboardingCase) {
    return {
      memberOrganizationId,
      eligibility: 'unknown',
      onboardingStatus: null,
      decisionOutcome: null,
      isFinal: false,
      sourceCaseId: null,
      checkedAt
    };
  }
  
  // Map status to eligibility
  let eligibility: OnboardingEligibility;
  let isFinal: boolean;
  
  switch (onboardingCase.status) {
    case 'approved':
      eligibility = 'eligible';
      isFinal = true;
      break;
    case 'flagged':
      eligibility = 'flagged';
      isFinal = true;
      break;
    case 'blocked':
      eligibility = 'blocked';
      isFinal = true;
      break;
    case 'rejected':
      eligibility = 'notEligible';
      isFinal = true;
      break;
    case 'submitted':
      eligibility = 'pendingReview';
      isFinal = false;
      break;
    default:
      eligibility = 'unknown';
      isFinal = false;
  }
  
  const result: OnboardingEligibilityResult = {
    memberOrganizationId,
    eligibility,
    onboardingStatus: onboardingCase.status,
    decisionOutcome: onboardingCase.decision?.outcome || null,
    isFinal,
    sourceCaseId: onboardingCase.id,
    checkedAt
  };
  
  // Include reason codes and rationale for flagged, blocked, and notEligible cases
  if (onboardingCase.decision && (eligibility === 'flagged' || eligibility === 'blocked' || eligibility === 'notEligible')) {
    if (onboardingCase.decision.reasonCodes) {
      result.reasonCodes = onboardingCase.decision.reasonCodes;
    }
    if (onboardingCase.decision.rationale) {
      result.rationale = onboardingCase.decision.rationale;
    }
  }
  
  return result;
}
