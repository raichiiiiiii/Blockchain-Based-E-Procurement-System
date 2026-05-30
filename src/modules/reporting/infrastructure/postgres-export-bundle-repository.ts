import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toRecord } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ExportBundleRepository } from '../application/export-bundle-repository.js';
import type {
  ExportBundleIntegrity,
  ExportBundleManifest,
  ExportBundleRecord,
  ExportBundleScope,
  ExportBundleSignature,
  ExportBundleStatus,
} from '../domain/export-bundle.js';

type ExportBundleRow = {
  bundle_id: string;
  status: ExportBundleStatus;
  scope: ExportBundleScope;
  purpose: string;
  requested_by_user_id: string;
  requested_at: Date | string;
  generated_at: Date | string;
  failure_reason: string | null;
  manifest: unknown;
  integrity: unknown;
  signature: unknown | null;
  download: unknown;
};

function toManifest(value: unknown): ExportBundleManifest {
  return toRecord(value) as ExportBundleManifest;
}

function toIntegrity(value: unknown): ExportBundleIntegrity {
  return toRecord(value) as ExportBundleIntegrity;
}

function toSignature(value: unknown): ExportBundleSignature | undefined {
  const record = toRecord(value);
  return record ? record as ExportBundleSignature : undefined;
}

function toDownload(value: unknown): ExportBundleRecord['download'] {
  return toRecord(value) as ExportBundleRecord['download'];
}

function toExportBundle(row: ExportBundleRow): ExportBundleRecord {
  const bundle: ExportBundleRecord = {
    bundleId: row.bundle_id,
    status: row.status,
    scope: row.scope,
    purpose: row.purpose,
    requestedByUserId: row.requested_by_user_id,
    requestedAt: toIsoString(row.requested_at),
    generatedAt: toIsoString(row.generated_at),
    manifest: toManifest(row.manifest),
    integrity: toIntegrity(row.integrity),
    download: toDownload(row.download),
  };

  if (row.failure_reason) {
    bundle.failureReason = row.failure_reason;
  }

  const signature = toSignature(row.signature);
  if (signature) {
    bundle.signature = signature;
  }

  return bundle;
}

function cloneBundle(bundle: ExportBundleRecord): ExportBundleRecord {
  return JSON.parse(JSON.stringify(bundle)) as ExportBundleRecord;
}

export class PostgresExportBundleRepository implements ExportBundleRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(bundle: ExportBundleRecord): Promise<ExportBundleRecord> {
    await this.db.query(
      `
        INSERT INTO export_bundles (
          bundle_id,
          status,
          scope,
          purpose,
          requested_by_user_id,
          requested_at,
          generated_at,
          failure_reason,
          manifest,
          integrity,
          signature,
          download
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, $11::jsonb, $12::jsonb)
        ON CONFLICT (bundle_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          scope = EXCLUDED.scope,
          purpose = EXCLUDED.purpose,
          requested_by_user_id = EXCLUDED.requested_by_user_id,
          requested_at = EXCLUDED.requested_at,
          generated_at = EXCLUDED.generated_at,
          failure_reason = EXCLUDED.failure_reason,
          manifest = EXCLUDED.manifest,
          integrity = EXCLUDED.integrity,
          signature = EXCLUDED.signature,
          download = EXCLUDED.download
      `,
      [
        bundle.bundleId,
        bundle.status,
        bundle.scope,
        bundle.purpose,
        bundle.requestedByUserId,
        bundle.requestedAt,
        bundle.generatedAt,
        bundle.failureReason ?? null,
        JSON.stringify(bundle.manifest),
        JSON.stringify(bundle.integrity),
        bundle.signature ? JSON.stringify(bundle.signature) : null,
        JSON.stringify(bundle.download),
      ],
    );

    return cloneBundle(bundle);
  }

  async findById(bundleId: string): Promise<ExportBundleRecord | null> {
    const result = await this.db.query<ExportBundleRow>(
      'SELECT * FROM export_bundles WHERE bundle_id = $1',
      [bundleId],
    );

    return result.rows[0] ? toExportBundle(result.rows[0]) : null;
  }

  async list(): Promise<ExportBundleRecord[]> {
    const result = await this.db.query<ExportBundleRow>(
      `
        SELECT *
        FROM export_bundles
        ORDER BY requested_at ASC, bundle_id ASC
      `,
    );

    return result.rows.map(toExportBundle);
  }
}
