import { BackendApiError } from './errors';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type ComplianceCaseStatus = 'submitted' | 'approved' | 'rejected' | 'flagged' | 'blocked';
export type ComplianceEligibility = 'eligible' | 'flagged' | 'blocked' | 'notEligible' | 'pendingReview' | 'unknown';
export type ComplianceDecisionOutcome = 'pass' | 'fail' | 'flag' | 'block';

export type SafeEvidenceReference = {
  type: string;
  label: string;
  checksum?: string;
};

export type ComplianceDecision = {
  outcome: ComplianceDecisionOutcome;
  rationale: string;
  reasonCodes: string[];
  decidedByUserId: string;
  decidedAt: string;
};

export type ComplianceCaseResponse = {
  caseId: string;
  memberOrganizationId: string;
  organizationName: string;
  status: ComplianceCaseStatus;
  eligibility: ComplianceEligibility;
  submittedAt: string;
  updatedAt: string;
  riskSummary: string;
  expectedMonthlyTransactionValue: string;
  evidenceReferences: SafeEvidenceReference[];
  decision?: ComplianceDecision;
};

export type RecordComplianceDecisionRequest = {
  outcome: ComplianceDecisionOutcome;
  rationale: string;
  reasonCodes?: string[];
};

export type ComplianceEligibilityResult = {
  memberOrganizationId: string;
  eligibility: ComplianceEligibility;
  onboardingStatus: ComplianceCaseStatus | null;
  decisionOutcome: ComplianceDecisionOutcome | null;
  isFinal: boolean;
  sourceCaseId: string | null;
  checkedAt: string;
  reasonCodes?: string[];
  rationale?: string;
};

export type ComplianceChecklistSnapshot = {
  memberOrganizationId: string;
  organizationName: string;
  eligibility: ComplianceEligibility;
  onboardingStatus: ComplianceCaseStatus | null;
  riskSummary?: string;
  expectedMonthlyTransactionValue?: string;
  evidenceReferences: SafeEvidenceReference[];
  decisionOutcome: ComplianceDecisionOutcome | null;
  isFinal: boolean;
  sourceCaseId: string | null;
  checkedAt: string;
  reasonCodes?: string[];
  rationale?: string;
};

const STORAGE_KEY = 'eprocurement.compliance.cases.v1';

