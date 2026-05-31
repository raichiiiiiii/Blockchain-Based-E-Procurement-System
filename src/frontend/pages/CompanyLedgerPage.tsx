import { useEffect, useMemo, useState } from 'react';
import {
  listCompanyDeals,
  listMudarabahWorkflowProjections,
} from '../api/organization-network';
import CompanyProofStatusBadge from '../components/organization/CompanyProofStatusBadge';
import StatusIndicator, { type StatusTone } from '../components/status/StatusIndicator';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  CompanyDealProjection,
  MudarabahWorkflowProjection,
} from '../types/organization-network';

type CompanyLedgerPageProps = {
  session: AuthenticatedFrontendSession;
};

function formatLabel(value?: string): string {
  if (!value) {
    return 'Not recorded';
  }

  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, first => first.toUpperCase());
}

function financingTone(status: CompanyDealProjection['financingStatus'] | MudarabahWorkflowProjection['status']): StatusTone {
  switch (status) {
    case 'approvedForActivation':
    case 'activeSimulation':
      return 'success';
    case 'pendingShariahReview':
      return 'pending';
    case 'blocked':
    case 'rejected':
      return 'danger';
    case 'noFinancing':
    default:
      return 'neutral';
  }
}

function CompanyLedgerPage({ session }: CompanyLedgerPageProps) {
  const [deals, setDeals] = useState<CompanyDealProjection[]>([]);
  const [mudarabah, setMudarabah] = useState<MudarabahWorkflowProjection[]>([]);
  const [selectedDealId, setSelectedDealId] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();

  const selectedDeal = useMemo(
    () => deals.find(deal => deal.dealId === selectedDealId) ?? deals[0],
    [deals, selectedDealId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      setIsLoading(true);
      setError(undefined);

      try {
        const [nextDeals, nextMudarabah] = await Promise.all([
          listCompanyDeals(session),
          listMudarabahWorkflowProjections(session),
        ]);
        if (!cancelled) {
          setDeals(nextDeals);
          setMudarabah(nextMudarabah);
          setSelectedDealId(current => current && nextDeals.some(deal => deal.dealId === current)
            ? current
            : nextDeals[0]?.dealId);
        }
      } catch (loadError) {
        if (!cancelled) {
          setDeals([]);
          setMudarabah([]);
          setError(loadError instanceof Error ? loadError.message : 'Company ledger is unavailable');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadLedger();

    return () => {
      cancelled = true;
    };
  }, [session.sessionId]);

  if (isLoading) {
    return (
      <section className="workspace-panel">
        <h2>Company Ledger</h2>
        <p>Loading company deal view, proof state, and Mudarabah projection.</p>
      </section>
    );
  }

  return (
    <div className="company-ledger-page">
      <section className="proof-surface-header" aria-label="Company Ledger">
        <p className="dashboard-role-label">Company Ledger</p>
        <h2>Private deal view</h2>
        <p>Review company-scoped deals across order, delivery, escrow, proof, and restricted Mudarabah seedbed state.</p>
      </section>

      {error ? <div className="admin-alert admin-alert-error" role="alert">{error}</div> : null}

      <div className="admin-member-layout">
        <section className="admin-list" aria-label="Company deals">
          {deals.length === 0 ? (
            <div className="empty-product-state">No company deals are available for this organization.</div>
          ) : deals.map(deal => (
            <button
              className={`admin-list-row ${selectedDeal?.dealId === deal.dealId ? 'admin-list-row-active' : ''}`}
              key={deal.dealId}
              type="button"
              onClick={() => setSelectedDealId(deal.dealId)}
            >
              <strong>{deal.title}</strong>
              <span>{deal.counterpartDisplayName}</span>
              <small>{formatLabel(deal.relationship)}</small>
            </button>
          ))}
        </section>

        <section className="workspace-panel">
          {selectedDeal ? (
            <>
              <div className="admin-section-header">
                <div>
                  <h3>{selectedDeal.title}</h3>
                  <p>{selectedDeal.safeSummary}</p>
                </div>
                <CompanyProofStatusBadge status={selectedDeal.proofStatus} />
              </div>
              <dl className="admin-definition-grid">
                <div>
                  <dt>Counterpart</dt>
                  <dd>{selectedDeal.counterpartDisplayName}</dd>
                </div>
                <div>
                  <dt>Relationship</dt>
                  <dd>{formatLabel(selectedDeal.relationship)}</dd>
                </div>
                <div>
                  <dt>Order</dt>
                  <dd>{selectedDeal.orderId ?? 'No order'} - {formatLabel(selectedDeal.orderStatus)}</dd>
                </div>
                <div>
                  <dt>Delivery evidence</dt>
                  <dd>{formatLabel(selectedDeal.deliveryEvidenceStatus)}</dd>
                </div>
                <div>
                  <dt>Escrow</dt>
                  <dd>{selectedDeal.escrowId ?? 'No escrow'} - {formatLabel(selectedDeal.escrowStatus)}</dd>
                </div>
                <div>
                  <dt>Latest event</dt>
                  <dd>{formatLabel(selectedDeal.latestLifecycleEvent)}</dd>
                </div>
                <div>
                  <dt>Proof event</dt>
                  <dd>{selectedDeal.proofEventId ?? 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Proof hash</dt>
                  <dd><code>{selectedDeal.proofPayloadHash ?? 'Not recorded'}</code></dd>
                </div>
              </dl>
              <div className="workflow-meta-panel">
                <span>Mudarabah seedbed</span>
                <strong>{formatLabel(selectedDeal.financingStatus)}</strong>
                <p>This deal view is a company-scoped projection. It is not a production private ledger, payment rail, or formal finance certification.</p>
              </div>
            </>
          ) : (
            <div className="empty-product-state">Select a company deal to inspect its projection.</div>
          )}
        </section>
      </div>

      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h2>Mudarabah projection</h2>
            <p>Restricted PLS seedbed state tied to company/deal context, with conservative claim boundaries.</p>
          </div>
          <span className="admin-count">{mudarabah.length} projection{mudarabah.length === 1 ? '' : 's'}</span>
        </div>
        <div className="workflow-meta-grid">
          {mudarabah.map(projection => (
            <article className="workflow-meta-panel" key={projection.projectionId}>
              <span>{projection.contractId ?? projection.projectionId}</span>
              <strong>{formatLabel(projection.status)}</strong>
              <StatusIndicator label={formatLabel(projection.status)} tone={financingTone(projection.status)} compact />
              <p>{projection.simulationOnlyNotice}</p>
              {projection.capitalAmount ? (
                <p>{projection.currency} {projection.capitalAmount} - {projection.financierSharePercent ?? 0}% financier / {projection.ventureOperatorSharePercent ?? 0}% operator</p>
              ) : null}
              {projection.shariahReference ? <p>Shariah reference: {projection.shariahReference}</p> : null}
              {projection.certificateReference ? <p>Certificate artifact: {projection.certificateReference}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default CompanyLedgerPage;
