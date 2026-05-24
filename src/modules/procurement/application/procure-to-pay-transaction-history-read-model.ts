import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import type { ProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event.js';

export type GetProcureToPayTransactionHistoryInput = {
  caseId: string;
  correlationId?: string;
};

export type ProcureToPayTransactionHistory = {
  caseId: string;
  correlationId?: string;
  ordering: {
    primary: 'occurredAt';
    secondary: 'eventId';
    direction: 'ascending';
  };
  completeness: {
    status: 'complete' | 'partial' | 'unknown' | 'gapDetected';
    reason: string;
    message: string;
  };
  items: ProcureToPayLifecycleEvent[];
};

export async function getProcureToPayTransactionHistory(
  repository: ProcureToPayLifecycleEventRepository,
  input: GetProcureToPayTransactionHistoryInput
): Promise<ProcureToPayTransactionHistory> {
  // Validate required fields
  if (!input.caseId || input.caseId.trim() === '') {
    throw new Error('caseId is required and cannot be blank');
  }

  // Get all events from repository
  const allEvents = await repository.list();
  
  // Filter events by caseId
  let filteredEvents = allEvents.filter(event => event.caseId === input.caseId);
  
  // Optionally filter by correlationId if provided
  if (input.correlationId && input.correlationId.trim() !== '') {
    filteredEvents = filteredEvents.filter(event => event.correlationId === input.correlationId);
  }
  
  // Sort by occurredAt ascending, then by eventId ascending as tie-breaker
  const sortedEvents = filteredEvents.sort((a, b) => {
    // Primary sort by occurredAt
    const occurredAtComparison = a.occurredAt.localeCompare(b.occurredAt);
    if (occurredAtComparison !== 0) {
      return occurredAtComparison;
    }
    
    // Secondary sort by eventId as tie-breaker
    return a.eventId.localeCompare(b.eventId);
  });
  
  // Determine completeness status
  let completenessStatus: 'complete' | 'partial' | 'unknown' | 'gapDetected' = 'unknown';
  let completenessReason = 'completeness_not_proven';
  let completenessMessage = 'Available events are returned, but the repository cannot prove the sequence is complete.';
  
  if (sortedEvents.length === 0) {
    completenessStatus = 'unknown';
    completenessReason = 'no_events_recorded';
    completenessMessage = 'No events have been recorded for this case';
  }
  
  return {
    caseId: input.caseId,
    ...(input.correlationId && input.correlationId.trim() !== '' && { correlationId: input.correlationId }),
    ordering: {
      primary: 'occurredAt',
      secondary: 'eventId',
      direction: 'ascending'
    },
    completeness: {
      status: completenessStatus,
      reason: completenessReason,
      message: completenessMessage
    },
    items: sortedEvents
  };
}
