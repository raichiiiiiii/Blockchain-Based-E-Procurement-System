import type {
  ComplianceCaseResponse,
  ComplianceCaseStatus,
  ComplianceDecisionOutcome,
  ComplianceEligibility,
  SafeEvidenceReference,
} from '../../api/compliance-cases';

type ChecklistAudience = 'reviewer' | 'organization';
type ChecklistState = 'complete' | 'attention' | 'blocked' | 'unknown';

export type SmartOnboardingChecklistData = {
  memberOrganizationId: string;
  organizationName: string;
  eligibility: ComplianceEligibility;
  onboardingStatus: ComplianceCaseStatus | null;
  riskSummary?: string;
  expectedMonthlyTransactionValue?: string;
  evidenceReferences?: SafeEvidenceReference[];
  decisionOutcome?: ComplianceDecisionOutcome | null;
  reasonCodes?: string[];
  rationale?: string;
  checkedAt?: string;
};

type ChecklistItem = {
  label: string;
  state: ChecklistState;
  detail: string;
};

type SmartOnboardingChecklistProps = {
  audience: ChecklistAudience;
  data: SmartOnboardingChecklistData;
};

const eligibilityLabels: Record<ComplianceEligibility, string> = {
  eligible: 'Eligible',
  flagged: 'Flagged',
  blocked: 'Blocked',
  notEligible: 'Not eligible',
  pendingReview: 'Pending review',
  unknown: 'Unknown',
};

const onboardingStatusLabels: Record<ComplianceCaseStatus, string> = {
  approved: 'Approved',
  blocked: 'Blocked',
  flagged: 'Flagged',
  rejected: 'Rejected',
  submitted: 'Pending review',
};

const decisionLabels: Record<ComplianceDecisionOutcome, string> = {
  pass: 'Approved',
  fail: 'Rejected',
  flag: 'Flagged',
  block: 'Blocked',
};

