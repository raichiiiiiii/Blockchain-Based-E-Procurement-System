import type { ExternalIdempotencyRecord, ExternalIdempotencyRepository } from '../application/external-idempotency-repository.js';

function keyFor(input: { clientId: string; route: string; idempotencyKey: string }): string {
  return `${input.clientId}:${input.route}:${input.idempotencyKey}`;
}

export class InMemoryExternalIdempotencyRepository implements ExternalIdempotencyRepository {
  private readonly records = new Map<string, ExternalIdempotencyRecord>();

  async find(input: {
    clientId: string;
    route: string;
    idempotencyKey: string;
  }): Promise<ExternalIdempotencyRecord | null> {
    const record = this.records.get(keyFor(input));
    return record ? { ...record } : null;
  }

  async save(record: ExternalIdempotencyRecord): Promise<void> {
    this.records.set(keyFor(record), { ...record });
  }
}
