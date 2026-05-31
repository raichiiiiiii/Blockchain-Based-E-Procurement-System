import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  ActionInboxItem,
  CompanyLedgerExportManifest,
  CompanyProductivitySummary,
  EvidenceChecklistItem,
  MoneyTrackerSummary,
  NotificationCenterItem,
  ProcurementPipelineItem,
  SavedWorkspaceView,
  SupplierScorecard,
} from '../types/productivity';

export async function getCompanyProductivitySummary(
  session: AuthenticatedFrontendSession,
): Promise<CompanyProductivitySummary> {
  return requestJson<CompanyProductivitySummary>('/api/v1/company-productivity/summary', {
    headers: createSessionHeaders(session),
  });
}

export async function getMoneyTracker(
  session: AuthenticatedFrontendSession,
): Promise<MoneyTrackerSummary> {
  return requestJson<MoneyTrackerSummary>('/api/v1/company-productivity/money-tracker', {
    headers: createSessionHeaders(session),
  });
}

export async function listPipeline(
  session: AuthenticatedFrontendSession,
): Promise<ProcurementPipelineItem[]> {
  const response = await requestJson<{ items: ProcurementPipelineItem[] }>('/api/v1/company-productivity/pipeline', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}

export async function listActionInbox(
  session: AuthenticatedFrontendSession,
): Promise<ActionInboxItem[]> {
  const response = await requestJson<{ items: ActionInboxItem[] }>('/api/v1/company-productivity/action-inbox', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}

export async function completeTask(
  taskId: string,
  session: AuthenticatedFrontendSession,
): Promise<ActionInboxItem> {
  return requestJson<ActionInboxItem>(`/api/v1/company-productivity/action-inbox/${encodeURIComponent(taskId)}`, {
    method: 'PATCH',
    headers: createSessionHeaders(session),
  });
}

export async function listSupplierScorecards(
  session: AuthenticatedFrontendSession,
): Promise<SupplierScorecard[]> {
  const response = await requestJson<{ items: SupplierScorecard[] }>('/api/v1/company-productivity/supplier-scorecards', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}

export async function listEvidenceChecklist(
  session: AuthenticatedFrontendSession,
): Promise<EvidenceChecklistItem[]> {
  const response = await requestJson<{ items: EvidenceChecklistItem[] }>('/api/v1/company-productivity/evidence-checklist', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}

export async function listSavedViews(
  session: AuthenticatedFrontendSession,
): Promise<SavedWorkspaceView[]> {
  const response = await requestJson<{ items: SavedWorkspaceView[] }>('/api/v1/company-productivity/saved-views', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}

export async function createSavedView(
  payload: { name: string; filter: string },
  session: AuthenticatedFrontendSession,
): Promise<SavedWorkspaceView> {
  return requestJson<SavedWorkspaceView>('/api/v1/company-productivity/saved-views', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify(payload),
  });
}

export async function createCompanyLedgerExport(
  session: AuthenticatedFrontendSession,
): Promise<CompanyLedgerExportManifest> {
  return requestJson<CompanyLedgerExportManifest>('/api/v1/company-ledger/exports', {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}

export async function listNotifications(
  session: AuthenticatedFrontendSession,
): Promise<NotificationCenterItem[]> {
  const response = await requestJson<{ items: NotificationCenterItem[] }>('/api/v1/notifications', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}
