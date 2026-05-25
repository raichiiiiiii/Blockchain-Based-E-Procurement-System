import type { ExportBundleRepository } from '../application/export-bundle-repository.js';
import type { ExportBundleRecord } from '../domain/export-bundle.js';

function cloneBundle(bundle: ExportBundleRecord): ExportBundleRecord {
  return JSON.parse(JSON.stringify(bundle)) as ExportBundleRecord;
}

export class InMemoryExportBundleRepository implements ExportBundleRepository {
  private readonly bundles = new Map<string, ExportBundleRecord>();

  constructor(seedBundles: ExportBundleRecord[] = []) {
    for (const bundle of seedBundles) {
      this.bundles.set(bundle.bundleId, cloneBundle(bundle));
    }
  }

  async save(bundle: ExportBundleRecord): Promise<ExportBundleRecord> {
    const stored = cloneBundle(bundle);
    this.bundles.set(stored.bundleId, stored);
    return cloneBundle(stored);
  }

  async findById(bundleId: string): Promise<ExportBundleRecord | null> {
    const bundle = this.bundles.get(bundleId);
    return bundle ? cloneBundle(bundle) : null;
  }

  async list(): Promise<ExportBundleRecord[]> {
    return [...this.bundles.values()]
      .sort((left, right) => left.requestedAt.localeCompare(right.requestedAt) || left.bundleId.localeCompare(right.bundleId))
      .map(bundle => cloneBundle(bundle));
  }
}
