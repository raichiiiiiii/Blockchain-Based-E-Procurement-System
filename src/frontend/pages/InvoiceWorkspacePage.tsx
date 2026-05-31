import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  approveInvoicePayment,
  listInvoices,
  submitInvoice,
  verifyInvoiceMatch,
} from '../api/invoices';
import { listDeliveryEvidenceForOrder } from '../api/delivery-evidence';
import { listProcurementOrders } from '../api/procurement-orders';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { DeliveryEvidenceRecord } from '../types/delivery-evidence';
import type { ProcurementInvoice } from '../types/invoice';
import type { ProcurementOrderResponse } from '../types/procurement-order';

type InvoiceWorkspacePageProps = {
  session: AuthenticatedFrontendSession;
};

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function formatLabel(value?: string): string {
  if (!value) return 'Not recorded';
  return value.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, first => first.toUpperCase());
}

function InvoiceWorkspacePage({ session }: InvoiceWorkspacePageProps) {
  const [orders, setOrders] = useState<ProcurementOrderResponse[]>([]);
  const [invoices, setInvoices] = useState<ProcurementInvoice[]>([]);
  const [evidenceByOrder, setEvidenceByOrder] = useState<Record<string, DeliveryEvidenceRecord[]>>({});
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [invoiceReference, setInvoiceReference] = useState('invoice:barakah:001');
  const [message, setMessage] = useState<string | undefined>();
  const [error, setError] = useState<string | undefined>();
  const [isBusy, setIsBusy] = useState(false);

  const isSupplier = session.actor.actorRoleCodes.includes('supplier');
  const canVerify = session.actor.actorRoleCodes.some(role => ['buyer', 'financier'].includes(role));
  const selectedOrder = useMemo(
    () => orders.find(order => order.orderId === selectedOrderId) ?? orders.find(order => order.status === 'accepted') ?? orders[0],
    [orders, selectedOrderId],
  );
  const selectedEvidence = selectedOrder ? evidenceByOrder[selectedOrder.orderId] ?? [] : [];

  const refresh = async () => {
    const nextOrders = await listProcurementOrders(session);
    const accepted = nextOrders.filter(order => order.status === 'accepted');
    const entries = await Promise.all(accepted.map(async order => {
      const evidence = await listDeliveryEvidenceForOrder(order.orderId, session);
      return [order.orderId, evidence] as const;
    }));
    setOrders(nextOrders);
    setInvoices(await listInvoices(session));
    setEvidenceByOrder(Object.fromEntries(entries));
    setSelectedOrderId(current => current && nextOrders.some(order => order.orderId === current)
      ? current
      : accepted[0]?.orderId ?? nextOrders[0]?.orderId);
  };

  useEffect(() => {
    void refresh().catch(loadError => setError(normalizeErrorMessage(loadError)));
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

  const handleSubmitInvoice = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedOrder) return;

    void runAction(async () => {
      await submitInvoice({
        orderId: selectedOrder.orderId,
        deliveryEvidenceId: selectedEvidence[0]?.evidenceId,
        amount: selectedOrder.amount,
        currency: selectedOrder.currency,
        invoiceReference: invoiceReference.trim(),
      }, session);
    }, 'Invoice submitted for three-way matching.');
  };

  return (
    <div className="order-workspace">
      <section className="proof-surface-header" aria-label="Invoices">
        <p className="dashboard-role-label">Orders</p>
        <h2>Invoice matching</h2>
        <p>Match supplier invoices against accepted orders and delivery evidence before sandbox payment readiness.</p>
      </section>

      {error ? <p className="admin-alert admin-alert-error" role="alert">{error}</p> : null}
      {message ? <p className="admin-alert admin-alert-success">{message}</p> : null}

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Accepted orders</h3>
              <p>Invoices can be submitted and matched only against accepted orders.</p>
            </div>
            <span className="admin-count">{orders.filter(order => order.status === 'accepted').length} ready</span>
          </div>
          <div className="order-list">
            {orders.filter(order => order.status === 'accepted').map(order => (
              <button
                className={`order-row ${selectedOrder?.orderId === order.orderId ? 'order-row-active' : ''}`}
                type="button"
                key={order.orderId}
                onClick={() => setSelectedOrderId(order.orderId)}
              >
                <span>Accepted</span>
                <strong>{order.title}</strong>
                <small>{order.amount} {order.currency}</small>
              </button>
            ))}
          </div>
        </section>

        {isSupplier ? (
          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Submit invoice</h3>
                <p>Only invoice metadata and a hash/reference are recorded. No raw invoice document is placed on-chain.</p>
              </div>
            </div>
            {selectedOrder ? (
              <form className="admin-form" onSubmit={handleSubmitInvoice}>
                <label>
                  Invoice reference
                  <input value={invoiceReference} onChange={event => setInvoiceReference(event.target.value)} />
                </label>
                <div className="workflow-meta-panel">
                  <span>Match basis</span>
                  <strong>{selectedEvidence[0]?.evidenceId ?? 'Delivery evidence missing'}</strong>
                  <p>{selectedOrder.amount} {selectedOrder.currency}</p>
                </div>
                <button className="button button-primary" type="submit" disabled={isBusy || selectedEvidence.length === 0}>
                  Submit invoice
                </button>
              </form>
            ) : (
              <div className="empty-product-state">No accepted order is available for invoice submission.</div>
            )}
          </section>
        ) : null}
      </div>

      <section className="workspace-panel">
        <div className="admin-section-header">
          <div>
            <h3>Invoice queue</h3>
            <p>Mismatch, not checked, and approved states are visibly distinct.</p>
          </div>
          <span className="admin-count">{invoices.length} invoices</span>
        </div>
        {invoices.length === 0 ? <div className="empty-product-state">No invoices are available for this workspace.</div> : null}
        <div className="workflow-meta-grid">
          {invoices.map(invoice => (
            <article className="workflow-meta-panel" key={invoice.invoiceId}>
              <span>{formatLabel(invoice.status)}</span>
              <strong>{invoice.invoiceReference ?? invoice.invoiceId}</strong>
              <p>{invoice.amount} {invoice.currency}</p>
              <p>{invoice.matchResult.issues.length > 0 ? invoice.matchResult.issues.join(', ') : 'No match issues recorded.'}</p>
              <code>{invoice.invoiceHash}</code>
              {canVerify ? (
                <div className="admin-action-row">
                  <button
                    className="button button-secondary"
                    type="button"
                    disabled={isBusy || invoice.status === 'paymentApproved'}
                    onClick={() => void runAction(
                      () => verifyInvoiceMatch(invoice.invoiceId, session).then(() => undefined),
                      'Invoice match verification completed.',
                    )}
                  >
                    Verify match
                  </button>
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={isBusy || invoice.status !== 'matchPassed'}
                    onClick={() => void runAction(
                      () => approveInvoicePayment(invoice.invoiceId, session).then(() => undefined),
                      'Invoice approved for sandbox payment readiness.',
                    )}
                  >
                    Approve readiness
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default InvoiceWorkspacePage;
