import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { 
  ProcureToPayLifecycleEvent, 
  ProcureToPayLifecycleStage, 
  ProcureToPayLifecycleOutcome 
} from './procure-to-pay-lifecycle-event.js';

export type { ProcureToPayLifecycleStage, ProcureToPayLifecycleOutcome };

export type CreateProcureToPayLifecycleEventInput = {
  requestId: string;
  correlationId: string;
  caseId: string;
  lifecycleStage: ProcureToPayLifecycleStage;
  eventType: string;
  actorUserId: string;
  targetType: string;
  targetId: string;
  outcome: ProcureToPayLifecycleOutcome;
  reason?: string;
  metadata?: Record<string, unknown>;
  occurredAt?: string;
  recordedAt?: string;
  eventId?: string;
  previousEventHash?: string;
  sourcePayloadRef?: string;
  sourceRecordRef?: string;
  anchorRef?: string;
};

// Define allowed event types per lifecycle stage
const ALLOWED_EVENT_TYPES: Record<ProcureToPayLifecycleStage, string[]> = {
  purchaseOrder: [
    'requisitionCreated',
    'requisitionApproved',
    'rfqIssued',
    'quotationSubmitted',
    'awardSelected',
    'purchaseOrderGenerated',
    'purchaseOrderCreated',
    'purchaseOrderAccepted',
    'purchaseOrderRejected',
    'purchaseOrderModified'
  ],
  delivery: [
    'deliveryRecorded',
    'deliveryEvidenceSubmitted',
    'deliveryProofSubmitted',
    'logisticsEventRecorded',
    'deliveryAccepted',
    'deliveryRejected',
    'deliveryModified'
  ],
  invoice: [
    'invoiceIssued',
    'invoiceMatchPassed',
    'invoiceMatchFailed',
    'invoicePaymentApproved',
    'invoiceApproved',
    'invoiceRejected',
    'invoicePaid'
  ],
  settlement: [
    'settlementInitiated',
    'settlementCompleted',
    'settlementFailed',
    'settlementReversed'
  ],
  escrow: [
    'escrowCreated',
    'escrowFunded',
    'escrowReleaseRequested',
    'escrowReleaseApproved',
    'escrowReleaseRejected',
    'escrowHeld',
    'escrowDisputeOpened',
    'escrowArbitrationDecisionRecorded',
    'escrowRefunded',
    'escrowCancelled',
    'escrowExpired',
    'escrowSettlementInstructionReady'
  ]
};

const ALLOWED_OUTCOMES: readonly ProcureToPayLifecycleOutcome[] = [
  'success',
  'rejected',
  'voided',
  'failed'
];

function isProcureToPayLifecycleStage(value: string): value is ProcureToPayLifecycleStage {
  return Object.prototype.hasOwnProperty.call(ALLOWED_EVENT_TYPES, value);
}

function isProcureToPayLifecycleOutcome(value: string): value is ProcureToPayLifecycleOutcome {
  return ALLOWED_OUTCOMES.includes(value as ProcureToPayLifecycleOutcome);
}

export class ProcureToPayLifecycleValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProcureToPayLifecycleValidationError';
  }
}

