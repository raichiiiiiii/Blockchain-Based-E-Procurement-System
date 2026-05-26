import { useEffect, useMemo, useState } from 'react';
import {
  listPlsContracts,
  recordShariahDecisionForContract,
  type PlsContract,
  type ShariahDecisionOutcome,
} from '../api/pls-financing';
import {
  listShariahCertificates,
  registerShariahCertificate,
  type ShariahCertificate,
} from '../api/shariah-certificates';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

type ShariahDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type LoadState = 'loading' | 'ready' | 'error';

function formatStatus(status: PlsContract['status']): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'approvedForActivation':
      return 'Approved for activation';
    case 'activationBlocked':
      return 'Activation blocked';
    case 'pendingShariahReview':
      return 'Pending review';
    case 'draft':
      return 'Draft';
  }
}

function formatApproval(status?: string): string {
  switch (status) {
    case 'approved':
      return 'Approved';
    case 'conditionalApproved':
      return 'Conditional approval';
    case 'rejected':
      return 'Rejected';
    default:
      return 'No final decision';
  }
}

function statusClass(status: PlsContract['status']): string {
  if (status === 'active' || status === 'approvedForActivation') {
    return 'admin-status-active';
  }

  if (status === 'activationBlocked') {
    return 'admin-status-danger';
  }

  return 'admin-status-pending';
}

