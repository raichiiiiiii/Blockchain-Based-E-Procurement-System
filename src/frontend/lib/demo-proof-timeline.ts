import {
  getLocalDemoProofRecords,
  type BlockchainProofRecord,
} from './blockchain-proof-client';

export type DemoProofTimelineItem = {
  label: string;
  occurredAt: string;
  proof: BlockchainProofRecord;
  description: string;
};

export function getDemoProofTimelineItems(): DemoProofTimelineItem[] {
  const [
    orderCreated,
    orderAccepted,
    deliveryEvidenceSubmitted,
    escrowCreated,
    shariahDecision,
    exportGenerated,
  ] = getLocalDemoProofRecords([
    'audit-event-not-anchored',
    'audit-event-anchored',
    'audit-event-pending',
    'escrow-created-pending',
    'audit-event-failed',
    'audit-event-unavailable',
  ]);

  return [
    {
      label: 'Order created',
      occurredAt: 'May 24, 2026, 09:42',
      proof: orderCreated,
      description: 'Order metadata exists off-chain. No blockchain proof is claimed for this event.',
    },
    {
      label: 'Order accepted',
      occurredAt: 'May 24, 2026, 10:00',
      proof: orderAccepted,
      description: 'Accepted order hash is available for verification.',
    },
    {
      label: 'Delivery evidence submitted',
      occurredAt: 'May 24, 2026, 10:18',
      proof: deliveryEvidenceSubmitted,
      description: 'Delivery evidence metadata was recorded; anchoring is still pending.',
    },
    {
      label: 'Escrow created',
      occurredAt: 'May 24, 2026, 10:24',
      proof: escrowCreated,
      description: 'Escrow lifecycle metadata is proof-ready while anchoring is pending.',
    },
    {
      label: 'Shariah decision',
      occurredAt: 'May 24, 2026, 10:34',
      proof: shariahDecision,
      description: 'Base decision event remains recorded, but anchoring needs operator follow-up.',
    },
    {
      label: 'Export generated',
      occurredAt: 'May 24, 2026, 10:46',
      proof: exportGenerated,
      description: 'Export proof lookup depends on proof service availability.',
    },
  ];
}
