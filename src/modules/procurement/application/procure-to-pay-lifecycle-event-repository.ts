import type { ProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event.js';

export interface ProcureToPayLifecycleEventRepository {
  save(event: ProcureToPayLifecycleEvent): Promise<ProcureToPayLifecycleEvent>;
  list(): Promise<ProcureToPayLifecycleEvent[]>;
}