const seedCases: ComplianceCaseResponse[] = [
  {
    caseId: 'kyc-local-buyer-approved',
    memberOrganizationId: 'demo-buyer-org',
    organizationName: 'Buyer Operations Sdn Bhd',
    status: 'approved',
    eligibility: 'eligible',
    submittedAt: '2026-05-20T09:15:00.000Z',
    updatedAt: '2026-05-21T11:30:00.000Z',
    riskSummary: 'Low operational risk, approved for procurement activity.',
    expectedMonthlyTransactionValue: '500000.00',
    evidenceReferences: [
      { type: 'companyRegistration', label: 'Company registration', checksum: 'sha256:buyer-registration-ref' },
      { type: 'amlDeclaration', label: 'AML declaration', checksum: 'sha256:buyer-aml-ref' },
    ],
    decision: {
      outcome: 'pass',
      rationale: 'Evidence metadata is consistent with onboarding policy.',
      reasonCodes: [],
      decidedByUserId: 'demo-compliance-user',
      decidedAt: '2026-05-21T11:30:00.000Z',
    },
  },
  {
    caseId: 'kyc-local-supplier-approved',
    memberOrganizationId: 'demo-supplier-org',
    organizationName: 'Supplier Manufacturing Sdn Bhd',
    status: 'approved',
    eligibility: 'eligible',
    submittedAt: '2026-05-20T10:20:00.000Z',
    updatedAt: '2026-05-21T12:10:00.000Z',
    riskSummary: 'Supplier profile cleared for received order acknowledgement.',
    expectedMonthlyTransactionValue: '350000.00',
    evidenceReferences: [
      { type: 'companyRegistration', label: 'Company registration', checksum: 'sha256:supplier-registration-ref' },
      { type: 'beneficialOwnership', label: 'Beneficial ownership metadata', checksum: 'sha256:supplier-beneficial-ref' },
    ],
    decision: {
      outcome: 'pass',
      rationale: 'Ownership and AML declarations meet the MVP onboarding policy.',
      reasonCodes: [],
      decidedByUserId: 'demo-compliance-user',
      decidedAt: '2026-05-21T12:10:00.000Z',
    },
  },
  {
    caseId: 'kyc-local-financier-approved',
    memberOrganizationId: 'demo-financier-org',
    organizationName: 'Amanah Finance Partner',
    status: 'approved',
    eligibility: 'eligible',
    submittedAt: '2026-05-20T11:00:00.000Z',
    updatedAt: '2026-05-21T13:00:00.000Z',
    riskSummary: 'Financing partner profile cleared for PLS seedbed participation.',
    expectedMonthlyTransactionValue: '750000.00',
    evidenceReferences: [
      { type: 'licenseMetadata', label: 'Financing license metadata', checksum: 'sha256:financier-license-ref' },
      { type: 'amlDeclaration', label: 'AML declaration', checksum: 'sha256:financier-aml-ref' },
    ],
    decision: {
      outcome: 'pass',
      rationale: 'Financing partner metadata meets the demo onboarding policy.',
      reasonCodes: [],
      decidedByUserId: 'demo-compliance-user',
      decidedAt: '2026-05-21T13:00:00.000Z',
    },
  },
  {
    caseId: 'kyc-local-pending-review',
    memberOrganizationId: 'demo-pending-org',
    organizationName: 'Pending Trading Sdn Bhd',
    status: 'submitted',
    eligibility: 'pendingReview',
    submittedAt: '2026-05-22T08:05:00.000Z',
    updatedAt: '2026-05-22T08:05:00.000Z',
    riskSummary: 'Review is waiting for compliance decision.',
    expectedMonthlyTransactionValue: '180000.00',
    evidenceReferences: [
      { type: 'companyRegistration', label: 'Company registration', checksum: 'sha256:pending-registration-ref' },
      { type: 'amlDeclaration', label: 'AML declaration', checksum: 'sha256:pending-aml-ref' },
    ],
  },
  {
    caseId: 'kyc-local-blocked-review',
    memberOrganizationId: 'demo-blocked-org',
    organizationName: 'Blocked Importer Sdn Bhd',
    status: 'blocked',
    eligibility: 'blocked',
    submittedAt: '2026-05-18T14:00:00.000Z',
    updatedAt: '2026-05-19T09:45:00.000Z',
    riskSummary: 'Sanctions exposure requires transaction block.',
    expectedMonthlyTransactionValue: '900000.00',
    evidenceReferences: [
      { type: 'amlDeclaration', label: 'AML declaration', checksum: 'sha256:blocked-aml-ref' },
    ],
    decision: {
      outcome: 'block',
      rationale: 'Sanctions exposure prevents procurement activity.',
      reasonCodes: ['sanctions_exposure'],
      decidedByUserId: 'demo-compliance-user',
      decidedAt: '2026-05-19T09:45:00.000Z',
    },
  },
  {
    caseId: 'kyc-local-flagged-review',
    memberOrganizationId: 'demo-flagged-org',
    organizationName: 'Flagged Services Sdn Bhd',
    status: 'flagged',
    eligibility: 'flagged',
    submittedAt: '2026-05-17T10:00:00.000Z',
    updatedAt: '2026-05-18T13:30:00.000Z',
    riskSummary: 'Beneficial ownership metadata requires manual follow-up.',
    expectedMonthlyTransactionValue: '240000.00',
    evidenceReferences: [
      { type: 'beneficialOwnership', label: 'Beneficial ownership metadata', checksum: 'sha256:flagged-beneficial-ref' },
    ],
    decision: {
      outcome: 'flag',
      rationale: 'Beneficial ownership evidence needs additional verification.',
      reasonCodes: ['beneficial_ownership_unverified'],
      decidedByUserId: 'demo-compliance-user',
      decidedAt: '2026-05-18T13:30:00.000Z',
    },
  },
];

function statusToEligibility(status: ComplianceCaseStatus): ComplianceEligibility {
  switch (status) {
    case 'approved':
      return 'eligible';
    case 'flagged':
      return 'flagged';
    case 'blocked':
      return 'blocked';
    case 'rejected':
      return 'notEligible';
    case 'submitted':
      return 'pendingReview';
  }
}

function statusFromDecision(outcome: ComplianceDecisionOutcome): ComplianceCaseStatus {
  switch (outcome) {
    case 'pass':
      return 'approved';
    case 'fail':
      return 'rejected';
    case 'flag':
      return 'flagged';
    case 'block':
      return 'blocked';
  }
}

function hasComplianceAccess(session?: AuthenticatedFrontendSession): boolean {
  const roles = session?.actor.actorRoleCodes ?? [];
  return roles.includes('complianceReviewer') || roles.includes('administrator');
}

function hasSafeSnapshotAccess(
  memberOrganizationId: string,
  session?: AuthenticatedFrontendSession,
): boolean {
  if (!session) {
    return false;
  }

  if (hasComplianceAccess(session)) {
    return true;
  }

  return session.actor.actorOrganizationId === memberOrganizationId;
}

function readCases(): ComplianceCaseResponse[] {
  if (typeof window === 'undefined') {
    return seedCases.map(item => ({ ...item }));
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedCases));
    return seedCases.map(item => ({ ...item }));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      const merged = [...parsed] as ComplianceCaseResponse[];
      let changed = false;
      for (const seedCase of seedCases) {
        if (!merged.some(item => item.caseId === seedCase.caseId)) {
          merged.push(seedCase);
          changed = true;
        }
      }
      if (changed) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      }
      return merged;
    }
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedCases));
  }

  return seedCases.map(item => ({ ...item }));
}

function writeCases(cases: ComplianceCaseResponse[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(cases));
}

