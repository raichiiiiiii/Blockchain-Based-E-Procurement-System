import type { AccessAuditEvent } from './access-audit-event.js';
import { createAccessAuditEvent } from './access-audit-event-builder.js';
import type { CreateAccessAuditEventInput } from './access-audit-event-builder.js';
import type { AccessAuditEventRepository } from './access-audit-event-repository.js';

export async function recordAccessAuditEvent(
  repository: AccessAuditEventRepository | undefined,
  input: CreateAccessAuditEventInput
): Promise<AccessAuditEvent | null> {
  if (repository === undefined) {
    return null;
  }

  const event = createAccessAuditEvent(input);
  return repository.save(event);
}
