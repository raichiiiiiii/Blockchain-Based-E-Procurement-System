import type {
  BlockchainAnchorStatus,
  BlockchainProofRecord,
  BlockchainVerificationResult,
  BlockchainVerificationStatus,
} from '../../lib/blockchain-proof-client';
import BlockchainStatusIndicator from '../status/BlockchainStatusIndicator';

export type BlockchainProofPanelProps = BlockchainProofRecord & {
  verification?: BlockchainVerificationResult;
  verificationStatus?: BlockchainVerificationStatus | 'verifying';
  onVerify?: (eventId: string, payloadHash?: string) => Promise<void> | void;
};

type ProofDisplayStatus = BlockchainAnchorStatus | BlockchainVerificationStatus | 'verifying';

type StatusDefinition = {
  label: string;
  tone: 'neutral' | 'pending' | 'success' | 'warning' | 'danger' | 'unavailable';
  message: string;
};

const statusDefinitions: Record<ProofDisplayStatus, StatusDefinition> = {
  notAnchored: {
    label: 'Not anchored',
    tone: 'neutral',
    message: 'This event has not been anchored to Fabric yet.',
  },
  pending: {
    label: 'Pending anchoring',
    tone: 'pending',
    message: 'Blockchain anchoring is pending.',
  },
  anchored: {
    label: 'Anchored',
    tone: 'success',
    message: 'A proof record is available for this event hash.',
  },
  failed: {
    label: 'Anchoring failed',
    tone: 'danger',
    message: 'The business event remains recorded, but blockchain anchoring did not complete.',
  },
  verifying: {
    label: 'Verifying',
    tone: 'pending',
    message: 'Verification is checking the submitted event hash against the proof record.',
  },
  verified: {
    label: 'Verified',
    tone: 'success',
    message: 'The submitted event hash matches the proof record.',
  },
  mismatch: {
    label: 'Mismatch',
    tone: 'warning',
    message: 'The submitted event hash differs from the proof record. Review the event before relying on this proof.',
  },
  notFound: {
    label: 'Not found',
    tone: 'neutral',
    message: 'No Fabric proof record was found for this event.',
  },
  unavailable: {
    label: 'Unavailable',
    tone: 'unavailable',
    message: 'The proof service is unavailable. Try verification again when the service is reachable.',
  },
};

function resolveDisplayStatus(
  anchorStatus: BlockchainAnchorStatus,
  verificationStatus?: BlockchainVerificationStatus | 'verifying',
): ProofDisplayStatus {
  return verificationStatus ?? anchorStatus;
}

function formatTimestamp(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ProofField({ label, value }: { label: string; value?: string }) {
  if (!value) {
    return null;
  }

  return (
    <div className="proof-field">
      <dt>{label}</dt>
      <dd>
        <code>{value}</code>
      </dd>
    </div>
  );
}

function BlockchainProofPanel({
  eventId,
  anchorStatus,
  payloadHash,
  channelName,
  chaincodeName,
  transactionId,
  blockNumber,
  anchoredAt,
  failureReason,
  verification,
  verificationStatus,
  onVerify,
}: BlockchainProofPanelProps) {
  const effectiveVerificationStatus = verificationStatus ?? verification?.verificationStatus;
  const displayStatus = resolveDisplayStatus(anchorStatus, effectiveVerificationStatus);
  const status = statusDefinitions[displayStatus];
  const canVerify = anchorStatus === 'anchored' && Boolean(payloadHash) && Boolean(onVerify);
  const isVerifying = displayStatus === 'verifying';

  return (
    <section className={`proof-panel proof-panel-${status.tone}`} aria-label={`Blockchain proof for ${eventId}`}>
      <header className="proof-panel-header">
        <div>
          <p className="proof-eyebrow">Blockchain Proof</p>
          <h2>{status.label}</h2>
        </div>
        <BlockchainStatusIndicator status={displayStatus} />
      </header>

      <p className="proof-message">{status.message}</p>

      <dl className="proof-field-grid">
        <ProofField label="Event ID" value={eventId} />
        <ProofField label="Payload hash" value={payloadHash} />
        <ProofField label="Fabric transaction" value={anchorStatus === 'anchored' ? transactionId : undefined} />
        <ProofField label="Block number" value={blockNumber} />
        <ProofField label="Channel" value={channelName} />
        <ProofField label="Chaincode" value={chaincodeName} />
        <ProofField label="Anchored timestamp" value={formatTimestamp(anchoredAt)} />
        <ProofField label="Submitted hash" value={verification?.submittedPayloadHash} />
        <ProofField label="Anchored hash" value={verification?.anchoredPayloadHash} />
        <ProofField label="Safe failure reason" value={failureReason} />
      </dl>

      <div className="proof-actions">
        {canVerify ? (
          <button
            className="button button-primary"
            type="button"
            disabled={isVerifying}
            onClick={() => void onVerify?.(eventId, payloadHash)}
          >
            {isVerifying ? 'Verifying...' : 'Verify proof'}
          </button>
        ) : (
          <span className="proof-action-note">Verification is available after an anchored proof is selected.</span>
        )}
      </div>
    </section>
  );
}

export default BlockchainProofPanel;
