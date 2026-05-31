import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  ProcurementCaseCloseout,
  ProcurementCaseSummary,
  SupplierPerformanceSummary,
} from '../types/procurement-closeout';

export async function closeProcurementCase(
  caseId: string,
  notes: string | undefined,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementCaseCloseout> {
  return requestJson<ProcurementCaseCloseout>(`/api/v1/procurement-cases/${encodeURIComponent(caseId)}/closeout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify({ notes }),
  });
}

export async function getProcurementCaseSummary(
  caseId: string,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementCaseSummary> {
  return requestJson<ProcurementCaseSummary>(`/api/v1/procurement-cases/${encodeURIComponent(caseId)}/summary`, {
    headers: createSessionHeaders(session),
  });
}

export async function getSupplierPerformance(
  supplierOrganizationId: string,
  session: AuthenticatedFrontendSession,
): Promise<SupplierPerformanceSummary> {
  return requestJson<SupplierPerformanceSummary>(`/api/v1/suppliers/${encodeURIComponent(supplierOrganizationId)}/performance`, {
    headers: createSessionHeaders(session),
  });
}
