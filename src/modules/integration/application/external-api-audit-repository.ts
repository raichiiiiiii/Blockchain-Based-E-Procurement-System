export type ExternalApiAuditOutcome = 'accepted' | 'rejected';

export type ExternalApiAuditEvent = {
  eventId: string;
  occurredAt: string;
  clientId?: string;
  action: string;
  route: string;
  method: string;
  outcome: ExternalApiAuditOutcome;
  reason?: string;
  idempotencyKey?: string;
};

export type ExternalApiAuditRepository = {
  save(event: ExternalApiAuditEvent): Promise<void>;
  list(): Promise<ExternalApiAuditEvent[]>;
};
