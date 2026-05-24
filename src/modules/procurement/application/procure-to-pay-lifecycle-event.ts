export type ProcureToPayLifecycleStage = 'purchaseOrder' | 'delivery' | 'invoice' | 'settlement';

export type ProcureToPayLifecycleOutcome = 'success' | 'rejected' | 'voided' | 'failed';

export type ProcureToPayLifecycleEvent = {
  eventId: string;
  schemaVersion: 'procure-to-pay-lifecycle-event.v1';
  occurredAt: string;
  recordedAt: string;
  requestId: string;
  correlationId: string;
  caseId: string;
  lifecycleStage: ProcureToPayLifecycleStage;
  eventType: string;
  actorUserId: string;
  actorSource: 'actorContext';
  targetType: string;
  targetId: string;
  outcome: ProcureToPayLifecycleOutcome;
  reason?: string;
  immutableReference: {
    payloadHash: string;
    canonicalization: 'json-stable-v1';
    previousEventHash?: string;
    sourcePayloadRef?: string;
    sourceRecordRef?: string;
    anchorRef?: string;
  };
  metadata?: Record<string, unknown>;
};