function sortCases(cases: ComplianceCaseResponse[]): ComplianceCaseResponse[] {
  return [...cases].sort((left, right) => {
    const statusRank = (status: ComplianceCaseStatus) => status === 'submitted' ? 0 : 1;
    const rankDifference = statusRank(left.status) - statusRank(right.status);
    if (rankDifference !== 0) {
      return rankDifference;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

export async function listComplianceCases(
  session?: AuthenticatedFrontendSession,
): Promise<ComplianceCaseResponse[]> {
  if (!hasComplianceAccess(session)) {
    throw new BackendApiError('FORBIDDEN', 'User is not allowed to review compliance cases');
  }

  return sortCases(readCases());
}

export async function recordComplianceDecision(
  caseId: string,
  request: RecordComplianceDecisionRequest,
  session?: AuthenticatedFrontendSession,
): Promise<ComplianceCaseResponse> {
  if (!hasComplianceAccess(session)) {
    throw new BackendApiError('FORBIDDEN', 'User is not allowed to record compliance decisions');
  }

  const cases = readCases();
  const caseIndex = cases.findIndex(candidate => candidate.caseId === caseId);
  if (caseIndex < 0) {
    throw new BackendApiError('NOT_FOUND', 'Compliance case was not found');
  }

  const current = cases[caseIndex];
  if (current.status !== 'submitted') {
    throw new BackendApiError('CONFLICT', 'A final compliance decision already exists for this case');
  }

  if (!request.rationale.trim()) {
    throw new BackendApiError('VALIDATION_ERROR', 'Decision rationale is required');
  }

  if (request.outcome !== 'pass' && (!request.reasonCodes || request.reasonCodes.length === 0)) {
    throw new BackendApiError('VALIDATION_ERROR', 'Reason codes are required for this decision');
  }

  const decidedAt = new Date().toISOString();
  const nextStatus = statusFromDecision(request.outcome);
  const updated: ComplianceCaseResponse = {
    ...current,
    status: nextStatus,
    eligibility: statusToEligibility(nextStatus),
    updatedAt: decidedAt,
    decision: {
      outcome: request.outcome,
      rationale: request.rationale.trim(),
      reasonCodes: request.reasonCodes ?? [],
      decidedByUserId: session?.actor.actorUserId ?? 'local-compliance-user',
      decidedAt,
    },
  };

  cases[caseIndex] = updated;
  writeCases(cases);
  return updated;
}

export function getLocalOrganizationEligibility(memberOrganizationId: string): ComplianceEligibilityResult {
  const onboardingCase = readCases().find(item => item.memberOrganizationId === memberOrganizationId);
  const checkedAt = new Date().toISOString();

  if (!onboardingCase) {
    return {
      memberOrganizationId,
      eligibility: 'unknown',
      onboardingStatus: null,
      decisionOutcome: null,
      isFinal: false,
      sourceCaseId: null,
      checkedAt,
    };
  }

  return {
    memberOrganizationId,
    eligibility: onboardingCase.eligibility,
    onboardingStatus: onboardingCase.status,
    decisionOutcome: onboardingCase.decision?.outcome ?? null,
    isFinal: onboardingCase.status !== 'submitted',
    sourceCaseId: onboardingCase.caseId,
    checkedAt,
    reasonCodes: onboardingCase.decision?.reasonCodes,
    rationale: onboardingCase.decision?.rationale,
  };
}

export async function getComplianceChecklistSnapshot(
  memberOrganizationId: string,
  session?: AuthenticatedFrontendSession,
): Promise<ComplianceChecklistSnapshot> {
  if (!hasSafeSnapshotAccess(memberOrganizationId, session)) {
    throw new BackendApiError('FORBIDDEN', 'User is not allowed to inspect this onboarding readiness view');
  }

  const onboardingCase = readCases().find(item => item.memberOrganizationId === memberOrganizationId);
  const checkedAt = new Date().toISOString();

  if (!onboardingCase) {
    return {
      memberOrganizationId,
      organizationName: memberOrganizationId,
      eligibility: 'unknown',
      onboardingStatus: null,
      evidenceReferences: [],
      decisionOutcome: null,
      isFinal: false,
      sourceCaseId: null,
      checkedAt,
    };
  }

  const includeReviewerRationale = hasComplianceAccess(session);

  return {
    memberOrganizationId: onboardingCase.memberOrganizationId,
    organizationName: onboardingCase.organizationName,
    eligibility: onboardingCase.eligibility,
    onboardingStatus: onboardingCase.status,
    riskSummary: onboardingCase.riskSummary,
    expectedMonthlyTransactionValue: onboardingCase.expectedMonthlyTransactionValue,
    evidenceReferences: onboardingCase.evidenceReferences,
    decisionOutcome: onboardingCase.decision?.outcome ?? null,
    isFinal: onboardingCase.status !== 'submitted',
    sourceCaseId: onboardingCase.caseId,
    checkedAt,
    reasonCodes: onboardingCase.decision?.reasonCodes,
    rationale: includeReviewerRationale ? onboardingCase.decision?.rationale : undefined,
  };
}
