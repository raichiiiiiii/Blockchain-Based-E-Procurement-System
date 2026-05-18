import type { AccessAuditEventRepository } from './access-audit-event-repository.js';
import type { AccessAuditEvent } from './access-audit-event.js';
import { queryAccessHistory } from './access-history-query.js';

export type AccessAuditEventSequenceScope =
  | {
      type: 'actor';
      actorUserId: string;
      occurredFrom?: string;
      occurredTo?: string;
    }
  | {
      type: 'target';
      targetType: string;
      targetId: string;
      occurredFrom?: string;
      occurredTo?: string;
    };

export type AccessAuditEventSequenceCompleteness = {
  status: 'complete' | 'partial' | 'unknown';
  reason: string;
  message: string;
};

export type AccessAuditEventSequenceResult = {
  scope: AccessAuditEventSequenceScope;
  ordering: {
    primary: 'occurredAt';
    secondary: 'eventId';
    direction: 'ascending';
  };
  completeness: AccessAuditEventSequenceCompleteness;
  items: AccessAuditEvent[];
};

/**
 * Retrieves a sequence of access audit events related to an actor or target.
 *
 * @param repository - The access audit event repository to query
 * @param scope - The scope defining which events to retrieve (by actor or target)
 * @returns A sequence result containing the matching events and metadata
 */
export async function getAccessAuditEventSequence(
  repository: AccessAuditEventRepository,
  scope: AccessAuditEventSequenceScope
): Promise<AccessAuditEventSequenceResult> {
  // Build query based on scope type
  const query = {
    actorUserId: scope.type === 'actor' ? scope.actorUserId : undefined,
    targetType: scope.type === 'target' ? scope.targetType : undefined,
    targetId: scope.type === 'target' ? scope.targetId : undefined,
    occurredFrom: scope.occurredFrom,
    occurredTo: scope.occurredTo
  };

  // Use existing queryAccessHistory function to get filtered and sorted events
  const items = await queryAccessHistory(repository, query);

  // Return result with proper metadata
  return {
    scope,
    ordering: {
      primary: 'occurredAt',
      secondary: 'eventId',
      direction: 'ascending'
    },
    completeness: {
      status: 'unknown',
      reason: 'completeness_not_proven',
      message: 'Available events are returned, but the repository cannot prove the sequence is complete.'
    },
    items
  };
}
