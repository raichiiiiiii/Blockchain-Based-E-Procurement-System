export type ExternalIdempotencyRecord = {
  clientId: string;
  route: string;
  idempotencyKey: string;
  requestId: string;
  createdAt: string;
};

export type ExternalIdempotencyRepository = {
  find(input: {
    clientId: string;
    route: string;
    idempotencyKey: string;
  }): Promise<ExternalIdempotencyRecord | null>;
  save(record: ExternalIdempotencyRecord): Promise<void>;
};
