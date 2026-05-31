import StatusIndicator, { type StatusTone } from '../status/StatusIndicator';
import type { CompanyProofStatus } from '../../types/organization-network';

function proofStatusTone(status: CompanyProofStatus): StatusTone {
  switch (status) {
    case 'verified':
    case 'anchored':
      return 'success';
    case 'pending':
      return 'pending';
    case 'failed':
    case 'mismatch':
      return 'danger';
    case 'notFound':
    case 'notAnchored':
      return 'warning';
    case 'unavailable':
    default:
      return 'info';
  }
}

function proofStatusLabel(status: CompanyProofStatus): string {
  switch (status) {
    case 'notAnchored':
      return 'Not anchored';
    case 'notFound':
      return 'Not found';
    case 'verified':
      return 'Verified';
    case 'mismatch':
      return 'Mismatch';
    case 'anchored':
      return 'Anchored';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    case 'unavailable':
    default:
      return 'Unavailable';
  }
}

type CompanyProofStatusBadgeProps = {
  status: CompanyProofStatus;
  compact?: boolean;
};

function CompanyProofStatusBadge({ status, compact = false }: CompanyProofStatusBadgeProps) {
  const detail = status === 'verified'
    ? 'Proof has been verified by available metadata.'
    : status === 'anchored'
      ? 'Anchor metadata exists, but this view is not a live verification claim.'
      : 'Proof status is shown honestly without fabricated transaction data.';

  return (
    <StatusIndicator
      label={proofStatusLabel(status)}
      tone={proofStatusTone(status)}
      detail={detail}
      compact={compact}
    />
  );
}

export default CompanyProofStatusBadge;
