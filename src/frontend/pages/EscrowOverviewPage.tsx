import { useMemo, useState } from 'react';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import {
  createEscrowRequestFromOrder,
  createEscrow,
  type EscrowRecord,
} from '../lib/escrow-client';
import type { ProcurementOrderResponse } from '../types/procurement-order';
import EscrowDetailPage from './EscrowDetailPage';

type EscrowOverviewPageProps = {
  session: AuthenticatedFrontendSession;
  acceptedOrder?: ProcurementOrderResponse;
  escrow?: EscrowRecord;
  onEscrowChange: (escrow: EscrowRecord) => void;
};

function EscrowOverviewPage({ session, acceptedOrder, escrow, onEscrowChange }: EscrowOverviewPageProps) {
  const [creationState, setCreationState] = useState<'idle' | 'creating' | 'created' | 'failed'>(
    escrow ? 'created' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const escrowRequest = useMemo(
    () => acceptedOrder ? createEscrowRequestFromOrder(acceptedOrder, session) : undefined,
    [acceptedOrder, session],
  );

  const handleCreateEscrow = async () => {
    if (!escrowRequest) {
      setErrorMessage('An accepted order is required before escrow can be created.');
      return;
    }

    setCreationState('creating');
    setErrorMessage(undefined);

    try {
      const createdEscrow = await createEscrow(escrowRequest, session);
      onEscrowChange(createdEscrow);
      setCreationState('created');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Escrow could not be created';
      setErrorMessage(message);
      setCreationState('failed');
    }
  };

  return (
    <div className="escrow-overview">
      <section className="proof-surface-header" aria-label="Escrow overview">
        <p className="dashboard-role-label">Escrow</p>
        <h2>Accepted order escrow</h2>
        <p>
          Create a controlled escrow record from an accepted order and review the lifecycle proof status.
        </p>
      </section>

      {!escrowRequest ? (
        <section className="empty-product-state">
          Accept an order before creating escrow. Accepted orders from the Orders workspace appear here.
        </section>
      ) : null}

      {escrowRequest ? <div className="escrow-action-grid">
        <section className="escrow-order-card" aria-label="Accepted order">
          <span>Order reference</span>
          <strong>{escrowRequest.orderId}</strong>
          <dl>
            {acceptedOrder ? (
              <div>
                <dt>Order</dt>
                <dd>{acceptedOrder.title}</dd>
              </div>
            ) : null}
            <div>
              <dt>Buyer</dt>
              <dd>{escrowRequest.buyerOrganizationId}</dd>
            </div>
            <div>
              <dt>Supplier</dt>
              <dd>{escrowRequest.supplierOrganizationId}</dd>
            </div>
            <div>
              <dt>Terms hash</dt>
              <dd>
                <code>{escrowRequest.termsHash}</code>
              </dd>
            </div>
          </dl>
        </section>

        <section className="escrow-create-panel" aria-label="Create escrow">
          <span>Escrow status</span>
          <strong>{escrow ? 'Escrow created' : 'Ready to create'}</strong>
          <p>
            Only identifiers and hashes are used here. Payment credentials and commercial terms stay out of the proof.
          </p>
          <button
            className="button button-primary"
            type="button"
            onClick={() => void handleCreateEscrow()}
            disabled={creationState === 'creating'}
          >
            {creationState === 'creating' ? 'Creating escrow...' : escrow ? 'Refresh escrow' : 'Create escrow'}
          </button>
          {errorMessage ? <p className="escrow-error">{errorMessage}</p> : null}
        </section>
      </div> : null}

      {escrow ? (
        <EscrowDetailPage escrow={escrow} session={session} onEscrowChange={onEscrowChange} />
      ) : escrowRequest ? (
        <section className="empty-product-state">
          Escrow proof appears after the escrow record is created.
        </section>
      ) : null}
    </div>
  );
}

export default EscrowOverviewPage;
