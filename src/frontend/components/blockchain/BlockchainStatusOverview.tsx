import type { RuntimeFabricMode } from '../../api/ops-status';
import type { BlockchainProofRecord } from '../../lib/blockchain-proof-client';
import BlockchainStatusIndicator, { type BlockchainDisplayStatus } from '../status/BlockchainStatusIndicator';
import StatusIndicator, { type StatusTone } from '../status/StatusIndicator';

export type BlockchainStatusOverviewItem = {
  surface: string;
  label: string;
  description: string;
  proof?: BlockchainProofRecord;
  status?: BlockchainDisplayStatus;
  detail?: string;
};

const proofStateGuide: Array<{ status: BlockchainDisplayStatus; detail: string }> = [
  { status: 'anchored', detail: 'Proof metadata exists for the event hash.' },
  { status: 'pending', detail: 'Proof anchoring is queued or awaiting proof service completion.' },
  { status: 'failed', detail: 'Anchoring failed, but the business event remains recorded.' },
  { status: 'verified', detail: 'Submitted hash matches the proof record.' },
  { status: 'mismatch', detail: 'Submitted hash differs from the proof record.' },
  { status: 'notFound', detail: 'No proof record was found for the event.' },
  { status: 'unavailable', detail: 'Proof service or Fabric verification is unavailable.' },
  { status: 'notAnchored', detail: 'No proof anchor exists for the event.' },
];

function fabricStatus(mode?: RuntimeFabricMode): { label: string; tone: StatusTone; detail: string } {
  if (mode === 'configured') {
    return {
      label: 'Configured',
      tone: 'success',
      detail: 'Fabric gateway mode is configured for this runtime.',
    };
  }

  if (mode === 'unavailable') {
    return {
      label: 'Unavailable',
      tone: 'info',
      detail: 'Fabric proof mode is unavailable in the current readiness check.',
    };
  }

  return {
    label: 'Local proof mode',
    tone: 'neutral',
    detail: 'The runtime is using local proof anchoring, not a production consortium.',
  };
}

function resolveItemStatus(item: BlockchainStatusOverviewItem): BlockchainDisplayStatus {
  return item.status ?? item.proof?.anchorStatus ?? 'notAnchored';
}

function safeCodeValue(value?: string): JSX.Element | string {
  return value ? <code>{value}</code> : 'Not available';
}

function BlockchainStatusOverview({
  title = 'Blockchain status',
  description = 'Review proof states without exposing private payloads or claiming unavailable network evidence.',
  items,
  fabricMode,
}: {
  title?: string;
  description?: string;
  items: BlockchainStatusOverviewItem[];
  fabricMode?: RuntimeFabricMode;
}) {
  const fabric = fabricStatus(fabricMode);

  return (
    <section className="workspace-panel blockchain-status-overview" aria-label={title}>
      <div className="admin-section-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
        <StatusIndicator label={fabric.label} tone={fabric.tone} detail={fabric.detail} />
      </div>

      <div className="blockchain-status-guide" aria-label="Supported proof states">
        {proofStateGuide.map(item => (
          <div className="blockchain-status-guide-item" key={item.status}>
            <BlockchainStatusIndicator status={item.status} compact />
            <p>{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="blockchain-status-surface-list">
        {items.map(item => {
          const status = resolveItemStatus(item);
          return (
            <article className="blockchain-status-surface" key={`${item.surface}-${item.label}`}>
              <div>
                <span>{item.surface}</span>
                <strong>{item.label}</strong>
                <p>{item.description}</p>
              </div>
              <BlockchainStatusIndicator status={status} />
              <dl>
                <div>
                  <dt>Event ID</dt>
                  <dd>{safeCodeValue(item.proof?.eventId)}</dd>
                </div>
                <div>
                  <dt>Payload hash</dt>
                  <dd>{safeCodeValue(item.proof?.payloadHash)}</dd>
                </div>
                <div>
                  <dt>Detail</dt>
                  <dd>{item.detail ?? item.proof?.failureReason ?? 'Proof metadata only; no private payload is shown.'}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export default BlockchainStatusOverview;
