import type {
  BlockchainAnchorStatus,
  BlockchainVerificationStatus,
} from '../../lib/blockchain-proof-client';
import StatusIndicator, { type StatusTone } from './StatusIndicator';

export type BlockchainDisplayStatus = BlockchainAnchorStatus | BlockchainVerificationStatus | 'verifying';

const statusMeta: Record<BlockchainDisplayStatus, { label: string; tone: StatusTone; detail: string }> = {
  notAnchored: {
    label: 'Not anchored',
    tone: 'neutral',
    detail: 'No blockchain proof record is available for this event.',
  },
  pending: {
    label: 'Pending',
    tone: 'pending',
    detail: 'Proof anchoring is queued or waiting for the proof service.',
  },
  anchored: {
    label: 'Anchored',
    tone: 'success',
    detail: 'Proof metadata exists for this event hash.',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
    detail: 'Anchoring did not complete; the business event remains recorded.',
  },
  verifying: {
    label: 'Verifying',
    tone: 'pending',
    detail: 'Verification is checking the submitted hash against proof metadata.',
  },
  verified: {
    label: 'Verified',
    tone: 'success',
    detail: 'The submitted hash matches the proof record.',
  },
  mismatch: {
    label: 'Mismatch',
    tone: 'warning',
    detail: 'The submitted hash differs from the proof record.',
  },
  notFound: {
    label: 'Not found',
    tone: 'neutral',
    detail: 'No proof record was found for this event.',
  },
  unavailable: {
    label: 'Unavailable',
    tone: 'info',
    detail: 'The proof service could not complete the verification request.',
  },
};

function BlockchainStatusIndicator({
  status,
  compact,
}: {
  status: BlockchainDisplayStatus;
  compact?: boolean;
}) {
  const meta = statusMeta[status];

  return (
    <StatusIndicator
      label={meta.label}
      tone={meta.tone}
      detail={meta.detail}
      compact={compact}
    />
  );
}

export default BlockchainStatusIndicator;
