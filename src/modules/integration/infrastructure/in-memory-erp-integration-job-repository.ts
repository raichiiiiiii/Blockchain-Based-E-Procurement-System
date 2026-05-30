import type { ErpIntegrationJobRepository } from '../application/erp-integration-job-repository.js';
import type { ErpIntegrationJob, ErpProfileType } from '../domain/erp-accounting.js';

function cloneJob(job: ErpIntegrationJob): ErpIntegrationJob {
  return JSON.parse(JSON.stringify(job)) as ErpIntegrationJob;
}

export class InMemoryErpIntegrationJobRepository implements ErpIntegrationJobRepository {
  private readonly jobs = new Map<string, ErpIntegrationJob>();
  private readonly idempotency = new Map<string, string>();

  async save(job: ErpIntegrationJob): Promise<ErpIntegrationJob> {
    this.jobs.set(job.jobId, cloneJob(job));

    if (job.idempotencyKey) {
      this.idempotency.set(`${job.profileType}:${job.idempotencyKey}`, job.jobId);
    }

    return cloneJob(job);
  }

  async getJob(jobId: string): Promise<ErpIntegrationJob | null> {
    const job = this.jobs.get(jobId);
    return job ? cloneJob(job) : null;
  }

  async getJobByIdempotencyKey(profileType: ErpProfileType, idempotencyKey: string): Promise<ErpIntegrationJob | null> {
    const jobId = this.idempotency.get(`${profileType}:${idempotencyKey}`);
    if (!jobId) {
      return null;
    }

    return this.getJob(jobId);
  }
}
