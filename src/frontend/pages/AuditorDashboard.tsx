import { useState } from 'react';
import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import BlockchainProofTimeline from '../components/blockchain/BlockchainProofTimeline';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import {
  getLocalDemoProofRecord,
  verifyBlockchainProof,
  type BlockchainVerificationResult,
} from '../lib/blockchain-proof-client';
import { getDemoProofTimelineItems } from '../lib/demo-proof-timeline';
import ExportBundlePage from './ExportBundlePage';

type AuditorDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type VerificationState = BlockchainVerificationResult | { verificationStatus: 'verifying' };

const auditorProof = getLocalDemoProofRecord('audit-event-anchored');
const auditorProofTimelineItems = getDemoProofTimelineItems();

function isVerificationResult(value: VerificationState | undefined): value is BlockchainVerificationResult {
  return Boolean(value && value.verificationStatus !== 'verifying');
}

function AuditorDashboard({ activeTarget, session }: AuditorDashboardProps) {
  const [verificationState, setVerificationState] = useState<VerificationState>();

  const handleVerifyProof = async (eventId: string, payloadHash?: string) => {
    setVerificationState({ verificationStatus: 'verifying' });
    setVerificationState(await verifyBlockchainProof({ eventId, payloadHash }));
  };

  if (activeTarget === 'audit-trail') {
    return (
      <section className="workspace-panel">
        <h2>Audit Trail</h2>
        <p>Review access history and event sequences from the audit workspace.</p>
        <div className="audit-list">
          <span>Access History Search</span>
          <span>Event Detail</span>
          <span>Event Sequence</span>
        </div>
      </section>
    );
  }

  if (activeTarget === 'blockchain-proof') {
    const verification = isVerificationResult(verificationState) ? verificationState : undefined;
    const timelineItems = auditorProofTimelineItems.map(item => (
      item.proof.eventId === auditorProof.eventId
        ? { ...item, verificationStatus: verificationState?.verificationStatus }
        : item
    ));

    return (
      <div className="proof-workspace">
        <section className="proof-surface-header">
          <p className="dashboard-role-label">Blockchain Proof</p>
          <h2>Audit proof verification</h2>
          <p>Verify anchored event proof metadata without exposing restricted records or private payloads.</p>
        </section>
        <BlockchainProofTimeline items={timelineItems} />
        <BlockchainProofPanel
          {...auditorProof}
          verification={verification}
          verificationStatus={verificationState?.verificationStatus}
          onVerify={handleVerifyProof}
        />
      </div>
    );
  }

  if (activeTarget === 'export-bundle') {
    return <ExportBundlePage session={session} />;
  }

  if (activeTarget === 'settings') {
    return (
      <section className="workspace-panel">
        <h2>Settings</h2>
        <p>Audit preferences and export defaults will use account settings when they are connected.</p>
      </section>
    );
  }

  return (
    <div className="dashboard-grid">
      <section className="workspace-panel workspace-panel-hero">
        <h2>Audit workspace</h2>
        <p>Inspect event trails, prepare export bundles, and verify proof when anchored records exist.</p>
      </section>
      <section className="metric-panel">
        <span>Audit Trail</span>
        <strong>Ready</strong>
        <p>Use audit search and event detail tools for governed review.</p>
      </section>
      <section className="metric-panel">
        <span>Proof</span>
        <strong>Not selected</strong>
        <p>Proof verification starts from an anchored event detail.</p>
      </section>
      <section className="metric-panel">
        <span>Export Bundle</span>
        <strong>Empty</strong>
        <p>Select records before preparing an export bundle.</p>
      </section>
    </div>
  );
}

export default AuditorDashboard;
