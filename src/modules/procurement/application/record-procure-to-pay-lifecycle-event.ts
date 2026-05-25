import type { ProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event.js';
import { createProcureToPayLifecycleEvent } from './procure-to-pay-lifecycle-event-builder.js';
import type { CreateProcureToPayLifecycleEventInput } from './procure-to-pay-lifecycle-event-builder.js';
import type { ProcureToPayLifecycleEventRepository } from './procure-to-pay-lifecycle-event-repository.js';
import {
  anchorProcureToPayLifecycleEvent,
  type AnchorProcureToPayLifecycleEventDependencies,
} from '../../blockchain/application/anchor-procure-to-pay-lifecycle-event.js';

export async function recordProcureToPayLifecycleEvent(
  repository: ProcureToPayLifecycleEventRepository | undefined,
  input: CreateProcureToPayLifecycleEventInput,
  anchoring?: AnchorProcureToPayLifecycleEventDependencies,
): Promise<ProcureToPayLifecycleEvent | null> {
  if (repository === undefined) {
    return null;
  }

  const event = createProcureToPayLifecycleEvent(input);
  const savedEvent = await repository.save(event);

  if (anchoring) {
    await anchorProcureToPayLifecycleEvent(savedEvent, anchoring);
  }

  return savedEvent;
}
