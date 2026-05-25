import type { ExportBundleRecord } from '../domain/export-bundle.js';

export interface ExportBundleRepository {
  save(bundle: ExportBundleRecord): Promise<ExportBundleRecord>;
  findById(bundleId: string): Promise<ExportBundleRecord | null>;
  list(): Promise<ExportBundleRecord[]>;
}