function normalizeEvidenceType(value: string): string {
  return value.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function hasEvidence(references: SafeEvidenceReference[], candidates: string[]): boolean {
  const normalizedCandidates = candidates.map(normalizeEvidenceType);
  return references.some(reference => normalizedCandidates.includes(normalizeEvidenceType(reference.type)));
}

function eligibilityState(eligibility: ComplianceEligibility): ChecklistState {
  switch (eligibility) {
    case 'eligible':
      return 'complete';
    case 'flagged':
    case 'pendingReview':
      return 'attention';
    case 'blocked':
    case 'notEligible':
      return 'blocked';
    case 'unknown':
      return 'unknown';
  }
}

function evidenceState(hasSafeReference: boolean, eligibility: ComplianceEligibility): ChecklistState {
  if (hasSafeReference) {
    return 'complete';
  }

  if (eligibility === 'unknown') {
    return 'unknown';
  }

  return 'attention';
}

function statusState(status: ComplianceCaseStatus | null): ChecklistState {
  switch (status) {
    case 'approved':
      return 'complete';
    case 'flagged':
    case 'submitted':
      return 'attention';
    case 'blocked':
    case 'rejected':
      return 'blocked';
    case null:
      return 'unknown';
  }
}

function explainEligibility(data: SmartOnboardingChecklistData): string {
  switch (data.eligibility) {
    case 'eligible':
      return 'A valid approved onboarding decision exists. Transaction workflows may continue only after their own checks pass.';
    case 'flagged':
      return 'A reviewer flagged the organization. Transaction actions should pause for follow-up.';
    case 'blocked':
      return 'A reviewer blocked the organization. Transaction actions must not proceed.';
    case 'notEligible':
      return 'The organization was rejected during onboarding. Transaction actions must not proceed.';
    case 'pendingReview':
      return 'The onboarding case is waiting for a final compliance decision. Transaction actions remain paused.';
    case 'unknown':
      return 'No onboarding case can be resolved. Transaction actions remain paused by default.';
  }
}

function formatTimestamp(value?: string): string {
  if (!value) {
    return 'Not checked';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildChecklistItems(data: SmartOnboardingChecklistData): ChecklistItem[] {
  const references = data.evidenceReferences ?? [];
  const hasProfileMetadata = Boolean(data.riskSummary || data.expectedMonthlyTransactionValue);
  const hasBusinessRegistration = hasEvidence(references, [
    'companyRegistration',
    'businessRegistration',
    'licenseMetadata',
  ]);
  const hasOwnershipMetadata = hasEvidence(references, [
    'beneficialOwnership',
    'ownershipMetadata',
  ]);
  const hasRiskMetadata = data.eligibility !== 'unknown' || Boolean(data.riskSummary);

  return [
    {
      label: 'Profile metadata',
      state: evidenceState(hasProfileMetadata, data.eligibility),
      detail: hasProfileMetadata
        ? data.riskSummary ?? 'Safe profile metadata is available for review.'
        : 'Safe organization profile metadata is not available in this view.',
    },
    {
      label: 'Business registration metadata',
      state: evidenceState(hasBusinessRegistration, data.eligibility),
      detail: hasBusinessRegistration
        ? 'A registration or license reference is available as metadata only.'
        : 'No business registration reference is visible in the safe metadata set.',
    },
    {
      label: 'Ownership metadata',
      state: evidenceState(hasOwnershipMetadata, data.eligibility),
      detail: hasOwnershipMetadata
        ? 'Ownership metadata is represented by a safe reference or checksum.'
        : 'Ownership metadata is missing or not visible in the safe metadata set.',
    },
    {
      label: 'Risk flag status',
      state: eligibilityState(data.eligibility),
      detail: data.reasonCodes?.length
        ? `Reason codes: ${data.reasonCodes.join(', ')}.`
        : explainEligibility(data),
    },
    {
      label: 'Review status',
      state: statusState(data.onboardingStatus),
      detail: data.onboardingStatus
        ? `Current review state: ${onboardingStatusLabels[data.onboardingStatus]}.`
        : 'No review state is available for this organization.',
    },
  ];
}

function statusClassName(state: ChecklistState): string {
  switch (state) {
    case 'complete':
      return 'onboarding-checklist-complete';
    case 'attention':
      return 'onboarding-checklist-attention';
    case 'blocked':
      return 'onboarding-checklist-blocked';
    case 'unknown':
      return 'onboarding-checklist-unknown';
  }
}

export function smartOnboardingChecklistFromCase(
  onboardingCase: ComplianceCaseResponse,
): SmartOnboardingChecklistData {
  return {
    memberOrganizationId: onboardingCase.memberOrganizationId,
    organizationName: onboardingCase.organizationName,
    eligibility: onboardingCase.eligibility,
    onboardingStatus: onboardingCase.status,
    riskSummary: onboardingCase.riskSummary,
    expectedMonthlyTransactionValue: onboardingCase.expectedMonthlyTransactionValue,
    evidenceReferences: onboardingCase.evidenceReferences,
    decisionOutcome: onboardingCase.decision?.outcome ?? null,
    reasonCodes: onboardingCase.decision?.reasonCodes,
    rationale: onboardingCase.decision?.rationale,
    checkedAt: onboardingCase.updatedAt,
  };
}

function SmartOnboardingChecklist({ audience, data }: SmartOnboardingChecklistProps) {
  const checklistItems = buildChecklistItems(data);
  const evidenceReferences = data.evidenceReferences ?? [];
  const missingItems = checklistItems
    .filter(item => item.state !== 'complete')
    .map(item => item.label);

  return (
    <section className="onboarding-checklist" aria-label="Onboarding readiness checklist">
      <div className="onboarding-checklist-header">
        <div>
          <span>Onboarding readiness</span>
          <h3>{data.organizationName}</h3>
          <p>{explainEligibility(data)}</p>
        </div>
        <strong className={`onboarding-eligibility-pill ${statusClassName(eligibilityState(data.eligibility))}`}>
          {eligibilityLabels[data.eligibility]}
        </strong>
      </div>

      <div className="onboarding-checklist-grid">
        {checklistItems.map(item => (
          <article className={`onboarding-checklist-item ${statusClassName(item.state)}`} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.state === 'complete' ? 'Ready' : item.state === 'unknown' ? 'Unavailable' : 'Needs review'}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>

      <dl className="admin-definition-grid onboarding-checklist-details">
        <div>
          <dt>Organization</dt>
          <dd>{data.memberOrganizationId}</dd>
        </div>
        <div>
          <dt>Review status</dt>
          <dd>{data.onboardingStatus ? onboardingStatusLabels[data.onboardingStatus] : 'Unknown'}</dd>
        </div>
        <div>
          <dt>Decision</dt>
          <dd>{data.decisionOutcome ? decisionLabels[data.decisionOutcome] : 'No final decision'}</dd>
        </div>
        <div>
          <dt>Checked</dt>
          <dd>{formatTimestamp(data.checkedAt)}</dd>
        </div>
      </dl>

      <div className="onboarding-evidence-list" aria-label="Safe evidence metadata">
        <div className="admin-section-header">
          <div>
            <h4>Safe metadata</h4>
            <p>References and checksums are shown without exposing raw KYC or AML documents.</p>
          </div>
        </div>
        {evidenceReferences.length > 0 ? (
          <div className="workflow-meta-grid">
            {evidenceReferences.map(reference => (
              <div className="workflow-meta-panel" key={`${data.memberOrganizationId}-${reference.type}`}>
                <span>{reference.type}</span>
                <strong>{reference.label}</strong>
                <p>{reference.checksum ?? 'Checksum pending'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-product-state">No safe evidence metadata is available in this view.</div>
        )}
      </div>

      <div className="onboarding-reason-panel">
        <strong>{missingItems.length > 0 ? 'Missing or paused metadata' : 'No missing safe metadata detected'}</strong>
        <p>{missingItems.length > 0
          ? missingItems.join(', ')
          : 'The checklist has the metadata needed for this MVP readiness view.'}</p>
        {data.rationale && audience === 'reviewer' ? <p>Reviewer rationale: {data.rationale}</p> : null}
        <p className="onboarding-checklist-note">
          Eligibility gates remain enforced by the protected workflow services. This checklist is a read-only readiness view.
        </p>
      </div>
    </section>
  );
}

export default SmartOnboardingChecklist;
