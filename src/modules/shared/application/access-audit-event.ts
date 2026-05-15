export type AccessAuditOutcome =
  | 'success'
  | 'forbidden'
  | 'validationError'
  | 'notFound'
  | 'conflict'
  | 'error';

export type AccessAuditModule =
  | 'membership'
  | 'access-control'
  | 'shariah-review';

export type AccessAuditActorSource = 'actorContext';

export type AccessAuditCanonicalization = 'json-stable-v1';

export type AccessAuditEvent = {
  eventId: string;
  schemaVersion: 'access-audit-event.v1';
  occurredAt: string;
  requestId: string;
  actorUserId: string;
  actorSource: AccessAuditActorSource;
  action: string;
  targetType: string;
  targetId: string;
  outcome: AccessAuditOutcome;
  reason?: string;
  route?: string;
  method?: string;
  module: AccessAuditModule;
  evidence: {
    payloadHash: string;
    canonicalization: AccessAuditCanonicalization;
    previousEventHash?: string;
  };
};
