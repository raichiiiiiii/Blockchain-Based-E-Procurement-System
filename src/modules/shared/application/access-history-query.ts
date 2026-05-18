import type { AccessAuditEventRepository } from './access-audit-event-repository.js';
import type { AccessAuditEvent, AccessAuditOutcome } from './access-audit-event.js';

export type AccessHistoryQuery = {
  actorUserId?: string;
  targetType?: string;
  targetId?: string;
  action?: string;
  outcome?: AccessAuditOutcome;
  occurredFrom?: string;
  occurredTo?: string;
  module?: string;
  route?: string;
  method?: string;
};

function matchesFilter(event: AccessAuditEvent, query: AccessHistoryQuery): boolean {
  if (query.actorUserId !== undefined && event.actorUserId !== query.actorUserId) {
    return false;
  }

  if (query.targetType !== undefined && event.targetType !== query.targetType) {
    return false;
  }

  if (query.targetId !== undefined && event.targetId !== query.targetId) {
    return false;
  }

  if (query.action !== undefined && event.action !== query.action) {
    return false;
  }

  if (query.outcome !== undefined && event.outcome !== query.outcome) {
    return false;
  }

  if (query.module !== undefined && event.module !== query.module) {
    return false;
  }

  if (query.route !== undefined && event.route !== query.route) {
    return false;
  }

  if (query.method !== undefined && event.method !== query.method) {
    return false;
  }

  if (query.occurredFrom !== undefined) {
    // Compare as strings since they're ISO date strings
    if (event.occurredAt < query.occurredFrom) {
      return false;
    }
  }

  if (query.occurredTo !== undefined) {
    // Compare as strings since they're ISO date strings
    if (event.occurredAt > query.occurredTo) {
      return false;
    }
  }

  return true;
}

export async function queryAccessHistory(
  repository: AccessAuditEventRepository,
  query: AccessHistoryQuery
): Promise<AccessAuditEvent[]> {
  const allEvents = await repository.list();
  const filteredEvents = allEvents.filter(event => matchesFilter(event, query));

  // Sort by occurredAt ascending, then eventId ascending
  filteredEvents.sort((a, b) => {
    if (a.occurredAt !== b.occurredAt) {
      return a.occurredAt.localeCompare(b.occurredAt);
    }
    return a.eventId.localeCompare(b.eventId);
  });

  return filteredEvents;
}
