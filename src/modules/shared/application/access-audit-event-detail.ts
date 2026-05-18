import type { AccessAuditEventRepository } from './access-audit-event-repository.js';
import type { AccessAuditEvent } from './access-audit-event.js';

/**
 * Retrieves a single access audit event by its eventId.
 *
 * @param repository - The access audit event repository to query
 * @param eventId - The unique identifier of the event to retrieve
 * @returns The matching AccessAuditEvent if found, null otherwise
 */
export async function getAccessAuditEventDetail(
  repository: AccessAuditEventRepository,
  eventId: string
): Promise<AccessAuditEvent | null> {
  const events = await repository.list();
  const event = events.find(e => e.eventId === eventId);
  return event ?? null;
}
