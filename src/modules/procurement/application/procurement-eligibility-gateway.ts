export type ProcurementEligibility =
  | 'eligible'
  | 'flagged'
  | 'blocked'
  | 'notEligible'
  | 'pendingReview'
  | 'unknown';

export type ProcurementEligibilityResult = {
  memberOrganizationId: string;
  eligibility: ProcurementEligibility;
  reasonCodes?: string[];
  rationale?: string;
};

export interface ProcurementEligibilityGateway {
  checkOrganizationEligibility(memberOrganizationId: string): Promise<ProcurementEligibilityResult>;
}

export function canPerformProcurementAction(result: ProcurementEligibilityResult): boolean {
  return result.eligibility === 'eligible';
}
