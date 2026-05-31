import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { SourceToAwardResponse } from '../types/source-to-award';

function headers(session: AuthenticatedFrontendSession): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...createSessionHeaders(session),
  };
}

export async function createSourceRequisition(
  payload: { title: string; description?: string; estimatedAmount: string; currency: string },
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse> {
  return requestJson<SourceToAwardResponse>('/api/v1/source-to-award/requisitions', {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify(payload),
  });
}

export async function approveSourceRequisition(
  requisitionId: string,
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse> {
  return requestJson<SourceToAwardResponse>(`/api/v1/source-to-award/requisitions/${encodeURIComponent(requisitionId)}/approve`, {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}

export async function issueRfq(
  payload: { requisitionId: string; supplierOrganizationIds: string[]; responseDeadline?: string },
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse> {
  return requestJson<SourceToAwardResponse>('/api/v1/source-to-award/rfqs', {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify(payload),
  });
}

export async function submitQuotation(
  rfqId: string,
  payload: { amount: string; currency: string; deliveryDays?: number; notes?: string },
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse> {
  return requestJson<SourceToAwardResponse>(`/api/v1/source-to-award/rfqs/${encodeURIComponent(rfqId)}/quotations`, {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify(payload),
  });
}

export async function awardRfq(
  rfqId: string,
  payload: { quotationId: string; rationale?: string },
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse> {
  return requestJson<SourceToAwardResponse>(`/api/v1/source-to-award/rfqs/${encodeURIComponent(rfqId)}/award`, {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify(payload),
  });
}

export async function getSourceToAwardCase(
  caseId: string,
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse> {
  return requestJson<SourceToAwardResponse>(`/api/v1/source-to-award/cases/${encodeURIComponent(caseId)}`, {
    headers: createSessionHeaders(session),
  });
}

export async function listSourceToAwardCases(
  session: AuthenticatedFrontendSession,
): Promise<SourceToAwardResponse['case'][]> {
  const response = await requestJson<{ items: SourceToAwardResponse['case'][] }>('/api/v1/source-to-award/cases', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}
