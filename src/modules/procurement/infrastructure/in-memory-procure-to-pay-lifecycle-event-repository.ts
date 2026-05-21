import type { ProcureToPayLifecycleEventRepository } from '../application/procure-to-pay-lifecycle-event-repository.js';
import type { ProcureToPayLifecycleEvent } from '../application/procure-to-pay-lifecycle-event.js';

function cloneProcureToPayLifecycleEvent(event: ProcureToPayLifecycleEvent): ProcureToPayLifecycleEvent {
  return JSON.parse(JSON.stringify(event));
}

export class InMemoryProcureToPayLifecycleEventRepository implements ProcureToPayLifecycleEventRepository {
  private readonly events: ProcureToPayLifecycleEvent[] = [];

  async save(event: ProcureToPayLifecycleEvent): Promise<ProcureToPayLifecycleEvent> {
    // Create a defensive copy to prevent external mutation
    const storedEvent = cloneProcureToPayLifecycleEvent(event);
    this.events.push(storedEvent);
    // Return a separate clone to prevent mutations from affecting stored data
    return cloneProcureToPayLifecycleEvent(storedEvent);
  }

  async list(): Promise<ProcureToPayLifecycleEvent[]> {
    // Return defensive copies to prevent external mutation
    return this.events.map(event => cloneProcureToPayLifecycleEvent(event));
  }
}
