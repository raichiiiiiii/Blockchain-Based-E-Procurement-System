import { createHash } from 'node:crypto';
import { randomUUID } from 'node:crypto';
import type { AccessAuditEvent, AccessAuditOutcome, AccessAuditModule, AccessAuditActorSource, AccessAuditCanonicalization } from './access-audit-event.js';

export type { AccessAuditOutcome, AccessAuditModule, AccessAuditActorSource, AccessAuditCanonicalization };

export type CreateAccessAuditEventInput = {
  requestId: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: AccessAuditOutcome;
  module: AccessAuditModule;
  reason?: string;
  route?: string;
  method?: string;
  occurredAt?: string;
  eventId?: string;
  previousEventHash?: string;
};

export function canonicalizeAccessAuditValue(obj: any): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const items = obj.map(item => canonicalizeAccessAuditValue(item));
    return '[' + items.join(',') + ']';
  }

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => {
    const value = obj[key];
    // Skip undefined values
    if (value === undefined) {
      return undefined;
    }
    return JSON.stringify(key) + ':' + canonicalizeAccessAuditValue(value);
  }).filter(pair => pair !== undefined);

  return '{' + pairs.join(',') + '}';
}

function computePayloadHash(event: Omit<AccessAuditEvent, 'eventId' | 'evidence'> & { evidence: Omit<AccessAuditEvent['evidence'], 'payloadHash' | 'previousEventHash'> }): string {
  const canonicalJson = canonicalizeAccessAuditValue(event);
  return createHash('sha256').update(canonicalJson).digest('hex');
}

export function createAccessAuditEvent(
  input: CreateAccessAuditEventInput
): AccessAuditEvent {
  const eventId = input.eventId ?? randomUUID();
  const occurredAt = input.occurredAt ?? new Date().toISOString();

  const eventForHashing = {
    schemaVersion: 'access-audit-event.v1' as const,
    occurredAt,
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    actorSource: 'actorContext' as const,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    outcome: input.outcome,
    module: input.module,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(input.route !== undefined && { route: input.route }),
    ...(input.method !== undefined && { method: input.method }),
    evidence: {
      canonicalization: 'json-stable-v1' as const
    }
  };

  const payloadHash = computePayloadHash(eventForHashing);

  return {
    eventId,
    schemaVersion: 'access-audit-event.v1',
    occurredAt,
    requestId: input.requestId,
    actorUserId: input.actorUserId,
    actorSource: 'actorContext',
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    outcome: input.outcome,
    module: input.module,
    ...(input.reason !== undefined && { reason: input.reason }),
    ...(input.route !== undefined && { route: input.route }),
    ...(input.method !== undefined && { method: input.method }),
    evidence: {
      payloadHash,
      canonicalization: 'json-stable-v1',
      ...(input.previousEventHash !== undefined && {
        previousEventHash: input.previousEventHash
      })
    }
  };
}
