import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import { recordProcureToPayLifecycleEvent } from './record-procure-to-pay-lifecycle-event.js';
import type { 
  ProcureToPayLifecycleStage, 
  ProcureToPayLifecycleOutcome 
} from './procure-to-pay-lifecycle-event.js';
import type { AnchorProcureToPayLifecycleEventDependencies } from '../../blockchain/application/anchor-procure-to-pay-lifecycle-event.js';

export type ProcureToPaySource = 'sourceToAward' | 'purchaseOrder' | 'delivery' | 'invoice' | 'settlement' | 'escrow';

export type ProcureToPaySourceAction = 
  // Source-to-award actions
  | 'requisitionCreated'
  | 'requisitionApproved'
  | 'rfqIssued'
  | 'quotationSubmitted'
  | 'awardSelected'
  | 'purchaseOrderGenerated'
  // Purchase Order actions
  | 'purchaseOrderCreated'
  | 'purchaseOrderAccepted'
  | 'purchaseOrderRejected'
  | 'purchaseOrderModified'
  // Delivery actions
  | 'deliveryRecorded'
  | 'deliveryEvidenceSubmitted'
  | 'deliveryProofSubmitted'
  | 'logisticsEventRecorded'
  | 'deliveryAccepted'
  | 'deliveryRejected'
  | 'deliveryModified'
  // Invoice actions
  | 'invoiceIssued'
  | 'invoiceMatchPassed'
  | 'invoiceMatchFailed'
  | 'invoicePaymentApproved'
  | 'invoiceApproved'
  | 'invoiceRejected'
  | 'invoicePaid'
  // Settlement actions
  | 'settlementInitiated'
  | 'settlementCompleted'
  | 'settlementFailed'
  | 'settlementReversed'
  // Escrow actions
  | 'escrowCreated';

export type RecordProcureToPaySourceEventInput = {
  requestId: string;
  actorUserId: string;
  correlationId: string;
  caseId: string;
  sourceId: string;
  sourceAction: ProcureToPaySourceAction;
  outcome: ProcureToPayLifecycleOutcome;
  occurredAt?: string;
  recordedAt?: string;
  previousEventHash?: string;
  sourcePayloadRef?: string;
  sourceRecordRef?: string;
  anchorRef?: string;
  metadata?: Record<string, unknown>;
};

export class ProcureToPayLifecycleSourceMappingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcureToPayLifecycleSourceMappingError';
  }
}

const SOURCE_MAPPING: Record<ProcureToPaySourceAction, { 
  source: ProcureToPaySource; 
  stage: ProcureToPayLifecycleStage 
}> = {
  // Source-to-award actions
  'requisitionCreated': { source: 'sourceToAward', stage: 'purchaseOrder' },
  'requisitionApproved': { source: 'sourceToAward', stage: 'purchaseOrder' },
  'rfqIssued': { source: 'sourceToAward', stage: 'purchaseOrder' },
  'quotationSubmitted': { source: 'sourceToAward', stage: 'purchaseOrder' },
  'awardSelected': { source: 'sourceToAward', stage: 'purchaseOrder' },
  'purchaseOrderGenerated': { source: 'sourceToAward', stage: 'purchaseOrder' },
  // Purchase Order actions
  'purchaseOrderCreated': { source: 'purchaseOrder', stage: 'purchaseOrder' },
  'purchaseOrderAccepted': { source: 'purchaseOrder', stage: 'purchaseOrder' },
  'purchaseOrderRejected': { source: 'purchaseOrder', stage: 'purchaseOrder' },
  'purchaseOrderModified': { source: 'purchaseOrder', stage: 'purchaseOrder' },
  // Delivery actions
  'deliveryRecorded': { source: 'delivery', stage: 'delivery' },
  'deliveryEvidenceSubmitted': { source: 'delivery', stage: 'delivery' },
  'deliveryProofSubmitted': { source: 'delivery', stage: 'delivery' },
  'logisticsEventRecorded': { source: 'delivery', stage: 'delivery' },
  'deliveryAccepted': { source: 'delivery', stage: 'delivery' },
  'deliveryRejected': { source: 'delivery', stage: 'delivery' },
  'deliveryModified': { source: 'delivery', stage: 'delivery' },
  // Invoice actions
  'invoiceIssued': { source: 'invoice', stage: 'invoice' },
  'invoiceMatchPassed': { source: 'invoice', stage: 'invoice' },
  'invoiceMatchFailed': { source: 'invoice', stage: 'invoice' },
  'invoicePaymentApproved': { source: 'invoice', stage: 'invoice' },
  'invoiceApproved': { source: 'invoice', stage: 'invoice' },
  'invoiceRejected': { source: 'invoice', stage: 'invoice' },
  'invoicePaid': { source: 'invoice', stage: 'invoice' },
  // Settlement actions
  'settlementInitiated': { source: 'settlement', stage: 'settlement' },
  'settlementCompleted': { source: 'settlement', stage: 'settlement' },
  'settlementFailed': { source: 'settlement', stage: 'settlement' },
  'settlementReversed': { source: 'settlement', stage: 'settlement' },
  // Escrow actions
  'escrowCreated': { source: 'escrow', stage: 'escrow' }
};

export async function recordProcureToPaySourceEvent(
  repository: ProcureToPayLifecycleEventRepository | undefined,
  input: RecordProcureToPaySourceEventInput,
  anchoring?: AnchorProcureToPayLifecycleEventDependencies,
): Promise<ReturnType<typeof recordProcureToPayLifecycleEvent>> {
  // Validate required fields
  if (!input.requestId || input.requestId.trim() === '') {
    throw new ProcureToPayLifecycleSourceMappingError('requestId is required and cannot be blank');
  }
  
  if (!input.actorUserId || input.actorUserId.trim() === '') {
    throw new ProcureToPayLifecycleSourceMappingError('actorUserId is required and cannot be blank');
  }
  
  
  if (!input.sourceId || input.sourceId.trim() === '') {
    throw new ProcureToPayLifecycleSourceMappingError('sourceId is required and cannot be blank');
  }
  
  // Check if the source action is supported
  const mapping = SOURCE_MAPPING[input.sourceAction];
  if (!mapping) {
    throw new ProcureToPayLifecycleSourceMappingError(
      `Unsupported source action: ${input.sourceAction}`
    );
  }

  // Map source input to lifecycle event input
  const mappedInput = {
    requestId: input.requestId,
    correlationId: input.correlationId,
    caseId: input.caseId,
    lifecycleStage: mapping.stage,
    eventType: input.sourceAction,
    actorUserId: input.actorUserId,
    targetType: mapping.source,
    targetId: input.sourceId,
    outcome: input.outcome,
    ...(input.occurredAt !== undefined && { occurredAt: input.occurredAt }),
    ...(input.recordedAt !== undefined && { recordedAt: input.recordedAt }),
    ...(input.previousEventHash !== undefined && { previousEventHash: input.previousEventHash }),
    ...(input.sourcePayloadRef !== undefined && { sourcePayloadRef: input.sourcePayloadRef }),
    ...(input.sourceRecordRef !== undefined && { sourceRecordRef: input.sourceRecordRef }),
    ...(input.anchorRef !== undefined && { anchorRef: input.anchorRef }),
    ...(input.metadata !== undefined && { metadata: input.metadata })
  };

  // Delegate to the existing lifecycle event recording function
  return recordProcureToPayLifecycleEvent(repository, mappedInput, anchoring);
}
