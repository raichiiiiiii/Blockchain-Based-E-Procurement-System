import type { AccessAuditEventRepository } from '../application/access-audit-event-repository.js';
import type { AccessAuditEvent } from '../application/access-audit-event.js';

function cloneAccessAuditEvent(event: AccessAuditEvent): AccessAuditEvent {
  return JSON.parse(JSON.stringify(event));
}

export class InMemoryAccessAuditEventRepository implements AccessAuditEventRepository {
  private readonly events: AccessAuditEvent[] = [];

  async save(event: AccessAuditEvent): Promise<AccessAuditEvent> {
    // Create a defensive copy to prevent external mutation
    const storedEvent = cloneAccessAuditEvent(event);
    this.events.push(storedEvent);
    // Return a separate clone to prevent mutations from affecting stored data
    return cloneAccessAuditEvent(storedEvent);
  }

  async list(): Promise<AccessAuditEvent[]> {
    // Return defensive copies to prevent external mutation
    return this.events.map(event => cloneAccessAuditEvent(event));
  }
}
