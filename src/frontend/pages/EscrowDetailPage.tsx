import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import {
  escrowToProofRecord,
  getLocalDemoEscrowRecord,
  type EscrowRecord,
} from '../lib/escrow-client';

type EscrowDetailPageProps = {
  escrow?: EscrowRecord;
};

function formatStatus(status: EscrowRecord['status']): string {
  switch (status) {
    case 'escrowCreated':
      return 'Escrow created';
    case 'releasePending':
      return 'Release pending';
    case 'releaseReady':
      return 'Release ready';
    default:
      return status.charAt(0).toUpperCase() + status.slice(1);
  }
}

function EscrowDetailPage({ escrow = getLocalDemoEscrowRecord() }: EscrowDetailPageProps) {
  const proofRecord = escrowToProofRecord(escrow);

  return (
    <div className="escrow-detail-surface">
      <section className="proof-surface-header" aria-label="Escrow detail">
        <p className="dashboard-role-label">Escrow detail</p>
        <h2>{formatStatus(escrow.status)}</h2>
        <p>
          Escrow proof is based on the lifecycle event hash. Payment credentials and commercial terms stay off-chain.
        </p>
      </section>

      <div className="escrow-status-grid">
        <div className="escrow-status-band">
          <span>Escrow status</span>
          <strong>{formatStatus(escrow.status)}</strong>
          <p>Created from order {escrow.orderId} for buyer {escrow.buyerOrganizationId}.</p>
        </div>
        <div className="escrow-status-band">
          <span>Proof boundary</span>
          <strong>Hash only</strong>
          <p>The panel shows event proof metadata only. Raw escrow terms are not displayed.</p>
        </div>
        <div className="escrow-status-band">
          <span>Lifecycle event</span>
          <strong>{escrow.lifecycleEventId ?? 'Not recorded'}</strong>
          <p>
            {escrow.lifecycleEventHash ? (
              <code>{escrow.lifecycleEventHash}</code>
            ) : (
              'Lifecycle event hash will appear after recording.'
            )}
          </p>
        </div>
      </div>

      <BlockchainProofPanel {...proofRecord} />
    </div>
  );
}

export default EscrowDetailPage;
