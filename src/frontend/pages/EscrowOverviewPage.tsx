import { useMemo, useState } from 'react';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import {
  createDemoEscrowRequest,
  createEscrow,
  type EscrowRecord,
} from '../lib/escrow-client';
import EscrowDetailPage from './EscrowDetailPage';

type EscrowOverviewPageProps = {
  session: AuthenticatedFrontendSession;
  escrow?: EscrowRecord;
  onEscrowChange: (escrow: EscrowRecord) => void;
};

function EscrowOverviewPage({ session, escrow, onEscrowChange }: EscrowOverviewPageProps) {
  const [creationState, setCreationState] = useState<'idle' | 'creating' | 'created' | 'failed'>(
    escrow ? 'created' : 'idle',
  );
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const demoRequest = useMemo(() => createDemoEscrowRequest(session), [session]);

  const handleCreateEscrow = async () => {
    setCreationState('creating');
    setErrorMessage(undefined);

    try {
      const createdEscrow = await createEscrow(demoRequest, session);
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

      <div className="escrow-action-grid">
        <section className="escrow-order-card" aria-label="Accepted order">
          <span>Order reference</span>
          <strong>{demoRequest.orderId}</strong>
          <dl>
            <div>
              <dt>Buyer</dt>
              <dd>{demoRequest.buyerOrganizationId}</dd>
            </div>
            <div>
              <dt>Supplier</dt>
              <dd>{demoRequest.supplierOrganizationId}</dd>
            </div>
            <div>
              <dt>Terms hash</dt>
              <dd>
                <code>{demoRequest.termsHash}</code>
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
      </div>

      {escrow ? (
        <EscrowDetailPage escrow={escrow} />
      ) : (
        <section className="empty-product-state">
          Escrow proof appears after the escrow record is created.
        </section>
      )}
    </div>
  );
}

export default EscrowOverviewPage;
