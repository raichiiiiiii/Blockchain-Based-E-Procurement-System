import type { ProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event.js';
import { createProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event-builder.js';
import type { CreateProcureToPayLifecycleEventInput } from './procure-to-pay-lifecycle-event-builder.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';

export async function recordProcureToPayLifecycleEvent(
  repository: ProcureToPayLifecycleEventRepository | undefined,
  input: CreateProcureToPayLifecycleEventInput
): Promise<ProcureToPayLifecycleEvent | null> {
  if (repository === undefined) {
    return null;
  }

  const event = createProcureToPayLifecycleEvent(input);
  return repository.save(event);
}
