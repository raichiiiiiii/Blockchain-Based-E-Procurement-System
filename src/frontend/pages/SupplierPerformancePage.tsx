import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  closeProcurementCase,
  getProcurementCaseSummary,
  getSupplierPerformance,
} from '../api/procurement-closeout';
import { listProcurementOrders } from '../api/procurement-orders';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { ProcurementCaseSummary, SupplierPerformanceSummary } from '../types/procurement-closeout';
import type { ProcurementOrderResponse } from '../types/procurement-order';

type SupplierPerformancePageProps = {
  session: AuthenticatedFrontendSession;
};

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function SupplierPerformancePage({ session }: SupplierPerformancePageProps) {
  const [orders, setOrders] = useState<ProcurementOrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [summary, setSummary] = useState<ProcurementCaseSummary | undefined>();
  const [performance, setPerformance] = useState<SupplierPerformanceSummary | undefined>();
  const [notes, setNotes] = useState('Closed after evidence and invoice readiness review.');
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  const selectedOrder = useMemo(
    () => orders.find(order => order.orderId === selectedOrderId) ?? orders.find(order => order.status === 'accepted') ?? orders[0],
    [orders, selectedOrderId],
  );

  const refresh = async () => {
    const nextOrders = await listProcurementOrders(session);
    setOrders(nextOrders);
    setSelectedOrderId(current => current && nextOrders.some(order => order.orderId === current)
      ? current
      : nextOrders.find(order => order.status === 'accepted')?.orderId ?? nextOrders[0]?.orderId);
  };

  useEffect(() => {
    void refresh().catch(loadError => setError(normalizeErrorMessage(loadError)));
  }, [session.sessionId]);

  useEffect(() => {
    if (!selectedOrder) return;

    void getProcurementCaseSummary(selectedOrder.orderId, session)
      .then(setSummary)
      .catch(loadError => setError(normalizeErrorMessage(loadError)));
    void getSupplierPerformance(selectedOrder.supplierOrganizationId, session)
      .then(setPerformance)
      .catch(() => setPerformance(undefined));
  }, [selectedOrder?.orderId, session.sessionId]);

  const handleCloseout = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrder) return;

    setIsBusy(true);
    setError(undefined);
    setMessage(undefined);
    closeProcurementCase(selectedOrder.orderId, notes.trim() || undefined, session)
      .then(async closeout => {
        setMessage(`Procurement case closed with supplier score ${closeout.metrics.score}.`);
        setSummary(await getProcurementCaseSummary(selectedOrder.orderId, session));
        setPerformance(await getSupplierPerformance(selectedOrder.supplierOrganizationId, session));
      })
      .catch(closeoutError => setError(normalizeErrorMessage(closeoutError)))
      .finally(() => setIsBusy(false));
  };

  return (
    <div className="order-workspace">
      <section className="proof-surface-header" aria-label="Supplier performance">
        <p className="dashboard-role-label">Orders</p>
        <h2>Supplier performance and closeout</h2>
        <p>Summarize delivery evidence, invoice exceptions, proof coverage, and case closeout state from backend records.</p>
      </section>

      {error ? <p className="admin-alert admin-alert-error" role="alert">{error}</p> : null}
      {message ? <p className="admin-alert admin-alert-success">{message}</p> : null}

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Procurement cases</h3>
              <p>Select an accepted order to inspect closeout readiness.</p>
            </div>
            <span className="admin-count">{orders.length} orders</span>
          </div>
          <div className="order-list">
            {orders.map(order => (
              <button
                className={`order-row ${selectedOrder?.orderId === order.orderId ? 'order-row-active' : ''}`}
                type="button"
                key={order.orderId}
                onClick={() => setSelectedOrderId(order.orderId)}
              >
                <span>{order.status}</span>
                <strong>{order.title}</strong>
                <small>{order.supplierOrganizationId}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Case summary</h3>
              <p>Closeout does not execute payment or settlement. It records evidence readiness.</p>
            </div>
          </div>
          {summary ? (
            <dl className="admin-definition-grid">
              <div>
                <dt>Delivery evidence</dt>
                <dd>{summary.deliveryEvidenceCount}</dd>
              </div>
              <div>
                <dt>Invoices</dt>
                <dd>{summary.invoiceCount}</dd>
              </div>
              <div>
                <dt>Invoice exceptions</dt>
                <dd>{summary.invoiceExceptionCount}</dd>
              </div>
              <div>
                <dt>Proof coverage</dt>
                <dd>{summary.proofCoveragePercent}%</dd>
              </div>
            </dl>
          ) : (
            <div className="empty-product-state">Select a case to inspect evidence readiness.</div>
          )}
          {session.actor.actorRoleCodes.some(role => ['buyer', 'auditor'].includes(role)) ? (
            <form className="admin-form" onSubmit={handleCloseout}>
              <label className="form-field-wide">
                Closeout notes
                <input value={notes} onChange={event => setNotes(event.target.value)} />
              </label>
              <button className="button button-primary" type="submit" disabled={isBusy || !selectedOrder || selectedOrder.status !== 'accepted'}>
                Close procurement case
              </button>
            </form>
          ) : null}
        </section>
      </div>

      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h3>Supplier scorecard</h3>
            <p>Scores are internal-pilot indicators built from order, evidence, invoice, and closeout records.</p>
          </div>
        </div>
        {performance ? (
          <div className="workflow-meta-grid">
            <div className="metric-panel">
              <span>Score</span>
              <strong>{performance.score}</strong>
              <p>{performance.supplierOrganizationId}</p>
            </div>
            <div className="metric-panel">
              <span>Orders</span>
              <strong>{performance.orderCount}</strong>
              <p>{performance.deliveryEvidenceCount} delivery evidence records.</p>
            </div>
            <div className="metric-panel">
              <span>Exceptions</span>
              <strong>{performance.invoiceExceptionCount}</strong>
              <p>{performance.invoiceCount} invoices reviewed.</p>
            </div>
            <div className="metric-panel">
              <span>Proof coverage</span>
              <strong>{performance.proofCoveragePercent}%</strong>
              <p>{performance.closeoutCount} closeout records.</p>
            </div>
          </div>
        ) : (
          <div className="empty-product-state">Supplier performance appears after accepted orders are available.</div>
        )}
      </section>
    </div>
  );
}

export default SupplierPerformancePage;
