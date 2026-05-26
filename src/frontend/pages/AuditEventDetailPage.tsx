import { useState } from 'react';
import BlockchainProofPanel from '../components/blockchain/BlockchainProofPanel';
import BlockchainProofTimeline from '../components/blockchain/BlockchainProofTimeline';
import {
  getLocalDemoProofRecords,
  verifyBlockchainProof,
  type BlockchainProofRecord,
  type BlockchainVerificationResult,
} from '../lib/blockchain-proof-client';

type VerificationState = BlockchainVerificationResult | { verificationStatus: 'verifying' };

type AuditProofReviewItem = {
  proof: BlockchainProofRecord;
  eventType: string;
  outcome: string;
  occurredAt: string;
  description: string;
};

const auditProofRecords = getLocalDemoProofRecords([
  'audit-event-anchored',
  'audit-event-mismatch',
  'audit-event-not-found',
  'audit-event-unavailable',
  'audit-event-pending',
  'audit-event-failed',
  'audit-event-not-anchored',
]);

const auditProofReviewItems: AuditProofReviewItem[] = [
  {
    proof: auditProofRecords[0],
    eventType: 'purchaseOrderAccepted',
    outcome: 'Success',
    occurredAt: 'May 24, 2026, 10:00',
    description: 'Accepted order event with a payload hash ready for verification.',
  },
  {
    proof: auditProofRecords[1],
    eventType: 'purchaseOrderAccepted',
    outcome: 'Review required',
    occurredAt: 'May 24, 2026, 10:06',
    description: 'Event hash review where the submitted hash differs from the anchored hash.',
  },
  {
    proof: auditProofRecords[2],
    eventType: 'invoiceApproved',
    outcome: 'Needs lookup',
    occurredAt: 'May 24, 2026, 10:11',
    description: 'Event metadata exists off-chain, but verification may not find a Fabric record.',
  },
  {
    proof: auditProofRecords[3],
    eventType: 'deliveryRecorded',
    outcome: 'Service unavailable',
    occurredAt: 'May 24, 2026, 10:14',
    description: 'Event hash is ready, but proof verification depends on the proof service.',
  },
  {
    proof: auditProofRecords[4],
    eventType: 'settlementInitiated',
    outcome: 'Queued',
    occurredAt: 'May 24, 2026, 10:20',
    description: 'Anchor request is waiting for Fabric processing.',
  },
  {
    proof: auditProofRecords[5],
    eventType: 'roleAssignmentUpdated',
    outcome: 'Anchor failed',
    occurredAt: 'May 24, 2026, 10:28',
    description: 'Business event remains recorded while anchoring requires operator follow-up.',
  },
  {
    proof: auditProofRecords[6],
    eventType: 'memberProfileViewed',
    outcome: 'Not anchored',
    occurredAt: 'May 24, 2026, 10:32',
    description: 'Event does not currently have blockchain proof metadata.',
  },
];

function isVerificationResult(value: VerificationState | undefined): value is BlockchainVerificationResult {
  return Boolean(value && value.verificationStatus !== 'verifying');
}

function formatTimelineEventLabel(eventType: string): string {
  switch (eventType) {
    case 'purchaseOrderAccepted':
      return 'Order accepted';
    case 'invoiceApproved':
      return 'Invoice approved';
    case 'deliveryRecorded':
      return 'Delivery recorded';
    case 'settlementInitiated':
      return 'Settlement initiated';
    case 'roleAssignmentUpdated':
      return 'Role assignment updated';
    case 'memberProfileViewed':
      return 'Member profile viewed';
    default:
      return eventType;
  }
}

function AuditEventDetailPage() {
  const [verificationByEventId, setVerificationByEventId] = useState<Record<string, VerificationState>>({});

  const handleVerify = async (eventId: string, payloadHash?: string) => {
    setVerificationByEventId(current => ({
      ...current,
      [eventId]: { verificationStatus: 'verifying' },
    }));

    const result = await verifyBlockchainProof({ eventId, payloadHash });
    setVerificationByEventId(current => ({
      ...current,
      [eventId]: result,
    }));
  };

  return (
    <div className="proof-workspace">
      <section className="proof-surface-header" aria-label="Audit event detail">
        <p className="dashboard-role-label">Audit event detail</p>
        <h2>Event proof review</h2>
        <p>
          Review event hashes, anchor status, and verification results without exposing private event payloads.
        </p>
      </section>

      <BlockchainProofTimeline
        items={auditProofReviewItems.map(item => ({
          label: formatTimelineEventLabel(item.eventType),
          occurredAt: item.occurredAt,
          proof: item.proof,
          description: item.description,
          verificationStatus: verificationByEventId[item.proof.eventId]?.verificationStatus,
        }))}
      />

      <div className="proof-review-grid">
        {auditProofReviewItems.map(item => {
          const verificationState = verificationByEventId[item.proof.eventId];
          const verification = isVerificationResult(verificationState) ? verificationState : undefined;
          const verificationStatus = verificationState?.verificationStatus;

          return (
            <div className="proof-review-entry" key={item.proof.eventId}>
              <div className="proof-event-context">
                <span>{item.eventType}</span>
                <strong>{item.outcome}</strong>
                <p>{item.description}</p>
                <small>{item.occurredAt}</small>
              </div>
              <BlockchainProofPanel
                {...item.proof}
                verification={verification}
                verificationStatus={verificationStatus}
                onVerify={handleVerify}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AuditEventDetailPage;
