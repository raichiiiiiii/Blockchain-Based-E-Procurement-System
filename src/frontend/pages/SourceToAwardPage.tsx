import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  approveSourceRequisition,
  awardRfq,
  createSourceRequisition,
  issueRfq,
  listSourceToAwardCases,
  submitQuotation,
} from '../api/source-to-award';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { SourceToAwardCase } from '../types/source-to-award';

type SourceToAwardPageProps = {
  session: AuthenticatedFrontendSession;
};

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function formatLabel(value?: string): string {
  if (!value) return 'Not recorded';
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, first => first.toUpperCase());
}

function SourceToAwardPage({ session }: SourceToAwardPageProps) {
  const [cases, setCases] = useState<SourceToAwardCase[]>([]);
  const [selectedCaseId, setSelectedCaseId] = useState<string | undefined>();
  const [supplierIds, setSupplierIds] = useState('demo-supplier-org');
  const [title, setTitle] = useState('Cold-chain packaging sourcing');
  const [amount, setAmount] = useState('68000.00');
  const [currency, setCurrency] = useState('MYR');
  const [quoteAmount, setQuoteAmount] = useState('68000.00');
  const [quoteNotes, setQuoteNotes] = useState('Compliant offer with delivery metadata support.');
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  const selectedCase = useMemo(
    () => cases.find(item => item.caseId === selectedCaseId) ?? cases[0],
    [cases, selectedCaseId],
  );
  const isBuyer = session.actor.actorRoleCodes.includes('buyer');
  const isSupplier = session.actor.actorRoleCodes.includes('supplier');

  const refresh = async () => {
    try {
      const items = await listSourceToAwardCases(session);
      setCases(items);
      setSelectedCaseId(current => current && items.some(item => item.caseId === current) ? current : items[0]?.caseId);
    } catch (loadError) {
      setError(normalizeErrorMessage(loadError));
    }
  };

  useEffect(() => {
    void refresh();
  }, [session.sessionId]);

  const runAction = async (action: () => Promise<void>, success: string) => {
    setIsBusy(true);
    setError(undefined);
    setMessage(undefined);
    try {
      await action();
      await refresh();
      setMessage(success);
    } catch (actionError) {
      setError(normalizeErrorMessage(actionError));
    } finally {
      setIsBusy(false);
    }
  };

  const handleCreateRequisition = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runAction(async () => {
      const result = await createSourceRequisition({
        title: title.trim(),
        estimatedAmount: amount.trim(),
        currency: currency.trim().toUpperCase(),
        description: 'Sourcing request created from the buyer workspace.',
      }, session);
      setSelectedCaseId(result.case.caseId);
    }, 'Requisition created for approval.');
  };

  return (
    <div className="order-workspace">
      <section className="proof-surface-header" aria-label="Source to award">
        <p className="dashboard-role-label">Orders</p>
        <h2>Source to award</h2>
        <p>Move a sourcing case from requisition to RFQ, quotation, award, and purchase order handoff.</p>
      </section>

      {error ? <p className="admin-alert admin-alert-error" role="alert">{error}</p> : null}
      {message ? <p className="admin-alert admin-alert-success">{message}</p> : null}

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Sourcing cases</h3>
              <p>Cases are filtered by your authenticated organization and role.</p>
            </div>
            <span className="admin-count">{cases.length} cases</span>
          </div>
          {cases.length === 0 ? (
            <div className="empty-product-state">No sourcing cases are available.</div>
          ) : null}
          <div className="order-list">
            {cases.map(item => (
              <button
                className={`order-row ${selectedCase?.caseId === item.caseId ? 'order-row-active' : ''}`}
                type="button"
                key={item.caseId}
                onClick={() => setSelectedCaseId(item.caseId)}
              >
                <span>{formatLabel(item.status)}</span>
                <strong>{item.requisition.title}</strong>
                <small>{item.requisition.estimatedAmount} {item.requisition.currency}</small>
              </button>
            ))}
          </div>
        </section>

        {isBuyer ? (
          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Create requisition</h3>
                <p>Buyer-created requisitions stay inside the controlled procurement evidence workflow.</p>
              </div>
            </div>
            <form className="admin-form" onSubmit={handleCreateRequisition}>
              <label>
                Requisition title
                <input value={title} onChange={event => setTitle(event.target.value)} />
              </label>
              <label>
                Estimated amount
                <input inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} />
              </label>
              <label>
                Currency
                <input maxLength={3} value={currency} onChange={event => setCurrency(event.target.value)} />
              </label>
              <button className="button button-primary" type="submit" disabled={isBusy}>
                Create requisition
              </button>
            </form>
          </section>
        ) : null}
      </div>

      {selectedCase ? (
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>{selectedCase.requisition.title}</h3>
              <p>{formatLabel(selectedCase.status)}</p>
            </div>
            <span className="admin-count">{selectedCase.lifecycleEventIds.length} events</span>
          </div>
          <dl className="admin-definition-grid">
            <div>
              <dt>Case reference</dt>
              <dd>{selectedCase.caseId}</dd>
            </div>
            <div>
              <dt>Requisition</dt>
              <dd>{selectedCase.requisition.requisitionId}</dd>
            </div>
            <div>
              <dt>RFQ</dt>
              <dd>{selectedCase.rfq?.rfqId ?? 'Not issued'}</dd>
            </div>
            <div>
              <dt>Order handoff</dt>
              <dd>{selectedCase.generatedOrderId ?? 'Not generated'}</dd>
            </div>
            <div>
              <dt>Latest hash</dt>
              <dd><code>{selectedCase.latestLifecyclePayloadHash ?? 'Not available'}</code></dd>
            </div>
          </dl>

          {isBuyer ? (
            <div className="workflow-meta-grid">
              <div className="workflow-meta-panel">
                <span>Approval</span>
                <strong>{selectedCase.requisition.approvedAt ? 'Approved' : 'Awaiting approval'}</strong>
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isBusy || selectedCase.status !== 'requisitionPendingApproval'}
                  onClick={() => void runAction(
                    () => approveSourceRequisition(selectedCase.requisition.requisitionId, session).then(() => undefined),
                    'Requisition approved.',
                  )}
                >
                  Approve requisition
                </button>
              </div>
              <div className="workflow-meta-panel">
                <span>RFQ</span>
                <strong>{selectedCase.rfq ? 'Issued' : 'Not issued'}</strong>
                <input value={supplierIds} onChange={event => setSupplierIds(event.target.value)} aria-label="Supplier organizations" />
                <button
                  className="button button-secondary"
                  type="button"
                  disabled={isBusy || selectedCase.status !== 'requisitionApproved'}
                  onClick={() => void runAction(
                    () => issueRfq({
                      requisitionId: selectedCase.requisition.requisitionId,
                      supplierOrganizationIds: supplierIds.split(',').map(value => value.trim()).filter(Boolean),
                    }, session).then(() => undefined),
                    'RFQ issued to supplier workspace.',
                  )}
                >
                  Issue RFQ
                </button>
              </div>
              <div className="workflow-meta-panel">
                <span>Award</span>
                <strong>{selectedCase.award ? 'Selected' : 'Awaiting quotation'}</strong>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={isBusy || selectedCase.quotations.length === 0 || Boolean(selectedCase.award)}
                  onClick={() => void runAction(
                    () => awardRfq(selectedCase.rfq?.rfqId ?? '', {
                      quotationId: selectedCase.quotations[0]?.quotationId ?? '',
                      rationale: 'Selected from compliant supplier quotation.',
                    }, session).then(() => undefined),
                    'Award selected and purchase order generated.',
                  )}
                >
                  Select award
                </button>
              </div>
            </div>
          ) : null}

          {isSupplier && selectedCase.rfq ? (
            <div className="workflow-meta-panel">
              <span>Supplier quotation</span>
              <strong>{selectedCase.quotations.some(item => item.supplierOrganizationId === session.actor.actorOrganizationId) ? 'Submitted' : 'Ready to submit'}</strong>
              <div className="admin-form">
                <label>
                  Amount
                  <input value={quoteAmount} onChange={event => setQuoteAmount(event.target.value)} />
                </label>
                <label>
                  Notes
                  <input value={quoteNotes} onChange={event => setQuoteNotes(event.target.value)} />
                </label>
                <button
                  className="button button-primary"
                  type="button"
                  disabled={isBusy || Boolean(selectedCase.award)}
                  onClick={() => void runAction(
                    () => submitQuotation(selectedCase.rfq?.rfqId ?? '', {
                      amount: quoteAmount.trim(),
                      currency: selectedCase.requisition.currency,
                      deliveryDays: 7,
                      notes: quoteNotes.trim(),
                    }, session).then(() => undefined),
                    'Quotation submitted to buyer workspace.',
                  )}
                >
                  Submit quotation
                </button>
              </div>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export default SourceToAwardPage;
