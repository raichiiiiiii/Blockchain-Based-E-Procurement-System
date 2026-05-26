import { useEffect, useMemo, useState } from 'react';
import { listDeliveryEvidenceForOrder } from '../api/delivery-evidence';
import { createProcurementOrder, listProcurementOrders } from '../api/procurement-orders';
import DeliveryEvidenceList from '../components/procurement/DeliveryEvidenceList';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { EscrowRecord } from '../lib/escrow-client';
import type { DeliveryEvidenceRecord } from '../types/delivery-evidence';
import type { ProcurementOrderResponse } from '../types/procurement-order';
import EscrowDetailPage from './EscrowDetailPage';
import EscrowOverviewPage from './EscrowOverviewPage';

type BuyerDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type OrderFormState = {
  supplierOrganizationId: string;
  title: string;
  description: string;
  amount: string;
  currency: string;
};

const initialOrderForm: OrderFormState = {
  supplierOrganizationId: 'demo-supplier-org',
  title: 'Temperature controlled packaging',
  description: 'Packaging lot for verified procurement operations.',
  amount: '12000.00',
  currency: 'MYR',
};

function formatOrderStatus(status: ProcurementOrderResponse['status']): string {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'created':
      return 'Awaiting supplier';
  }
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function BuyerDashboard({ activeTarget, session }: BuyerDashboardProps) {
  const [activeEscrow, setActiveEscrow] = useState<EscrowRecord | undefined>();
  const [orders, setOrders] = useState<ProcurementOrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [orderForm, setOrderForm] = useState<OrderFormState>(initialOrderForm);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [ordersError, setOrdersError] = useState<string | undefined>();
  const [ordersMessage, setOrdersMessage] = useState<string | undefined>();
  const [deliveryEvidenceByOrder, setDeliveryEvidenceByOrder] = useState<Record<string, DeliveryEvidenceRecord[]>>({});
  const [deliveryEvidenceError, setDeliveryEvidenceError] = useState<string | undefined>();

  const acceptedOrders = useMemo(
    () => orders.filter(order => order.status === 'accepted'),
    [orders],
  );

  const selectedOrder = useMemo(
    () => orders.find(order => order.orderId === selectedOrderId) ?? orders[0],
    [orders, selectedOrderId],
  );

  const escrowReadyOrder = useMemo(
    () => acceptedOrders.find(order => order.orderId === selectedOrderId) ?? acceptedOrders[0],
    [acceptedOrders, selectedOrderId],
  );

  const selectedDeliveryEvidence = selectedOrder
    ? deliveryEvidenceByOrder[selectedOrder.orderId] ?? []
    : [];

  const loadDeliveryEvidence = async (candidateOrders: ProcurementOrderResponse[]) => {
    setDeliveryEvidenceError(undefined);

    try {
      const entries = await Promise.all(candidateOrders.map(async order => {
        const evidence = await listDeliveryEvidenceForOrder(order.orderId, session);
        return [order.orderId, evidence] as const;
      }));

      setDeliveryEvidenceByOrder(Object.fromEntries(entries));
    } catch (error) {
      setDeliveryEvidenceError(normalizeErrorMessage(error));
    }
  };

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    setOrdersError(undefined);

    try {
      const nextOrders = await listProcurementOrders(session);
      setOrders(nextOrders);
      await loadDeliveryEvidence(nextOrders);
      setSelectedOrderId(current => {
        if (current && nextOrders.some(order => order.orderId === current)) {
          return current;
        }

        return nextOrders[0]?.orderId;
      });
    } catch (error) {
      setOrdersError(normalizeErrorMessage(error));
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    void loadOrders();
  }, [session.sessionId]);

  const handleCreateOrder = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsCreatingOrder(true);
    setOrdersError(undefined);
    setOrdersMessage(undefined);

    try {
      const createdOrder = await createProcurementOrder({
        supplierOrganizationId: orderForm.supplierOrganizationId.trim(),
        title: orderForm.title.trim(),
        description: orderForm.description.trim() || undefined,
        amount: orderForm.amount.trim(),
        currency: orderForm.currency.trim().toUpperCase(),
      }, session);
      const nextOrders = [createdOrder, ...orders];
      setOrders(nextOrders);
      setSelectedOrderId(createdOrder.orderId);
      await loadDeliveryEvidence(nextOrders);
      setOrdersMessage('Order created and sent to the supplier workspace.');
    } catch (error) {
      setOrdersError(normalizeErrorMessage(error));
    } finally {
      setIsCreatingOrder(false);
    }
  };

  if (activeTarget === 'orders') {
    return (
      <div className="order-workspace">
        <section className="proof-surface-header" aria-label="Orders">
          <p className="dashboard-role-label">Orders</p>
          <h2>Buyer order workspace</h2>
          <p>Create purchase orders, inspect supplier acknowledgement, and move accepted orders into escrow.</p>
        </section>

        <div className="order-action-grid">
          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Create order</h3>
                <p>Order creation uses the signed-in buyer organization and downstream eligibility gate.</p>
              </div>
            </div>
            <form className="admin-form" onSubmit={event => void handleCreateOrder(event)}>
              <label>
                Supplier organization
                <input
                  value={orderForm.supplierOrganizationId}
                  onChange={event => setOrderForm(current => ({
                    ...current,
                    supplierOrganizationId: event.target.value,
                  }))}
                />
              </label>
              <label>
                Amount
                <input
                  value={orderForm.amount}
                  inputMode="decimal"
                  onChange={event => setOrderForm(current => ({
                    ...current,
                    amount: event.target.value,
                  }))}
                />
              </label>
              <label>
                Currency
                <input
                  value={orderForm.currency}
                  maxLength={3}
                  onChange={event => setOrderForm(current => ({
                    ...current,
                    currency: event.target.value,
                  }))}
                />
              </label>
              <label>
                Order title
                <input
                  value={orderForm.title}
                  onChange={event => setOrderForm(current => ({
                    ...current,
                    title: event.target.value,
                  }))}
                />
              </label>
              <label className="form-field-wide">
                Description
                <input
                  value={orderForm.description}
                  onChange={event => setOrderForm(current => ({
                    ...current,
                    description: event.target.value,
                  }))}
                />
              </label>
              <button className="button button-primary" type="submit" disabled={isCreatingOrder}>
                {isCreatingOrder ? 'Creating order...' : 'Create order'}
              </button>
            </form>
            {ordersError ? <p className="admin-alert admin-alert-error" role="alert">{ordersError}</p> : null}
            {ordersMessage ? <p className="admin-alert admin-alert-success">{ordersMessage}</p> : null}
          </section>

          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Order list</h3>
                <p>Supplier acknowledgement updates the order status and lifecycle evidence.</p>
              </div>
              <span className="admin-count">{orders.length} orders</span>
            </div>
            {isLoadingOrders ? <div className="empty-product-state">Loading orders...</div> : null}
            {!isLoadingOrders && orders.length === 0 ? (
              <div className="empty-product-state">No orders are available for this buyer organization.</div>
            ) : null}
            <div className="order-list">
              {orders.map(order => (
                <button
                  className={`order-row ${selectedOrder?.orderId === order.orderId ? 'order-row-active' : ''}`}
                  type="button"
                  key={order.orderId}
                  onClick={() => setSelectedOrderId(order.orderId)}
                >
                  <span>{formatOrderStatus(order.status)}</span>
                  <strong>{order.title}</strong>
                  <small>{order.amount} {order.currency}</small>
                </button>
              ))}
            </div>
          </section>
        </div>

        {selectedOrder ? (
          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>{selectedOrder.title}</h3>
                <p>{selectedOrder.description ?? 'No order description was provided.'}</p>
              </div>
              <span className={`admin-status ${selectedOrder.status === 'accepted' ? 'admin-status-active' : 'admin-status-pending'}`}>
                {formatOrderStatus(selectedOrder.status)}
              </span>
            </div>
            <dl className="admin-definition-grid">
              <div>
                <dt>Order reference</dt>
                <dd>{selectedOrder.orderId}</dd>
              </div>
              <div>
                <dt>Supplier</dt>
                <dd>{selectedOrder.supplierOrganizationId}</dd>
              </div>
              <div>
                <dt>Lifecycle events</dt>
                <dd>{selectedOrder.lifecycleEventIds.length}</dd>
              </div>
              <div>
                <dt>Latest hash</dt>
                <dd><code>{selectedOrder.latestLifecyclePayloadHash ?? 'Not available'}</code></dd>
              </div>
            </dl>
            <div className="workflow-meta-panel">
              <span>Delivery evidence</span>
              <strong>{selectedDeliveryEvidence.length > 0 ? 'Evidence recorded' : selectedOrder.status === 'accepted' ? 'Awaiting supplier evidence' : 'Waiting for acceptance'}</strong>
              <p>Delivery proof is shown as safe metadata, hashes, lifecycle event state, and proof status. Raw commercial documents are not displayed here.</p>
            </div>
            {deliveryEvidenceError ? <p className="admin-alert admin-alert-error" role="alert">{deliveryEvidenceError}</p> : null}
            <DeliveryEvidenceList
              records={selectedDeliveryEvidence}
              emptyMessage={selectedOrder.status === 'accepted'
                ? 'No delivery evidence has been submitted by the supplier for this order.'
                : 'Supplier delivery evidence appears after the order is accepted.'}
            />
          </section>
        ) : null}
      </div>
    );
  }

  if (activeTarget === 'escrow') {
    return (
      <EscrowOverviewPage
        session={session}
        acceptedOrder={escrowReadyOrder}
        escrow={activeEscrow}
        onEscrowChange={setActiveEscrow}
      />
    );
  }

  if (activeTarget === 'blockchain-proof') {
    return (
      <EscrowDetailPage escrow={activeEscrow} />
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
        <h2>Buyer operations</h2>
        <p>Track order readiness, escrow preparation, and proof availability from one workspace.</p>
      </section>
      <section className="metric-panel">
        <span>Orders</span>
        <strong>{orders.length}</strong>
        <p>{acceptedOrders.length} accepted order{acceptedOrders.length === 1 ? '' : 's'} ready for escrow review.</p>
      </section>
      <section className="metric-panel">
        <span>Escrow</span>
        <strong>{activeEscrow ? 'Created' : escrowReadyOrder ? 'Ready' : 'Waiting'}</strong>
        <p>{escrowReadyOrder ? 'An accepted order can be used to create escrow.' : 'Escrow starts after supplier acknowledgement.'}</p>
      </section>
      <section className="metric-panel">
        <span>Proof</span>
        <strong>{activeEscrow ? 'Visible' : 'Pending'}</strong>
        <p>Proof status is shown only for lifecycle events with anchor metadata.</p>
      </section>
    </div>
  );
}

export default BuyerDashboard;
