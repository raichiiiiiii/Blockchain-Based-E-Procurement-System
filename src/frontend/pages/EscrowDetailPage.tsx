import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import { getLocalDemoProofRecord } from '../lib/blockchain-proof-client';

const escrowCreatedProof = getLocalDemoProofRecord('escrow-created-pending');

function EscrowDetailPage() {
  return (
    <div className="escrow-detail-surface">
      <section className="proof-surface-header" aria-label="Escrow detail">
        <p className="dashboard-role-label">Escrow detail</p>
        <h2>Escrow proof readiness</h2>
        <p>
          Escrow proof is based on the lifecycle event hash. Payment credentials and commercial terms stay off-chain.
        </p>
      </section>

      <div className="escrow-status-grid">
        <div className="escrow-status-band">
          <span>Escrow status</span>
          <strong>Awaiting accepted order</strong>
          <p>Create escrow from an accepted order before settlement controls are activated.</p>
        </div>
        <div className="escrow-status-band">
          <span>Proof boundary</span>
          <strong>Hash only</strong>
          <p>The panel shows event proof metadata only. Raw escrow terms are not displayed.</p>
        </div>
      </div>

      <BlockchainProofPanel {...escrowCreatedProof} />
    </div>
  );
}

export default EscrowDetailPage;
