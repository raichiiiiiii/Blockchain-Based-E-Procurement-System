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

export type ProofTimelineDefinition = {
  eventId: string;
  localFallbackEventId: string;
  label: string;
  occurredAt: string;
  description: string;
};

export const proofTimelineDefinitions: ProofTimelineDefinition[] = [
  {
    eventId: 'demo-ptp-event-001',
    localFallbackEventId: 'audit-event-not-anchored',
    label: 'Order accepted',
    occurredAt: 'May 24, 2026, 10:00',
    description: 'Accepted order metadata exists off-chain and carries proof metadata when anchoring is available.',
  },
  {
    eventId: 'demo-delivery-event-001',
    localFallbackEventId: 'audit-event-pending',
    label: 'Delivery evidence submitted',
    occurredAt: 'May 24, 2026, 10:18',
    description: 'Delivery evidence metadata was recorded; raw delivery documents are not shown in proof surfaces.',
  },
  {
    eventId: 'demo-escrow-event-001',
    localFallbackEventId: 'escrow-created-pending',
    label: 'Escrow created',
    occurredAt: 'May 24, 2026, 10:24',
    description: 'Escrow lifecycle metadata is proof-ready while commercial terms remain off-chain.',
  },
  {
    eventId: 'demo-shariah-decision-001',
    localFallbackEventId: 'audit-event-failed',
    label: 'Shariah decision',
    occurredAt: 'May 24, 2026, 10:34',
    description: 'Shariah decision proof status is shown only when proof metadata exists.',
  },
  {
    eventId: 'demo-pls-contract-001',
    localFallbackEventId: 'audit-event-not-found',
    label: 'PLS contract status',
    occurredAt: 'May 24, 2026, 10:40',
    description: 'PLS proof coverage is limited to hash/status metadata and does not imply payment execution.',
  },
  {
    eventId: 'demo-export-event-001',
    localFallbackEventId: 'audit-event-unavailable',
    label: 'Export generated',
    occurredAt: 'May 24, 2026, 10:46',
    description: 'Export proof lookup depends on proof service availability and signed manifest metadata.',
  },
];

export function buildProofTimelineItems(proofs: BlockchainProofRecord[]): DemoProofTimelineItem[] {
  const proofByEventId = new Map(proofs.map(proof => [proof.eventId, proof]));

  return proofTimelineDefinitions.map(definition => ({
    label: definition.label,
    occurredAt: definition.occurredAt,
    proof: proofByEventId.get(definition.eventId) ?? {
      eventId: definition.eventId,
      anchorStatus: 'notAnchored',
      source: 'backend',
    },
    description: definition.description,
  }));
}

export function getDemoProofTimelineItems(): DemoProofTimelineItem[] {
  const localProofs = getLocalDemoProofRecords(proofTimelineDefinitions.map(definition => definition.localFallbackEventId));

  return proofTimelineDefinitions.map((definition, index) => ({
    label: definition.label,
    occurredAt: definition.occurredAt,
    proof: localProofs[index],
    description: definition.description,
  }));
}