function ShariahDashboard({ activeTarget, session }: ShariahDashboardProps) {
  const [contracts, setContracts] = useState<PlsContract[]>([]);
  const [certificates, setCertificates] = useState<ShariahCertificate[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [decisionBusy, setDecisionBusy] = useState<ShariahDecisionOutcome | undefined>();

  const selectedContract = useMemo(
    () => contracts.find(contract => contract.contractId === selectedContractId) ?? contracts[0],
    [contracts, selectedContractId],
  );

  const pendingCount = contracts.filter(contract => contract.status === 'pendingShariahReview').length;
  const approvedCount = contracts.filter(contract => contract.shariahApproval?.status === 'approved').length;
  const blockedCount = contracts.filter(contract => contract.status === 'activationBlocked').length;
  const selectedCertificate = useMemo(
    () => selectedContract
      ? certificates.find(certificate =>
        certificate.status === 'active'
        && certificate.contractTemplateVersion === selectedContract.contractTemplateVersion)
      : undefined,
    [certificates, selectedContract],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadContracts() {
      setLoadState('loading');
      setError(undefined);

      try {
        const nextContracts = await listPlsContracts(session);
        const nextCertificates = await listShariahCertificates(session).catch(() => []);
        if (cancelled) {
          return;
        }

        setContracts(nextContracts);
        setCertificates(nextCertificates);
        setSelectedContractId(current => current && nextContracts.some(contract => contract.contractId === current)
          ? current
          : nextContracts[0]?.contractId);
        setLoadState('ready');
      } catch (loadError) {
        if (cancelled) {
          return;
        }

        setError(loadError instanceof Error ? loadError.message : 'Shariah review workspace is unavailable');
        setLoadState('error');
      }
    }

    void loadContracts();

    return () => {
      cancelled = true;
    };
  }, [session]);

  const handleDecision = async (outcome: ShariahDecisionOutcome) => {
    if (!selectedContract) {
      return;
    }

    setDecisionBusy(outcome);
    setMessage(undefined);
    setError(undefined);

    try {
      const updated = await recordShariahDecisionForContract(selectedContract.contractId, outcome, session);
      setContracts(current => current.map(contract => contract.contractId === updated.contractId ? updated : contract));
      setSelectedContractId(updated.contractId);
      setMessage(outcome === 'approved'
        ? 'Shariah decision recorded. The financing team can now activate this contract.'
        : 'Shariah decision recorded. Activation remains blocked until approval is complete.');
    } catch (decisionError) {
      setError(decisionError instanceof Error ? decisionError.message : 'Decision could not be recorded');
    } finally {
      setDecisionBusy(undefined);
    }
  };

  const handleCertificateRegistration = async () => {
    if (!selectedContract) {
      return;
    }

    setDecisionBusy('approved');
    setMessage(undefined);
    setError(undefined);

    try {
      const certificate = await registerShariahCertificate({
        issuedBy: 'MVP Shariah Governance Board',
        reviewerBoard: 'Restricted PLS Seedbed Review Panel',
        fatwaReference: `FATWA-${selectedContract.contractTemplateVersion.toUpperCase()}`,
        scope: 'restricted-pls-seedbed',
        contractTemplateVersion: selectedContract.contractTemplateVersion,
        conditions: [
          'Simulation-only PLS distribution records',
          'No guaranteed profit or principal',
          'No external payment execution',
        ],
        certificateDocumentId: `certificate-${selectedContract.contractTemplateVersion}`,
      }, session);
      setCertificates(current => [certificate, ...current.filter(item => item.certificateId !== certificate.certificateId)]);
      setMessage('Shariah certificate artifact registered for this template. This records governance evidence only.');
    } catch (certificateError) {
      setError(certificateError instanceof Error ? certificateError.message : 'Certificate artifact could not be registered');
    } finally {
      setDecisionBusy(undefined);
    }
  };

  if (loadState === 'loading') {
    return (
      <section className="workspace-panel">
        <h2>Shariah Review</h2>
        <p>Loading financing review records.</p>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="workspace-panel">
        <h2>Shariah Review</h2>
        <p>The review workspace could not be loaded.</p>
        {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      </section>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Review preferences and notification routing will use account settings when connected.</p>
      </section>
    );
  }

  if (activeTarget === 'shariah-review') {
    return (
      <div className="case-workspace">
        <section className="proof-surface-header" aria-label="Shariah review queue">
          <p className="dashboard-role-label">Shariah Review</p>
          <h2>PLS review queue</h2>
          <p>Review restricted profit-and-loss sharing contracts, complete the checklist, and record the governance decision before activation.</p>
        </section>

        <div className="admin-member-layout">
          <section className="admin-list" aria-label="PLS review queue">
            {contracts.map(contract => (
              <button
                className={`admin-list-row ${selectedContract?.contractId === contract.contractId ? 'admin-list-row-active' : ''}`}
                key={contract.contractId}
                type="button"
                onClick={() => setSelectedContractId(contract.contractId)}
              >
                <strong>{contract.procurementReference}</strong>
                <span>{formatStatus(contract.status)}</span>
                <small>{formatApproval(contract.shariahApproval?.status)}</small>
              </button>
            ))}
          </section>

          <section className="workspace-panel">
            {selectedContract ? (
              <>
                <div className="admin-section-header">
                  <div>
                    <h3>{selectedContract.procurementReference}</h3>
                    <p>Restricted mudarabah seedbed contract for a single procurement reference.</p>
                  </div>
                  <span className={`admin-status ${statusClass(selectedContract.status)}`}>
                    {formatStatus(selectedContract.status)}
                  </span>
                </div>

                <dl className="admin-definition-grid">
                  <div>
                    <dt>Capital</dt>
                    <dd>{selectedContract.currency} {selectedContract.capitalAmount}</dd>
                  </div>
                  <div>
                    <dt>Profit Share</dt>
                    <dd>{selectedContract.profitShare.financierPercent}% financier / {selectedContract.profitShare.ventureOperatorPercent}% operator</dd>
                  </div>
                  <div>
                    <dt>Loss Rule</dt>
                    <dd>Capital provider bears financial loss unless misconduct is established.</dd>
                  </div>
                  <div>
                    <dt>Review Reference</dt>
                    <dd>{selectedContract.shariahApproval?.reviewId ?? 'No final decision'}</dd>
                  </div>
                  <div>
                    <dt>Template</dt>
                    <dd>{selectedContract.contractTemplateVersion}</dd>
                  </div>
                  <div>
                    <dt>Certificate</dt>
                    <dd>{selectedCertificate?.certificateId ?? 'Certificate artifact required'}</dd>
                  </div>
                </dl>

                <div className="workflow-meta-grid">
                  <div className="workflow-meta-panel">
                    <span>Checklist</span>
                    <strong>Profit ratio agreed in advance</strong>
                    <p>Ratios are fixed before activation and do not imply guaranteed return.</p>
                  </div>
                  <div className="workflow-meta-panel">
                    <span>Checklist</span>
                    <strong>Loss allocation documented</strong>
                    <p>Financial loss sits with the capital provider unless negligence or breach is established.</p>
                  </div>
                  <div className="workflow-meta-panel">
                    <span>Checklist</span>
                    <strong>Payment execution excluded</strong>
                    <p>The financing record is a governed seedbed calculation, not an external payment instruction.</p>
                  </div>
                  <div className="workflow-meta-panel">
                    <span>Certificate artifact</span>
                    <strong>{selectedCertificate ? selectedCertificate.status : 'Not registered'}</strong>
                    <p>{selectedCertificate
                      ? `${selectedCertificate.fatwaReference} covers ${selectedCertificate.contractTemplateVersion}.`
                      : 'Activation must remain blocked until an active certificate artifact covers the template.'}</p>
                  </div>
                </div>

                <div className="admin-action-row" aria-label="Shariah decision actions">
                  <button
                    className="button button-primary"
                    disabled={Boolean(decisionBusy)}
                    type="button"
                    onClick={() => void handleDecision('approved')}
                  >
                    {decisionBusy === 'approved' ? 'Recording' : 'Approve'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={Boolean(decisionBusy)}
                    type="button"
                    onClick={() => void handleDecision('conditionalApproved')}
                  >
                    {decisionBusy === 'conditionalApproved' ? 'Recording' : 'Conditional approval'}
                  </button>
                  <button
                    className="button button-ghost"
                    disabled={Boolean(decisionBusy)}
                    type="button"
                    onClick={() => void handleDecision('rejected')}
                  >
                    {decisionBusy === 'rejected' ? 'Recording' : 'Reject'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={Boolean(decisionBusy) || Boolean(selectedCertificate)}
                    type="button"
                    onClick={() => void handleCertificateRegistration()}
                  >
                    {decisionBusy === 'approved' && !selectedCertificate ? 'Registering' : selectedCertificate ? 'Certificate registered' : 'Register certificate'}
                  </button>
                </div>
              </>
            ) : (
              <div className="empty-product-state">No PLS review records are available.</div>
            )}
            {message ? <div className="admin-alert admin-alert-success" role="status">{message}</div> : null}
            {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Shariah governance</h2>
        <p>Review PLS seedbed contracts, record decisions, and keep activation dependent on an approved governance reference.</p>
      </section>
      <section className="metric-panel">
        <span>Pending Review</span>
        <strong>{pendingCount}</strong>
        <p>Contracts waiting for Shariah decision before financing activation.</p>
      </section>
      <section className="metric-panel">
        <span>Approved</span>
        <strong>{approvedCount}</strong>
        <p>Contracts with approval references available to the financing team.</p>
      </section>
      <section className="metric-panel">
        <span>Blocked</span>
        <strong>{blockedCount}</strong>
        <p>Contracts that must not activate until governance conditions are resolved.</p>
      </section>
    </div>
  );
}

export default ShariahDashboard;
