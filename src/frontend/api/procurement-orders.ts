import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  AcknowledgeProcurementOrderRequest,
  CreateProcurementOrderRequest,
  ProcurementOrderResponse,
} from '../types/procurement-order';

export async function listProcurementOrders(
  session?: AuthenticatedFrontendSession
): Promise<ProcurementOrderResponse[]> {
  const response = await requestJson<{ items: ProcurementOrderResponse[] }>('/api/v1/orders', {
    headers: createSessionHeaders(session)
  });

  return response.items;
}

export async function createProcurementOrder(
  payload: CreateProcurementOrderRequest,
  session?: AuthenticatedFrontendSession
): Promise<ProcurementOrderResponse> {
  return requestJson<ProcurementOrderResponse>('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}

export async function acknowledgeProcurementOrder(
  orderId: string,
  payload: AcknowledgeProcurementOrderRequest,
  session?: AuthenticatedFrontendSession
): Promise<ProcurementOrderResponse> {
  return requestJson<ProcurementOrderResponse>(`/api/v1/orders/${orderId}/acknowledgement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}
