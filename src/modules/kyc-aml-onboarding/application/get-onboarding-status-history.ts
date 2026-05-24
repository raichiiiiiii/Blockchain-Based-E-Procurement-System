import type { OnboardingCaseRepository } from './create-onboarding-case.js';
import type { OnboardingCase } from '../domain/onboarding-case.js';

export type StatusHistoryEntry = {
  type: 'caseSubmitted' | 'decisionRecorded';
  fromStatus: string | null;
  toStatus: string;
  occurredAt: string;
  actorUserId: string;
  outcome?: string;
  rationale?: string;
  reasonCodes?: string[];
};

export type GetOnboardingStatusHistoryResult = 
  | { status: 'success'; data: {
      id: string;
      memberOrganizationId: string;
      currentStatus: string;
      isFinal: boolean;
      history: StatusHistoryEntry[];
    }}
  | { status: 'notFound'; message: string };

export async function getOnboardingStatusHistory(
  caseId: string,
  repository: OnboardingCaseRepository
): Promise<GetOnboardingStatusHistoryResult> {
  const onboardingCase = await repository.findById(caseId);
  
  if (!onboardingCase) {
    return {
      status: 'notFound',
      message: `Onboarding case with ID ${caseId} not found`
    };
  }

  const history: StatusHistoryEntry[] = [];
  
  // Add the case submission entry
  history.push({
    type: 'caseSubmitted',
    fromStatus: null,
    toStatus: 'submitted',
    actorUserId: onboardingCase.submittedByUserId,
    occurredAt: onboardingCase.createdAt
  });
  
  // If there's a decision, add the decision entry
  if (onboardingCase.decision) {
    history.push({
      type: 'decisionRecorded',
      fromStatus: 'submitted',
      toStatus: onboardingCase.status,
      outcome: onboardingCase.decision.outcome,
      rationale: onboardingCase.decision.rationale,
      reasonCodes: onboardingCase.decision.reasonCodes,
      actorUserId: onboardingCase.decision.decidedByUserId,
      occurredAt: onboardingCase.decision.decidedAt
    });
  }
  
  // Sort history entries chronologically (oldest to newest)
  history.sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  
  return {
    status: 'success',
    data: {
      id: onboardingCase.id,
      memberOrganizationId: onboardingCase.memberOrganizationId,
      currentStatus: onboardingCase.status,
      isFinal: onboardingCase.status !== 'submitted',
      history
    }
  };
}
