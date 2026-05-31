import type { CompanyLedgerExportManifest, SavedWorkspaceView } from '../domain/productivity.js';

export type ProductivityStateRepository = {
  listCompletedTaskIds(organizationId: string): Promise<string[]>;
  markTaskCompleted(organizationId: string, taskId: string): Promise<void>;
  listSavedViews(organizationId: string): Promise<SavedWorkspaceView[]>;
  saveView(view: SavedWorkspaceView): Promise<SavedWorkspaceView>;
  saveExport(manifest: CompanyLedgerExportManifest): Promise<CompanyLedgerExportManifest>;
};
