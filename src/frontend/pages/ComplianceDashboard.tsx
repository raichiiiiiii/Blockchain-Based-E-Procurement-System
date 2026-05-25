import { useEffect, useMemo, useState } from 'react';
import {
  listComplianceCases,
  recordComplianceDecision,
  type ComplianceCaseResponse,
  type ComplianceDecisionOutcome,
} from '../api/compliance-cases';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

type ComplianceDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type DecisionFormState = {
  outcome: ComplianceDecisionOutcome;
  rationale: string;
  reasonCodes: string;
};

const initialDecisionForm: DecisionFormState = {
  outcome: 'pass',
  rationale: 'Evidence metadata satisfies onboarding policy.',
  reasonCodes: '',
};

function formatCaseStatus(status: ComplianceCaseResponse['status']): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'blocked':
      return 'Blocked';
    case 'flagged':
      return 'Flagged';
    case 'rejected':
      return 'Rejected';
    case 'submitted':
      return 'Pending review';
  }
}

function formatEligibility(eligibility: ComplianceCaseResponse['eligibility']): string {
  switch (eligibility) {
    case 'eligible':
      return 'Eligible';
    case 'blocked':
      return 'Blocked';
    case 'flagged':
      return 'Flagged';
    case 'notEligible':
      return 'Not eligible';
    case 'pendingReview':
      return 'Pending review';
    case 'unknown':
      return 'Unknown';
  }
}

