import { useState } from 'react';
import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import ExportBundlePage from './ExportBundlePage';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import {
  getLocalDemoProofRecord,
  verifyBlockchainProof,
  type BlockchainVerificationResult,
} from '../lib/blockchain-proof-client';

type RegulatorDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type VerificationState = BlockchainVerificationResult | { verificationStatus: 'verifying' };

const regulatorProof = getLocalDemoProofRecord('audit-event-anchored');

function isVerificationResult(value: VerificationState | undefined): value is BlockchainVerificationResult {
  return Boolean(value && value.verificationStatus !== 'verifying');
}

function RegulatorDashboard({ activeTarget, session }: RegulatorDashboardProps) {
  const [verificationState, setVerificationState] = useState<VerificationState>();

  const handleVerifyProof = async (eventId: string, payloadHash?: string) => {
    setVerificationState({ verificationStatus: 'verifying' });
    setVerificationState(await verifyBlockchainProof({ eventId, payloadHash }));
  };

  if (activeTarget === 'export-bundle') {
    return <ExportBundlePage session={session} />;
  }

  if (activeTarget === 'blockchain-proof') {
    const verification = isVerificationResult(verificationState) ? verificationState : undefined;

    return (
      <div className="proof-workspace">
        <section className="proof-surface-header">
          <p className="dashboard-role-label">Blockchain Proof</p>
          <h2>Proof verification</h2>
          <p>Inspect anchored event proof metadata without exposing restricted records or private payloads.</p>
        </section>
        <BlockchainProofPanel
          {...regulatorProof}
          verification={verification}
          verificationStatus={verificationState?.verificationStatus}
          onVerify={handleVerifyProof}
        />
      </div>
    );
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Reporting preferences and export defaults will use account settings when they are connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Reporting workspace</h2>
        <p>Request scoped export bundles, inspect integrity metadata, and verify proof references for supervisory review.</p>
      </section>
      <section className="metric-panel">
        <span>Export Bundle</span>
        <strong>Ready</strong>
        <p>Generate a scoped manifest with deterministic integrity metadata.</p>
      </section>
      <section className="metric-panel">
        <span>Blockchain Proof</span>
        <strong>Inspectable</strong>
        <p>Verified, mismatch, not found, and unavailable states remain distinct.</p>
      </section>
      <section className="metric-panel">
        <span>Restricted Data</span>
        <strong>Hidden</strong>
        <p>Export screens show references and hashes, not private documents or raw payloads.</p>
      </section>
    </div>
  );
}

export default RegulatorDashboard;
