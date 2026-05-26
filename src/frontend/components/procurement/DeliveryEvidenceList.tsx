import BlockchainProofPanel from '../blockchain/BlockchainProofPanel';
import type { BlockchainProofRecord } from '../../lib/blockchain-proof-client';
import type {
  DeliveryEvidenceRecord,
  DeliveryEvidenceType,
  DeliveryEvidenceVerificationStatus,
} from '../../types/delivery-evidence';

type DeliveryEvidenceListProps = {
  records: DeliveryEvidenceRecord[];
  emptyMessage: string;
};

const evidenceTypeLabels: Record<DeliveryEvidenceType, string> = {
  deliveryNote: 'Delivery note',
  courierReceipt: 'Courier receipt',
  warehouseReceipt: 'Warehouse receipt',
  inspectionRecord: 'Inspection record',
  other: 'Other evidence',
};

const verificationStatusLabels: Record<DeliveryEvidenceVerificationStatus, string> = {
  metadataRecorded: 'Metadata recorded',
};

function formatTimestamp(value: string): string {
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

function toProofRecord(record: DeliveryEvidenceRecord): BlockchainProofRecord {
  const anchor = record.blockchainAnchor;
  return {
    eventId: anchor?.eventId ?? record.lifecycleEventId ?? record.evidenceId,
    anchorStatus: anchor?.anchorStatus ?? 'notAnchored',
    payloadHash: anchor?.payloadHash ?? record.lifecycleEventHash ?? record.evidenceHash,
    blockchainNetwork: anchor?.blockchainNetwork,
    transactionId: anchor?.transactionId,
    blockNumber: anchor?.blockNumber,
    channelName: anchor?.channelName,
    chaincodeName: anchor?.chaincodeName,
    anchoredAt: anchor?.anchoredAt,
    failureReason: anchor?.failureReason,
    source: 'backend',
  };
}

function DeliveryEvidenceList({ records, emptyMessage }: DeliveryEvidenceListProps) {
  if (records.length === 0) {
    return <div className="empty-product-state">{emptyMessage}</div>;
  }

  return (
    <div className="delivery-evidence-list">
      {records.map(record => (
        <article className="workflow-meta-panel delivery-evidence-card" key={record.evidenceId}>
          <span>{verificationStatusLabels[record.verificationStatus]}</span>
          <strong>{evidenceTypeLabels[record.evidenceType]}</strong>
          <p>{record.notes ?? 'No additional delivery note was provided.'}</p>
          <dl className="admin-definition-grid">
            <div>
              <dt>Evidence reference</dt>
              <dd><code>{record.evidenceReference ?? 'Not provided'}</code></dd>
            </div>
            <div>
              <dt>Evidence hash</dt>
              <dd><code>{record.evidenceHash}</code></dd>
            </div>
            <div>
              <dt>Submitted by</dt>
              <dd>{record.submittedByUserId}</dd>
            </div>
            <div>
              <dt>Submitted</dt>
              <dd>{formatTimestamp(record.submittedAt)}</dd>
            </div>
            <div>
              <dt>Lifecycle event</dt>
              <dd><code>{record.lifecycleEventId ?? 'Not recorded'}</code></dd>
            </div>
            <div>
              <dt>Lifecycle hash</dt>
              <dd><code>{record.lifecycleEventHash ?? 'Not available'}</code></dd>
            </div>
          </dl>
          <BlockchainProofPanel {...toProofRecord(record)} />
        </article>
      ))}
    </div>
  );
}

export default DeliveryEvidenceList;
