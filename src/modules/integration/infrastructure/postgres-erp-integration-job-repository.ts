import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toRecord } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ErpIntegrationJobRepository } from '../application/erp-integration-job-repository.js';
import type { ErpIntegrationJob, ErpProfileType } from '../domain/erp-accounting.js';

type ErpIntegrationJobRow = {
  job_json: unknown;
};

function cloneJob(job: ErpIntegrationJob): ErpIntegrationJob {
  return JSON.parse(JSON.stringify(job)) as ErpIntegrationJob;
}

function toErpIntegrationJob(row: ErpIntegrationJobRow): ErpIntegrationJob {
  return cloneJob(toRecord(row.job_json) as unknown as ErpIntegrationJob);
}

export class PostgresErpIntegrationJobRepository implements ErpIntegrationJobRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(job: ErpIntegrationJob): Promise<ErpIntegrationJob> {
    await this.db.query(
      `
        INSERT INTO erp_integration_jobs (
          job_id,
          direction,
          profile_type,
          source_id,
          status,
          payload,
          mapping_errors,
          idempotency_key,
          created_at,
          claim_boundary,
          job_json
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8, $9, $10, $11::jsonb)
        ON CONFLICT (job_id)
        DO UPDATE SET
          direction = EXCLUDED.direction,
          profile_type = EXCLUDED.profile_type,
          source_id = EXCLUDED.source_id,
          status = EXCLUDED.status,
          payload = EXCLUDED.payload,
          mapping_errors = EXCLUDED.mapping_errors,
          idempotency_key = EXCLUDED.idempotency_key,
          created_at = EXCLUDED.created_at,
          claim_boundary = EXCLUDED.claim_boundary,
          job_json = EXCLUDED.job_json
      `,
      [
        job.jobId,
        job.direction,
        job.profileType,
        job.sourceId ?? null,
        job.status,
        job.payload ? JSON.stringify(job.payload) : null,
        JSON.stringify(job.mappingErrors),
        job.idempotencyKey ?? null,
        job.createdAt,
        job.claimBoundary,
        JSON.stringify(job),
      ],
    );

    return cloneJob(job);
  }

  async getJob(jobId: string): Promise<ErpIntegrationJob | null> {
    const result = await this.db.query<ErpIntegrationJobRow>(
      'SELECT job_json FROM erp_integration_jobs WHERE job_id = $1',
      [jobId],
    );

    return result.rows[0] ? toErpIntegrationJob(result.rows[0]) : null;
  }

  async getJobByIdempotencyKey(profileType: ErpProfileType, idempotencyKey: string): Promise<ErpIntegrationJob | null> {
    const result = await this.db.query<ErpIntegrationJobRow>(
      `
        SELECT job_json
        FROM erp_integration_jobs
        WHERE profile_type = $1
          AND idempotency_key = $2
        ORDER BY created_at ASC, job_id ASC
        LIMIT 1
      `,
      [profileType, idempotencyKey],
    );

    return result.rows[0] ? toErpIntegrationJob(result.rows[0]) : null;
  }
}
