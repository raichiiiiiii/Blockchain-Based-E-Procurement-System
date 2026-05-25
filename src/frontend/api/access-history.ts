import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type AccessHistoryEvent = {
  eventId: string;
  occurredAt: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  outcome: 'success' | 'forbidden' | 'validationError' | 'notFound' | 'conflict' | 'error' | string;
  reason?: string;
  route?: string;
  method?: string;
  module: string;
  evidence?: {
    payloadHash?: string;
    canonicalization?: string;
    previousEventHash?: string;
  };
};

export async function listAccessHistory(session?: AuthenticatedFrontendSession): Promise<AccessHistoryEvent[]> {
  const response = await requestJson<{ items: AccessHistoryEvent[] }>('/api/v1/access-history', {
    headers: createSessionHeaders(session)
  });

  return response.items;
}
