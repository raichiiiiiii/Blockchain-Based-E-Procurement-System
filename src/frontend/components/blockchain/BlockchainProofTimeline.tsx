import type {
  BlockchainAnchorStatus,
  BlockchainProofRecord,
  BlockchainVerificationStatus,
} from '../../lib/blockchain-proof-client';

export type BlockchainProofTimelineItem = {
  label: string;
  occurredAt: string;
  proof: BlockchainProofRecord;
  description: string;
  verificationStatus?: BlockchainVerificationStatus | 'verifying';
};

type TimelineStatus = BlockchainAnchorStatus | BlockchainVerificationStatus | 'verifying';

type TimelineStatusDefinition = {
  label: string;
  tone: 'neutral' | 'pending' | 'success' | 'warning' | 'danger' | 'unavailable';
};

const timelineStatusDefinitions: Record<TimelineStatus, TimelineStatusDefinition> = {
  notAnchored: {
    label: 'Not anchored',
    tone: 'neutral',
  },
  pending: {
    label: 'Pending',
    tone: 'pending',
  },
  anchored: {
    label: 'Anchored',
    tone: 'success',
  },
  failed: {
    label: 'Failed',
    tone: 'danger',
  },
  verifying: {
    label: 'Verifying',
    tone: 'pending',
  },
  verified: {
    label: 'Verified',
    tone: 'success',
  },
  mismatch: {
    label: 'Mismatch',
    tone: 'warning',
  },
  notFound: {
    label: 'Not found',
    tone: 'neutral',
  },
  unavailable: {
    label: 'Unavailable',
    tone: 'unavailable',
  },
};

function resolveTimelineStatus(item: BlockchainProofTimelineItem): TimelineStatus {
  return item.verificationStatus ?? item.proof.anchorStatus;
}

function BlockchainProofTimeline({ items }: { items: BlockchainProofTimelineItem[] }) {
  return (
    <section className="proof-timeline" aria-label="Blockchain proof timeline">
      <header className="proof-timeline-header">
        <div>
          <p className="proof-eyebrow">Blockchain Proof</p>
          <h3>Proof timeline</h3>
        </div>
        <span>{items.length} events</span>
      </header>

      <ol className="proof-timeline-list">
        {items.map(item => {
          const status = timelineStatusDefinitions[resolveTimelineStatus(item)];

          return (
            <li className="proof-timeline-item" key={`${item.label}-${item.proof.eventId}`}>
              <div className={`proof-timeline-marker proof-timeline-marker-${status.tone}`} aria-hidden="true" />
              <div className="proof-timeline-body">
                <div className="proof-timeline-title-row">
                  <div>
                    <strong>{item.label}</strong>
                    <span>{item.occurredAt}</span>
                  </div>
                  <span className={`proof-status-badge proof-status-${status.tone}`}>{status.label}</span>
                </div>
                <p>{item.description}</p>
                <dl className="proof-timeline-meta">
                  <div>
                    <dt>Event ID</dt>
                    <dd><code>{item.proof.eventId}</code></dd>
                  </div>
                  <div>
                    <dt>Proof hash</dt>
                    <dd>{item.proof.payloadHash ? <code>{item.proof.payloadHash}</code> : 'Not available'}</dd>
                  </div>
                </dl>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default BlockchainProofTimeline;
