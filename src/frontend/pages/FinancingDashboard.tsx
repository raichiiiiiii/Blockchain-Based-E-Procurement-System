import { useEffect, useMemo, useState } from 'react';
import {
  activatePlsContract,
  listPlsContracts,
  listPlsDistributions,
  recordPlsDistributionScenario,
  type PlsContract,
  type PlsDistributionEventType,
  type PlsDistributionRecord,
} from '../api/pls-financing';
import PlsScenarioSimulator from '../components/financing/PlsScenarioSimulator';
import { listShariahCertificates, type ShariahCertificate } from '../api/shariah-certificates';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

type FinancingDashboardProps = {
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
      return 'Pending Shariah review';
    case 'draft':
      return 'Draft';
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

function formatParty(role: PlsDistributionRecord['allocations'][number]['partyRole']): string {
  return role === 'financier' ? 'Financier' : 'SME operator';
}

function FinancingDashboard({ activeTarget, session }: FinancingDashboardProps) {
  const [contracts, setContracts] = useState<PlsContract[]>([]);
  const [distributions, setDistributions] = useState<PlsDistributionRecord[]>([]);
  const [certificates, setCertificates] = useState<ShariahCertificate[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | undefined>();
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [busyAction, setBusyAction] = useState<string | undefined>();

  const selectedContract = useMemo(
    () => contracts.find(contract => contract.contractId === selectedContractId) ?? contracts[0],
    [contracts, selectedContractId],
  );

  const activeCount = contracts.filter(contract => contract.status === 'active').length;
  const approvedCount = contracts.filter(contract => contract.status === 'approvedForActivation').length;
  const blockedCount = contracts.filter(contract => contract.status === 'activationBlocked' || contract.status === 'pendingShariahReview').length;
  const matchingCertificate = useMemo(
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

        setError(loadError instanceof Error ? loadError.message : 'Financing workspace is unavailable');
        setLoadState('error');
      }
    }

    void loadContracts();

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    let cancelled = false;

    async function loadDistributions() {
      if (!selectedContract) {
        setDistributions([]);
        return;
      }

      try {
        const nextDistributions = await listPlsDistributions(selectedContract.contractId, session);
        if (!cancelled) {
          setDistributions(nextDistributions);
        }
      } catch {
        if (!cancelled) {
          setDistributions([]);
        }
      }
    }

    void loadDistributions();

    return () => {
      cancelled = true;
    };
  }, [selectedContract?.contractId, session]);

  const handleActivation = async () => {
    if (!selectedContract) {
      return;
    }

    setBusyAction('activate');
    setMessage(undefined);
    setError(undefined);

    try {
      const updated = await activatePlsContract(
        selectedContract.contractId,
        session,
        selectedContract.shariahApproval?.reviewId,
        selectedContract.shariahCertificate?.certificateId ?? matchingCertificate?.certificateId,
      );
      setContracts(current => current.map(contract => contract.contractId === updated.contractId ? updated : contract));
      setSelectedContractId(updated.contractId);
      setMessage('PLS contract activated from the approved Shariah reference.');
    } catch (activationError) {
      setError(activationError instanceof Error ? activationError.message : 'Activation could not be completed');
    } finally {
      setBusyAction(undefined);
    }
  };

  const handleDistribution = async (eventType: PlsDistributionEventType) => {
    if (!selectedContract) {
      return;
    }

    setBusyAction(eventType);
    setMessage(undefined);
    setError(undefined);

    try {
      const distribution = await recordPlsDistributionScenario(
        selectedContract.contractId,
        eventType,
        eventType === 'profit' ? '10000.00' : '5000.00',
        eventType === 'profit'
          ? 'Accepted order margin scenario after allowed operating costs.'
          : 'Loss scenario under restricted PLS seedbed rules.',
        session,
      );
      setDistributions(current => [distribution, ...current]);
      setMessage(eventType === 'profit'
        ? 'Profit scenario recorded for review.'
        : 'Loss scenario recorded without guaranteeing principal or profit.');
    } catch (distributionError) {
      setError(distributionError instanceof Error ? distributionError.message : 'Distribution scenario could not be recorded');
    } finally {
      setBusyAction(undefined);
    }
  };

  if (loadState === 'loading') {
    return (
      <section className="workspace-panel">
        <h2>Financing</h2>
        <p>Loading PLS contracts and distribution records.</p>
      </section>
    );
  }

  if (loadState === 'error') {
    return (
      <section className="workspace-panel">
        <h2>Financing</h2>
        <p>The financing workspace could not be loaded.</p>
        {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}
      </section>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Financing workspace preferences will use account settings when connected.</p>
      </section>
    );
  }

  if (activeTarget === 'shariah-review') {
    return (
      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Shariah Approval References</h2>
            <p>Activation stays blocked unless a contract carries an approved review reference.</p>
          </div>
          <span className="admin-count">{contracts.length} contracts</span>
        </div>
        <div className="workflow-meta-grid">
          {contracts.map(contract => (
            <div className="workflow-meta-panel" key={contract.contractId}>
              <span>{contract.procurementReference}</span>
              <strong>{contract.shariahApproval?.status ?? 'No decision'}</strong>
              <p>{contract.shariahApproval?.reviewId ?? 'A Shariah approval reference is required before activation.'}</p>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (activeTarget === 'financing') {
    return (
      <div className="order-workspace">
        <section className="proof-surface-header" aria-label="Financing workspace">
          <p className="dashboard-role-label">Financing</p>
          <h2>PLS contracts</h2>
          <p>Inspect procurement-linked restricted PLS contracts, activate only after Shariah approval, and record scenario-based distributions.</p>
        </section>

        <div className="admin-member-layout">
          <section className="admin-list" aria-label="PLS contracts">
            {contracts.map(contract => (
              <button
                className={`admin-list-row ${selectedContract?.contractId === contract.contractId ? 'admin-list-row-active' : ''}`}
                key={contract.contractId}
                type="button"
                onClick={() => setSelectedContractId(contract.contractId)}
              >
                <strong>{contract.procurementReference}</strong>
                <span>{formatStatus(contract.status)}</span>
                <small>{contract.currency} {contract.capitalAmount}</small>
              </button>
            ))}
          </section>

          <section className="workspace-panel">
            {selectedContract ? (
              <>
                <div className="admin-section-header">
                  <div>
                    <h3>{selectedContract.procurementReference}</h3>
                    <p>Single procurement reference, one financier, one SME operator, and pre-agreed profit ratio.</p>
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
                    <dt>Approval</dt>
                    <dd>{selectedContract.shariahApproval?.status ?? 'Missing'}</dd>
                  </div>
                  <div>
                    <dt>Reference</dt>
                    <dd>{selectedContract.shariahApproval?.reviewId ?? 'Approval required'}</dd>
                  </div>
                  <div>
                    <dt>Certificate</dt>
                    <dd>{selectedContract.shariahCertificate?.certificateId ?? matchingCertificate?.certificateId ?? 'Certificate required'}</dd>
                  </div>
                  <div>
                    <dt>Template</dt>
                    <dd>{selectedContract.contractTemplateVersion}</dd>
                  </div>
                </dl>

                <PlsScenarioSimulator contract={selectedContract} />

                <div className="admin-action-row" aria-label="Financing actions">
                  <button
                    className="button button-primary"
                    disabled={busyAction === 'activate' || selectedContract.status === 'active' || !matchingCertificate}
                    type="button"
                    onClick={() => void handleActivation()}
                  >
                    {busyAction === 'activate' ? 'Activating' : selectedContract.status === 'active' ? 'Activated' : 'Activate contract'}
                  </button>
                  <button
                    className="button button-secondary"
                    disabled={busyAction === 'profit' || selectedContract.status !== 'active'}
                    type="button"
                    onClick={() => void handleDistribution('profit')}
                  >
                    {busyAction === 'profit' ? 'Recording' : 'Record profit scenario'}
                  </button>
                  <button
                    className="button button-ghost"
                    disabled={busyAction === 'loss' || selectedContract.status !== 'active'}
                    type="button"
                    onClick={() => void handleDistribution('loss')}
                  >
                    {busyAction === 'loss' ? 'Recording' : 'Record loss scenario'}
                  </button>
                </div>

                {selectedContract.shariahApproval?.status !== 'approved' ? (
                  <div className="admin-alert admin-alert-error" role="alert">
                    Activation is blocked until Shariah approval is complete.
                  </div>
                ) : null}
                {!matchingCertificate && selectedContract.status !== 'active' ? (
                  <div className="admin-alert admin-alert-error" role="alert">
                    Activation is blocked until an active Shariah certificate covers this template.
                  </div>
                ) : null}

                <div className="workflow-meta-grid">
                  {distributions.length === 0 ? (
                    <div className="empty-product-state">No distribution records are available for this contract.</div>
                  ) : distributions.map(distribution => (
                    <div className="workflow-meta-panel" key={distribution.distributionId}>
                      <span>{distribution.eventType === 'profit' ? 'Profit scenario' : 'Loss scenario'}</span>
                      <strong>{distribution.currency} {distribution.grossResultAmount}</strong>
                      <p>{distribution.calculationBasis}</p>
                      {distribution.allocations.map(allocation => (
                        <p key={`${distribution.distributionId}-${allocation.partyRole}`}>
                          {formatParty(allocation.partyRole)}: {distribution.currency} {allocation.amount} - {allocation.basis}
                        </p>
                      ))}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="empty-product-state">No PLS contracts are available.</div>
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
        <h2>Financing workspace</h2>
        <p>Manage Shariah-approved PLS contracts and scenario-based distribution records without external payment execution.</p>
      </section>
      <section className="metric-panel">
        <span>Active</span>
        <strong>{activeCount}</strong>
        <p>Contracts that passed the approval gate and can carry distribution records.</p>
      </section>
      <section className="metric-panel">
        <span>Ready</span>
        <strong>{approvedCount}</strong>
        <p>Approved contracts waiting for financier activation.</p>
      </section>
      <section className="metric-panel">
        <span>Blocked</span>
        <strong>{blockedCount}</strong>
        <p>Contracts waiting for review or blocked by unresolved governance decisions.</p>
      </section>
    </div>
  );
}

export default FinancingDashboard;
