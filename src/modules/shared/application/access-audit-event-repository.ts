import type { AccessAuditEvent } from './access-audit-event.js';

export interface AccessAuditEventRepository {
  save(event: AccessAuditEvent): Promise<AccessAuditEvent>;
  list(): Promise<AccessAuditEvent[]>;
}
