import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import type { ProcureToPayLifecycleEvent } from '../application/procure-to-pay-lifecycle-event.js';

export type ProcureToPayLifecyclePersistenceErrorReason =
  | 'duplicateEventId'
  | 'duplicatePayloadHash'
  | 'previousEventHashNotFound'
  | 'previousEventHashCorrelationMismatch';

export class ProcureToPayLifecyclePersistenceError extends Error {
  constructor(
    public readonly reason: ProcureToPayLifecyclePersistenceErrorReason,
    message: string
  ) {
    super(message);
    this.name = 'ProcureToPayLifecyclePersistenceError';
  }
}

function cloneProcureToPayLifecycleEvent(
  event: ProcureToPayLifecycleEvent
): ProcureToPayLifecycleEvent {
  return JSON.parse(JSON.stringify(event)) as ProcureToPayLifecycleEvent;
}

export class InMemoryProcureToPayLifecycleEventRepository
  implements ProcureToPayLifecycleEventRepository
{
  private readonly events: ProcureToPayLifecycleEvent[] = [];

  async save(event: ProcureToPayLifecycleEvent): Promise<ProcureToPayLifecycleEvent> {
    const duplicateEventId = this.events.some(
      storedEvent => storedEvent.eventId === event.eventId
    );

    if (duplicateEventId) {
      throw new ProcureToPayLifecyclePersistenceError(
        'duplicateEventId',
        `Lifecycle event '${event.eventId}' already exists`
      );
    }

    const duplicatePayloadHash = this.events.some(
      storedEvent =>
        storedEvent.immutableReference.payloadHash ===
        event.immutableReference.payloadHash
    );

    if (duplicatePayloadHash) {
      throw new ProcureToPayLifecyclePersistenceError(
        'duplicatePayloadHash',
        `Lifecycle event payload hash '${event.immutableReference.payloadHash}' already exists`
      );
    }

    const previousEventHash = event.immutableReference.previousEventHash;

    if (previousEventHash !== undefined) {
      const previousEvent = this.events.find(
        storedEvent => storedEvent.immutableReference.payloadHash === previousEventHash
      );

      if (previousEvent === undefined) {
        throw new ProcureToPayLifecyclePersistenceError(
          'previousEventHashNotFound',
          `Previous event hash '${previousEventHash}' was not found`
        );
      }

      const sameCorrelation =
        previousEvent.caseId === event.caseId &&
        previousEvent.correlationId === event.correlationId;

      if (!sameCorrelation) {
        throw new ProcureToPayLifecyclePersistenceError(
          'previousEventHashCorrelationMismatch',
          'Previous event hash belongs to a different caseId or correlationId'
        );
      }
    }

    const storedEvent = cloneProcureToPayLifecycleEvent(event);
    this.events.push(storedEvent);

    return cloneProcureToPayLifecycleEvent(storedEvent);
  }

  async list(): Promise<ProcureToPayLifecycleEvent[]> {
    return this.events.map(event => cloneProcureToPayLifecycleEvent(event));
  }
}