function statusClass(status: ComplianceCaseResponse['status']): string {
  if (status === 'approved') {
    return 'admin-status-active';
  }

  if (status === 'blocked' || status === 'rejected') {
    return 'admin-status-danger';
  }

  return 'admin-status-pending';
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function ComplianceDashboard({ activeTarget, session }: ComplianceDashboardProps) {
  const [cases, setCases] = useState<ComplianceCaseResponse[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>();
  const [decisionForm, setDecisionForm] = useState<DecisionFormState>(initialDecisionForm);
  const [isLoadingCases, setIsLoadingCases] = useState(false);
  const [isRecordingDecision, setIsRecordingDecision] = useState(false);
  const [caseError, setCaseError] = useState<string | undefined>();
  const [caseMessage, setCaseMessage] = useState<string | undefined>();

  const selectedCase = useMemo(
    () => cases.find(item => item.caseId === selectedCaseId) ?? cases[0],
    [cases, selectedCaseId],
  );

  const pendingCount = useMemo(
    () => cases.filter(item => item.status === 'submitted').length,
    [cases],
  );

  const blockedCount = useMemo(
    () => cases.filter(item => item.status === 'blocked' || item.status === 'rejected').length,
    [cases],
  );

  const loadCases = async () => {
    setIsLoadingCases(true);
    setCaseError(undefined);

    try {
      const nextCases = await listComplianceCases(session);
      setCases(nextCases);
      setSelectedCaseId(current => {
        if (current && nextCases.some(item => item.caseId === current)) {
          return current;
        }

        return nextCases[0]?.caseId;
      });
    } catch (error) {
      setCaseError(normalizeErrorMessage(error));
    } finally {
      setIsLoadingCases(false);
    }
  };

  useEffect(() => {
    void loadCases();
  }, [session.sessionId]);

  const handleDecision = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedCase) {
      return;
    }

    setIsRecordingDecision(true);
    setCaseError(undefined);
    setCaseMessage(undefined);

    try {
      const updatedCase = await recordComplianceDecision(selectedCase.caseId, {
        outcome: decisionForm.outcome,
        rationale: decisionForm.rationale,
        reasonCodes: decisionForm.reasonCodes
          .split(',')
          .map(item => item.trim())
          .filter(Boolean),
      }, session);
      setCases(current => current.map(item => item.caseId === updatedCase.caseId ? updatedCase : item));
      setSelectedCaseId(updatedCase.caseId);
      setCaseMessage('Compliance decision recorded and eligibility updated.');
    } catch (error) {
      setCaseError(normalizeErrorMessage(error));
    } finally {
      setIsRecordingDecision(false);
    }
  };

  const renderComplianceQueue = () => (
    <div className="case-workspace">
      <section className="proof-surface-header" aria-label="Compliance queue">
        <p className="dashboard-role-label">Compliance</p>
        <h2>KYC and AML review</h2>
        <p>Inspect safe evidence metadata, record a compliance decision, and publish downstream eligibility.</p>
      </section>

      <div className="admin-member-layout">
        <section className="admin-list" aria-label="Case queue">
          {isLoadingCases ? <div className="empty-product-state">Loading compliance cases...</div> : null}
          {cases.map(item => (
            <button
              className={`admin-list-row ${selectedCase?.caseId === item.caseId ? 'admin-list-row-active' : ''}`}
              type="button"
              key={item.caseId}
              onClick={() => setSelectedCaseId(item.caseId)}
            >
              <strong>{item.organizationName}</strong>
              <span>{formatCaseStatus(item.status)}</span>
              <small>{formatEligibility(item.eligibility)}</small>
            </button>
          ))}
        </section>

        <section className="workspace-panel">
          {selectedCase ? (
            <>
              <div className="admin-section-header">
                <div>
                  <h3>{selectedCase.organizationName}</h3>
                  <p>{selectedCase.riskSummary}</p>
                </div>
                <span className={`admin-status ${statusClass(selectedCase.status)}`}>
                  {formatCaseStatus(selectedCase.status)}
                </span>
              </div>

              <dl className="admin-definition-grid">
                <div>
                  <dt>Organization</dt>
                  <dd>{selectedCase.memberOrganizationId}</dd>
                </div>
                <div>
                  <dt>Eligibility</dt>
                  <dd>{formatEligibility(selectedCase.eligibility)}</dd>
                </div>
                <div>
                  <dt>Monthly value</dt>
                  <dd>{selectedCase.expectedMonthlyTransactionValue}</dd>
                </div>
                <div>
                  <dt>Updated</dt>
                  <dd>{selectedCase.updatedAt}</dd>
                </div>
              </dl>

              <div className="workflow-meta-grid">
                {selectedCase.evidenceReferences.map(reference => (
                  <div className="workflow-meta-panel" key={`${selectedCase.caseId}-${reference.type}`}>
                    <span>{reference.type}</span>
                    <strong>{reference.label}</strong>
                    <p>{reference.checksum ?? 'Checksum pending'}</p>
                  </div>
                ))}
              </div>

              {selectedCase.decision ? (
                <div className="empty-product-state">
                  Decision recorded by {selectedCase.decision.decidedByUserId}: {selectedCase.decision.rationale}
                </div>
              ) : (
                <form className="admin-form" onSubmit={event => void handleDecision(event)}>
                  <label>
                    Decision
                    <select
                      value={decisionForm.outcome}
                      onChange={event => setDecisionForm(current => ({
                        ...current,
                        outcome: event.target.value as ComplianceDecisionOutcome,
                      }))}
                    >
                      <option value="pass">Approve</option>
                      <option value="fail">Reject</option>
                      <option value="flag">Flag</option>
                      <option value="block">Block</option>
                    </select>
                  </label>
                  <label>
                    Reason codes
                    <input
                      value={decisionForm.reasonCodes}
                      placeholder="sanctions_exposure"
                      onChange={event => setDecisionForm(current => ({
                        ...current,
                        reasonCodes: event.target.value,
                      }))}
                    />
                  </label>
                  <label className="form-field-wide">
                    Rationale
                    <input
                      value={decisionForm.rationale}
                      onChange={event => setDecisionForm(current => ({
                        ...current,
                        rationale: event.target.value,
                      }))}
                    />
                  </label>
                  <button className="button button-primary" type="submit" disabled={isRecordingDecision}>
                    {isRecordingDecision ? 'Recording decision...' : 'Record decision'}
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="empty-product-state">No compliance cases are available.</div>
          )}
          {caseError ? <p className="admin-alert admin-alert-error" role="alert">{caseError}</p> : null}
          {caseMessage ? <p className="admin-alert admin-alert-success">{caseMessage}</p> : null}
        </section>
      </div>
    </div>
  );

  if (activeTarget === 'compliance') {
    return renderComplianceQueue();
  }

  if (activeTarget === 'eligibility-status') {
    return (
      <section className="workspace-panel">
        <h2>Eligibility Status</h2>
        <p>Transaction workflows may proceed only when eligibility is approved.</p>
        <div className="workflow-meta-grid">
          {cases.map(item => (
            <div className="workflow-meta-panel" key={item.caseId}>
              <span>{item.memberOrganizationId}</span>
              <strong>{formatEligibility(item.eligibility)}</strong>
              <p>{item.eligibility === 'eligible'
                ? 'Procurement actions may proceed subject to workflow checks.'
                : 'Procurement, escrow, and financing actions must pause or be blocked.'}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Profile and notification preferences will use account settings when they are connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Compliance review</h2>
        <p>Resolve KYC and AML review cases and make eligibility visible to protected workflows.</p>
      </section>
      <section className="metric-panel">
        <span>Pending Review</span>
        <strong>{pendingCount}</strong>
        <p>Submitted cases waiting for a reviewer decision.</p>
      </section>
      <section className="metric-panel">
        <span>Blocked</span>
        <strong>{blockedCount}</strong>
        <p>Organizations that cannot proceed with transaction actions.</p>
      </section>
      <section className="metric-panel">
        <span>Evidence</span>
        <strong>Redacted</strong>
        <p>Only safe metadata and checksums are shown in this workspace.</p>
      </section>
    </div>
  );
}

export default ComplianceDashboard;