function validateInput(input: CreateProcureToPayLifecycleEventInput): void {
  if (!input.requestId || input.requestId.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('requestId is required and cannot be blank');
  }
  
  if (!input.actorUserId || input.actorUserId.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('actorUserId is required and cannot be blank');
  }
  
  if (!input.correlationId || input.correlationId.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('correlationId is required and cannot be blank');
  }
  
  if (!input.caseId || input.caseId.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('caseId is required and cannot be blank');
  }

  if (!isProcureToPayLifecycleStage(input.lifecycleStage)) {
    throw new ProcureToPayLifecycleValidationError(
      `lifecycleStage '${input.lifecycleStage}' is not valid`
    );
  }

  if (!input.eventType || input.eventType.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('eventType is required and cannot be blank');
  }

  if (!isProcureToPayLifecycleOutcome(input.outcome)) {
    throw new ProcureToPayLifecycleValidationError(`outcome '${input.outcome}' is not valid`);
  }
  
  if (!Object.values(ALLOWED_EVENT_TYPES).some(events => events.includes(input.eventType))) {
    throw new ProcureToPayLifecycleValidationError(`eventType '${input.eventType}' is not valid`);
  }
  
  if (!ALLOWED_EVENT_TYPES[input.lifecycleStage].includes(input.eventType)) {
    throw new ProcureToPayLifecycleValidationError(
      `eventType '${input.eventType}' is not valid for lifecycleStage '${input.lifecycleStage}'`
    );
  }
  
  if (!input.targetType || input.targetType.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('targetType is required and cannot be blank');
  }
  
  if (!input.targetId || input.targetId.trim() === '') {
    throw new ProcureToPayLifecycleValidationError('targetId is required and cannot be blank');
  }
}

export function canonicalizeProcureToPayValue(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalizeProcureToPayValue(item));
    return '[' + items.join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    const value = (obj as Record<string, unknown>)[key];
    // Skip undefined values
    if (value === undefined) {
      return undefined;
    }
    return JSON.stringify(key) + ':' + canonicalizeProcureToPayValue(value);
  }).filter(pair => pair !== undefined);

  return '{' + pairs.join(',') + '}';
}

function computePayloadHash(event: Omit<ProcureToPayLifecycleEvent, 'eventId' | 'immutableReference'> & { 
  immutableReference: Omit<ProcureToPayLifecycleEvent['immutableReference'], 'payloadHash' | 'previousEventHash' | 'sourcePayloadRef' | 'sourceRecordRef' | 'anchorRef'> 
}): string {
  const canonicalJson = canonicalizeProcureToPayValue(event);
  return createHash('sha256').update(canonicalJson).digest('hex');
}

export function createProcureToPayLifecycleEvent(
  input: CreateProcureToPayLifecycleEventInput
): ProcureToPayLifecycleEvent {
  validateInput(input);
  
  const eventId = input.eventId ?? randomUUID();
  const occurredAt = input.occurredAt ?? new Date().toISOString();
  const recordedAt = input.recordedAt ?? new Date().toISOString();

  const eventForHashing = {
    schemaVersion: 'procure-to-pay-lifecycle-event.v1' as const,
    occurredAt,
    recordedAt,
    requestId: input.requestId,
    correlationId: input.correlationId,
    caseId: input.caseId,
    lifecycleStage: input.lifecycleStage,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    actorSource: 'actorContext' as const,
    targetType: input.targetType,
    targetId: input.targetId,
    outcome: input.outcome,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    immutableReference: {
      canonicalization: 'json-stable-v1' as const
    }
  };

  const payloadHash = computePayloadHash(eventForHashing);

  return {
    eventId,
    schemaVersion: 'procure-to-pay-lifecycle-event.v1',
    occurredAt,
    recordedAt,
    requestId: input.requestId,
    correlationId: input.correlationId,
    caseId: input.caseId,
    lifecycleStage: input.lifecycleStage,
    eventType: input.eventType,
    actorUserId: input.actorUserId,
    actorSource: 'actorContext',
    targetType: input.targetType,
    targetId: input.targetId,
    outcome: input.outcome,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(input.metadata !== undefined && { metadata: input.metadata }),
    immutableReference: {
      payloadHash,
      canonicalization: 'json-stable-v1',
      ...(input.previousEventHash !== undefined && {
        previousEventHash: input.previousEventHash
      }),
      ...(input.sourcePayloadRef !== undefined && {
        sourcePayloadRef: input.sourcePayloadRef
      }),
      ...(input.sourceRecordRef !== undefined && {
        sourceRecordRef: input.sourceRecordRef
      }),
      ...(input.anchorRef !== undefined && {
        anchorRef: input.anchorRef
      })
    }
  };
}
