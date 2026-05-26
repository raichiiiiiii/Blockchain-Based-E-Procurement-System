import type { ExternalApiAuditEvent, ExternalApiAuditRepository } from '../application/external-api-audit-repository.js';

export class InMemoryExternalApiAuditRepository implements ExternalApiAuditRepository {
  private readonly events: ExternalApiAuditEvent[] = [];

  async save(event: ExternalApiAuditEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async list(): Promise<ExternalApiAuditEvent[]> {
    return this.events.map(event => ({ ...event }));
  }
}
