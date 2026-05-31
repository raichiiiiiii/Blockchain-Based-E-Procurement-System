import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type { ProcurementInvoice, SubmitInvoiceRequest } from '../types/invoice';

function headers(session: AuthenticatedFrontendSession): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...createSessionHeaders(session),
  };
}

export async function listInvoices(session: AuthenticatedFrontendSession): Promise<ProcurementInvoice[]> {
  const response = await requestJson<{ items: ProcurementInvoice[] }>('/api/v1/invoices', {
    headers: createSessionHeaders(session),
  });
  return response.items;
}

export async function submitInvoice(
  payload: SubmitInvoiceRequest,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementInvoice> {
  return requestJson<ProcurementInvoice>('/api/v1/invoices', {
    method: 'POST',
    headers: headers(session),
    body: JSON.stringify(payload),
  });
}

export async function verifyInvoiceMatch(
  invoiceId: string,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementInvoice> {
  return requestJson<ProcurementInvoice>(`/api/v1/invoices/${encodeURIComponent(invoiceId)}/verify-match`, {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}

export async function approveInvoicePayment(
  invoiceId: string,
  session: AuthenticatedFrontendSession,
): Promise<ProcurementInvoice> {
  return requestJson<ProcurementInvoice>(`/api/v1/invoices/${encodeURIComponent(invoiceId)}/approve-payment`, {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}
