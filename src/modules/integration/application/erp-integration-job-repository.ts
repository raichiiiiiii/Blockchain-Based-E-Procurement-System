import type { ErpIntegrationJob, ErpProfileType } from '../domain/erp-accounting.js';

export interface ErpIntegrationJobRepository {
  save(job: ErpIntegrationJob): Promise<ErpIntegrationJob>;
  getJob(jobId: string): Promise<ErpIntegrationJob | null>;
  getJobByIdempotencyKey(profileType: ErpProfileType, idempotencyKey: string): Promise<ErpIntegrationJob | null>;
}
