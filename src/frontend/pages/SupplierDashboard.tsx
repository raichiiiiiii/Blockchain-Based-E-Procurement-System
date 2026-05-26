import { useEffect, useMemo, useState } from 'react';
import { getComplianceChecklistSnapshot } from '../api/compliance-cases';
import { acknowledgeProcurementOrder, listProcurementOrders } from '../api/procurement-orders';
import {
  listDeliveryEvidenceForOrder,
  submitDeliveryEvidenceForOrder,
} from '../api/delivery-evidence';
import SmartOnboardingChecklist, {
  type SmartOnboardingChecklistData,
} from '../components/compliance/SmartOnboardingChecklist';
import DeliveryEvidenceList from '../components/procurement/DeliveryEvidenceList';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  DeliveryEvidenceRecord,
  DeliveryEvidenceType,
  SubmitDeliveryEvidenceRequest,
} from '../types/delivery-evidence';
import type { ProcurementOrderResponse } from '../types/procurement-order';

type SupplierDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type DeliveryEvidenceFormState = {
  evidenceType: DeliveryEvidenceType;
  evidenceReference: string;
  notes: string;
};

const initialDeliveryEvidenceForm: DeliveryEvidenceFormState = {
  evidenceType: 'deliveryNote',
  evidenceReference: 'delivery-ref:barakah:dn-1002',
  notes: 'Sealed carton count and dispatch timestamp recorded by supplier operations.',
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
  const [selectedEvidenceOrderId, setSelectedEvidenceOrderId] = useState<string | undefined>();
  const [deliveryEvidenceByOrder, setDeliveryEvidenceByOrder] = useState<Record<string, DeliveryEvidenceRecord[]>>({});
  const [deliveryEvidenceForm, setDeliveryEvidenceForm] = useState<DeliveryEvidenceFormState>(initialDeliveryEvidenceForm);
  const [isSubmittingEvidence, setIsSubmittingEvidence] = useState(false);
  const [deliveryEvidenceError, setDeliveryEvidenceError] = useState<string | undefined>();
  const [deliveryEvidenceMessage, setDeliveryEvidenceMessage] = useState<string | undefined>();
  const [onboardingSnapshot, setOnboardingSnapshot] = useState<SmartOnboardingChecklistData | undefined>();
  const [onboardingError, setOnboardingError] = useState<string | undefined>();

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

  const selectedEvidenceOrder = useMemo(
    () => acceptedOrders.find(order => order.orderId === selectedEvidenceOrderId) ?? acceptedOrders[0],
    [acceptedOrders, selectedEvidenceOrderId],
  );

  const selectedEvidenceRecords = selectedEvidenceOrder
    ? deliveryEvidenceByOrder[selectedEvidenceOrder.orderId] ?? []
    : [];

  const loadDeliveryEvidence = async (candidateOrders: ProcurementOrderResponse[]) => {
    const accepted = candidateOrders.filter(order => order.status === 'accepted');
    const entries = await Promise.all(accepted.map(async order => {
      const evidence = await listDeliveryEvidenceForOrder(order.orderId, session);
      return [order.orderId, evidence] as const;
    }));

    setDeliveryEvidenceByOrder(Object.fromEntries(entries));
    setSelectedEvidenceOrderId(current => {
      if (current && accepted.some(order => order.orderId === current)) {
        return current;
      }

      return accepted[0]?.orderId;
    });
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

  const loadOnboardingSnapshot = async () => {
    const organizationId = session.actor.actorOrganizationId;
    if (!organizationId) {
      setOnboardingSnapshot(undefined);
      setOnboardingError('No supplier organization is attached to this session.');
      return;
    }

    setOnboardingError(undefined);

    try {
      const snapshot = await getComplianceChecklistSnapshot(organizationId, session);
      setOnboardingSnapshot(snapshot);
    } catch (error) {
      setOnboardingSnapshot(undefined);
      setOnboardingError(normalizeErrorMessage(error));
    }
  };

  useEffect(() => {
    void loadOrders();
    void loadOnboardingSnapshot();
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
      const nextOrders = orders.map(item => item.orderId === acknowledged.orderId ? acknowledged : item);
      setOrders(nextOrders);
      setSelectedOrderId(acknowledged.orderId);
      await loadDeliveryEvidence(nextOrders);
      setOrdersMessage(decision === 'accept'
        ? 'Order accepted and lifecycle evidence recorded.'
        : 'Order rejected and lifecycle evidence recorded.');
    } catch (error) {
      setOrdersError(normalizeErrorMessage(error));
    } finally {
      setActionOrderId(undefined);
    }
  };

  const handleDeliveryEvidenceSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedEvidenceOrder) {
      return;
    }

    setIsSubmittingEvidence(true);
    setDeliveryEvidenceError(undefined);
    setDeliveryEvidenceMessage(undefined);

    const payload: SubmitDeliveryEvidenceRequest = {
      evidenceType: deliveryEvidenceForm.evidenceType,
      evidenceReference: deliveryEvidenceForm.evidenceReference.trim() || undefined,
      notes: deliveryEvidenceForm.notes.trim() || undefined,
    };

    try {
      const submitted = await submitDeliveryEvidenceForOrder(selectedEvidenceOrder.orderId, payload, session);
      setDeliveryEvidenceByOrder(current => ({
        ...current,
        [selectedEvidenceOrder.orderId]: [
          ...(current[selectedEvidenceOrder.orderId] ?? []),
          submitted,
        ],
      }));
      setDeliveryEvidenceMessage('Delivery evidence metadata recorded with lifecycle proof state.');
    } catch (error) {
      setDeliveryEvidenceError(normalizeErrorMessage(error));
    } finally {
      setIsSubmittingEvidence(false);
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
      <div className="order-workspace">
        <section className="proof-surface-header" aria-label="Delivery evidence">
          <p className="dashboard-role-label">Delivery Evidence</p>
          <h2>Delivery evidence submission</h2>
          <p>Record safe delivery references, notes, and hashes for accepted orders without uploading restricted documents.</p>
        </section>

        <div className="order-action-grid">
          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Accepted orders</h3>
                <p>Delivery evidence can be submitted only after supplier acknowledgement.</p>
              </div>
              <span className="admin-count">{acceptedOrders.length} ready</span>
            </div>
            {acceptedOrders.length === 0 ? (
              <div className="empty-product-state">Accept an order before delivery evidence metadata can be prepared.</div>
            ) : null}
            <div className="order-list">
              {acceptedOrders.map(order => (
                <button
                  className={`order-row ${selectedEvidenceOrder?.orderId === order.orderId ? 'order-row-active' : ''}`}
                  type="button"
                  key={order.orderId}
                  onClick={() => setSelectedEvidenceOrderId(order.orderId)}
                >
                  <span>Accepted</span>
                  <strong>{order.title}</strong>
                  <small>{order.orderId}</small>
                </button>
              ))}
            </div>
          </section>

          <section className="workspace-panel">
            <div className="admin-section-header">
              <div>
                <h3>Submit evidence</h3>
                <p>Only metadata and hashes are recorded. Raw delivery files stay outside this MVP flow.</p>
              </div>
            </div>
            {selectedEvidenceOrder ? (
              <form className="admin-form" onSubmit={event => void handleDeliveryEvidenceSubmit(event)}>
                <label>
                  Evidence type
                  <select
                    value={deliveryEvidenceForm.evidenceType}
                    onChange={event => setDeliveryEvidenceForm(current => ({
                      ...current,
                      evidenceType: event.target.value as DeliveryEvidenceType,
                    }))}
                  >
                    <option value="deliveryNote">Delivery note</option>
                    <option value="courierReceipt">Courier receipt</option>
                    <option value="warehouseReceipt">Warehouse receipt</option>
                    <option value="inspectionRecord">Inspection record</option>
                    <option value="other">Other evidence</option>
                  </select>
                </label>
                <label>
                  Evidence reference
                  <input
                    value={deliveryEvidenceForm.evidenceReference}
                    onChange={event => setDeliveryEvidenceForm(current => ({
                      ...current,
                      evidenceReference: event.target.value,
                    }))}
                  />
                </label>
                <label className="form-field-wide">
                  Notes
                  <textarea
                    value={deliveryEvidenceForm.notes}
                    onChange={event => setDeliveryEvidenceForm(current => ({
                      ...current,
                      notes: event.target.value,
                    }))}
                  />
                </label>
                <button className="button button-primary" type="submit" disabled={isSubmittingEvidence}>
                  {isSubmittingEvidence ? 'Recording evidence...' : 'Record delivery evidence'}
                </button>
              </form>
            ) : (
              <div className="empty-product-state">Select an accepted order to submit delivery evidence.</div>
            )}
            {deliveryEvidenceError ? <p className="admin-alert admin-alert-error" role="alert">{deliveryEvidenceError}</p> : null}
            {deliveryEvidenceMessage ? <p className="admin-alert admin-alert-success">{deliveryEvidenceMessage}</p> : null}
          </section>
        </div>

        <section className="workspace-panel">
          <div className="admin-section-header">
            <div>
              <h3>Submitted evidence</h3>
              <p>Proof state is shown honestly. Missing, pending, or failed anchors are not treated as verified.</p>
            </div>
          </div>
          <DeliveryEvidenceList
            records={selectedEvidenceRecords}
            emptyMessage="No delivery evidence has been recorded for this accepted order."
          />
        </section>
      </div>
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
      <section className="workspace-panel dashboard-wide-panel">
        {onboardingSnapshot ? (
          <SmartOnboardingChecklist audience="organization" data={onboardingSnapshot} />
        ) : (
          <div className="empty-product-state">
            {onboardingError ?? 'Loading onboarding readiness...'}
          </div>
        )}
      </section>
    </div>
  );
}

export default SupplierDashboard;
