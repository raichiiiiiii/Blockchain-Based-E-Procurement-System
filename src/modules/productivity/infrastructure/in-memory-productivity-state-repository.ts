import type { ProductivityStateRepository } from '../application/productivity-state-repository.js';
import type { CompanyLedgerExportManifest, SavedWorkspaceView } from '../domain/productivity.js';

export class InMemoryProductivityStateRepository implements ProductivityStateRepository {
  private readonly completedTaskIdsByOrganization = new Map<string, Set<string>>();
  private readonly savedViewsByOrganization = new Map<string, SavedWorkspaceView[]>();
  private readonly exportsById = new Map<string, CompanyLedgerExportManifest>();

  async listCompletedTaskIds(organizationId: string): Promise<string[]> {
    return [...(this.completedTaskIdsByOrganization.get(organizationId) ?? new Set<string>())];
  }

  async markTaskCompleted(organizationId: string, taskId: string): Promise<void> {
    const completedTaskIds = this.completedTaskIdsByOrganization.get(organizationId) ?? new Set<string>();
    completedTaskIds.add(taskId);
    this.completedTaskIdsByOrganization.set(organizationId, completedTaskIds);
  }

  async listSavedViews(organizationId: string): Promise<SavedWorkspaceView[]> {
    return [...(this.savedViewsByOrganization.get(organizationId) ?? [])]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(view => ({ ...view }));
  }

  async saveView(view: SavedWorkspaceView): Promise<SavedWorkspaceView> {
    const views = this.savedViewsByOrganization.get(view.organizationId) ?? [];
    const saved = { ...view };
    this.savedViewsByOrganization.set(view.organizationId, [saved, ...views]);
    return { ...saved };
  }

  async saveExport(manifest: CompanyLedgerExportManifest): Promise<CompanyLedgerExportManifest> {
    const saved = { ...manifest };
    this.exportsById.set(manifest.exportId, saved);
    return { ...saved };
  }
}
