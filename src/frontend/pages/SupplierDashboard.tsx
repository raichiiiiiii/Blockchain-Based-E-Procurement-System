import { useEffect, useMemo, useState } from 'react';
import { acknowledgeProcurementOrder, listProcurementOrders } from '../api/procurement-orders';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { ProcurementOrderResponse } from '../types/procurement-order';

type SupplierDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

function formatOrderStatus(status: ProcurementOrderResponse['status']): string {
  switch (status) {
    case 'accepted':
      return 'Accepted';
    case 'rejected':
      return 'Rejected';
    case 'created':
      return 'Awaiting response';
  }
}

function normalizeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'The request could not be completed';
}

function SupplierDashboard({ activeTarget, session }: SupplierDashboardProps) {
  const [orders, setOrders] = useState<ProcurementOrderResponse[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | undefined>();
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [actionOrderId, setActionOrderId] = useState<string | undefined>();
  const [ordersError, setOrdersError] = useState<string | undefined>();
  const [ordersMessage, setOrdersMessage] = useState<string | undefined>();

  const selectedOrder = useMemo(
    () => orders.find(order => order.orderId === selectedOrderId) ?? orders[0],
    [orders, selectedOrderId],
  );

  const pendingOrders = useMemo(
    () => orders.filter(order => order.status === 'created'),
    [orders],
  );

  const acceptedOrders = useMemo(
    () => orders.filter(order => order.status === 'accepted'),
    [orders],
  );

  const loadOrders = async () => {
    setIsLoadingOrders(true);
    setOrdersError(undefined);

    try {
      const nextOrders = await listProcurementOrders(session);
      setOrders(nextOrders);
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

  const handleAcknowledgement = async (
    order: ProcurementOrderResponse,
    decision: 'accept' | 'reject',
  ) => {
    setActionOrderId(order.orderId);
    setOrdersError(undefined);
    setOrdersMessage(undefined);

    try {
      const acknowledged = await acknowledgeProcurementOrder(order.orderId, { decision }, session);
      setOrders(current => current.map(item => item.orderId === acknowledged.orderId ? acknowledged : item));
      setSelectedOrderId(acknowledged.orderId);
      setOrdersMessage(decision === 'accept'
        ? 'Order accepted and lifecycle evidence recorded.'
        : 'Order rejected and lifecycle evidence recorded.');
    } catch (error) {
      setOrdersError(normalizeErrorMessage(error));
    } finally {
      setActionOrderId(undefined);
    }
  };

  const renderReceivedOrders = () => (
    <div className="order-workspace">
      <section className="proof-surface-header" aria-label="Received orders">
        <p className="dashboard-role-label">Received Orders</p>
        <h2>Supplier order response</h2>
        <p>Review assigned buyer orders and record an acknowledgement before escrow proceeds.</p>
      </section>

      <div className="order-action-grid">
        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Assigned orders</h3>
              <p>Only orders assigned to this supplier organization are shown.</p>
            </div>
            <span className="admin-count">{orders.length} orders</span>
          </div>
          {isLoadingOrders ? <div className="empty-product-state">Loading received orders...</div> : null}
          {!isLoadingOrders && orders.length === 0 ? (
            <div className="empty-product-state">No received orders are available for this supplier organization.</div>
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

        <section className="workspace-panel">
          {selectedOrder ? (
            <>
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
                  <dt>Buyer</dt>
                  <dd>{selectedOrder.buyerOrganizationId}</dd>
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
              {selectedOrder.status === 'created' ? (
                <div className="admin-action-row">
                  <button
                    className="button button-primary"
                    type="button"
                    disabled={actionOrderId === selectedOrder.orderId}
                    onClick={() => void handleAcknowledgement(selectedOrder, 'accept')}
                  >
                    Accept order
                  </button>
                  <button
                    className="button button-ghost"
                    type="button"
                    disabled={actionOrderId === selectedOrder.orderId}
                    onClick={() => void handleAcknowledgement(selectedOrder, 'reject')}
                  >
                    Reject order
                  </button>
                </div>
              ) : (
                <div className="empty-product-state">
                  This order already has a supplier response.
                </div>
              )}
            </>
          ) : (
            <div className="empty-product-state">Select an assigned order to inspect acknowledgement details.</div>
          )}
          {ordersError ? <p className="admin-alert admin-alert-error" role="alert">{ordersError}</p> : null}
          {ordersMessage ? <p className="admin-alert admin-alert-success">{ordersMessage}</p> : null}
        </section>
      </div>
    </div>
  );

  if (activeTarget === 'received-orders') {
    return renderReceivedOrders();
  }

  if (activeTarget === 'delivery-evidence') {
    return (
      <section className="workspace-panel">
        <h2>Delivery Evidence</h2>
        <p>Delivery evidence is represented as safe metadata for accepted orders.</p>
        <div className="workflow-meta-grid">
          {acceptedOrders.map(order => (
            <div className="workflow-meta-panel" key={order.orderId}>
              <span>{order.orderId}</span>
              <strong>{order.title}</strong>
              <p>Evidence references will use checksums, timestamps, and reviewer status without rendering restricted documents.</p>
            </div>
          ))}
          {acceptedOrders.length === 0 ? (
            <div className="empty-product-state">Accept an order before delivery evidence metadata can be prepared.</div>
          ) : null}
        </div>
      </section>
    );
  }

  if (activeTarget === 'escrow') {
    return (
      <section className="workspace-panel">
        <h2>Escrow</h2>
        <p>Escrow creation is buyer-controlled. Suppliers can inspect accepted order readiness here.</p>
        <div className="workflow-meta-grid">
          {acceptedOrders.map(order => (
            <div className="workflow-meta-panel" key={order.orderId}>
              <span>{order.orderId}</span>
              <strong>Accepted order</strong>
              <p>Escrow can be created by the buyer from this accepted order reference.</p>
            </div>
          ))}
          {acceptedOrders.length === 0 ? (
            <div className="empty-product-state">No accepted orders are ready for escrow review.</div>
          ) : null}
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
        <h2>Supplier operations</h2>
        <p>Respond to received orders, prepare delivery evidence metadata, and monitor escrow readiness.</p>
      </section>
      <section className="metric-panel">
        <span>Received Orders</span>
        <strong>{orders.length}</strong>
        <p>{pendingOrders.length} order{pendingOrders.length === 1 ? '' : 's'} awaiting supplier response.</p>
      </section>
      <section className="metric-panel">
        <span>Accepted</span>
        <strong>{acceptedOrders.length}</strong>
        <p>Accepted orders can move into buyer escrow creation.</p>
      </section>
      <section className="metric-panel">
        <span>Delivery Evidence</span>
        <strong>Metadata</strong>
        <p>Evidence is tracked as safe references and hashes, not raw documents.</p>
      </section>
    </div>
  );
}

export default SupplierDashboard;
