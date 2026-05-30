import { useEffect, useMemo, useState } from 'react';
import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import BlockchainStatusOverview from '../components/blockchain/BlockchainStatusOverview';
import BlockchainProofTimeline from '../components/blockchain/BlockchainProofTimeline';
import ExportBundlePage from './ExportBundlePage';
import type { DashboardNavigationTarget } from '../lib/role-navigation';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import { getRuntimeReadiness, type RuntimeFabricMode } from '../api/ops-status';
import {
  getBlockchainProof,
  verifyBlockchainProof,
  type BlockchainProofRecord,
  type BlockchainVerificationResult,
} from '../lib/blockchain-proof-client';
import { buildProofTimelineItems, proofTimelineDefinitions } from '../lib/demo-proof-timeline';

type RegulatorDashboardProps = {
  activeTarget: DashboardNavigationTarget;
  session: AuthenticatedFrontendSession;
};

type VerificationState = BlockchainVerificationResult | { verificationStatus: 'verifying' };

function isVerificationResult(value: VerificationState | undefined): value is BlockchainVerificationResult {
  return Boolean(value && value.verificationStatus !== 'verifying');
}

function RegulatorDashboard({ activeTarget, session }: RegulatorDashboardProps) {
  const [proofRecords, setProofRecords] = useState<BlockchainProofRecord[]>([]);
  const [proofLoadError, setProofLoadError] = useState<string | undefined>();
  const [verificationState, setVerificationState] = useState<VerificationState>();
  const [fabricMode, setFabricMode] = useState<RuntimeFabricMode>();

  useEffect(() => {
    let cancelled = false;

    async function loadProofRecords() {
      setProofLoadError(undefined);
      try {
        const records = await Promise.all(
          proofTimelineDefinitions.map(definition => getBlockchainProof(definition.eventId, session)),
        );
        if (!cancelled) {
          setProofRecords(records);
        }
      } catch (error) {
        if (!cancelled) {
          setProofLoadError(error instanceof Error ? error.message : 'Proof status could not be loaded');
          setProofRecords([]);
        }
      }
    }

    void loadProofRecords();
    getRuntimeReadiness()
      .then(readiness => {
        if (!cancelled) {
          setFabricMode(readiness.checks.fabric.mode);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setFabricMode('unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [session.sessionId, session.sessionToken]);

  const handleVerifyProof = async (eventId: string, payloadHash?: string) => {
    setVerificationState({ verificationStatus: 'verifying' });
    setVerificationState(await verifyBlockchainProof({ eventId, payloadHash }, session));
  };

  const timelineItems = useMemo(() => buildProofTimelineItems(proofRecords), [proofRecords]);
  const selectedProof = useMemo(
    () => proofRecords.find(proof => proof.anchorStatus === 'anchored') ?? proofRecords[0] ?? timelineItems[0]?.proof,
    [proofRecords, timelineItems],
  );

  if (activeTarget === 'export-bundle') {
    return <ExportBundlePage session={session} />;
  }

  if (activeTarget === 'blockchain-proof') {
    const verification = isVerificationResult(verificationState) ? verificationState : undefined;
    const timelineItemsWithVerification = timelineItems.map(item => ({
      ...item,
      verificationStatus: item.proof.eventId === selectedProof?.eventId
        ? verificationState?.verificationStatus
        : undefined,
    }));

    return (
      <div className="proof-workspace">
        <section className="proof-surface-header">
          <p className="dashboard-role-label">Blockchain Proof</p>
          <h2>Proof verification</h2>
          <p>Inspect anchored event proof metadata without exposing restricted records or private payloads.</p>
        </section>
        {proofLoadError ? <div className="admin-alert admin-alert-error" role="alert">{proofLoadError}</div> : null}
        <BlockchainStatusOverview
          title="Proof status overview"
          description="Reporting proof visibility uses event hashes, manifest references, and available proof metadata only."
          items={timelineItemsWithVerification.map(item => ({
            surface: item.label,
            label: item.proof.eventId,
            description: item.description,
            proof: item.proof,
            status: item.verificationStatus,
          }))}
          fabricMode={fabricMode}
        />
        <BlockchainProofTimeline items={timelineItemsWithVerification} />
        {selectedProof ? (
          <BlockchainProofPanel
            {...selectedProof}
            verification={verification}
            verificationStatus={verificationState?.verificationStatus}
            onVerify={handleVerifyProof}
          />
        ) : null}
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
