import { requestJson } from './http-client';
import { createSessionHeaders } from './auth-headers';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  CreateMemberOrganizationRequest,
  MemberOrganizationResponse,
  MemberOrganizationStatus
} from '../types/member-organization';

export async function createMemberOrganization(
  payload: CreateMemberOrganizationRequest,
  session?: AuthenticatedFrontendSession
): Promise<MemberOrganizationResponse> {
  return requestJson<MemberOrganizationResponse>('/api/v1/member-organizations', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}

export async function listMemberOrganizations(
  session?: AuthenticatedFrontendSession
): Promise<MemberOrganizationResponse[]> {
  const response = await requestJson<{ items: MemberOrganizationResponse[] }>('/api/v1/member-organizations', {
    headers: createSessionHeaders(session)
  });

  return response.items;
}

export async function getMemberOrganization(
  organizationId: string,
  session?: AuthenticatedFrontendSession
): Promise<MemberOrganizationResponse> {
  return requestJson<MemberOrganizationResponse>(`/api/v1/member-organizations/${organizationId}`, {
    headers: createSessionHeaders(session)
  });
}

export async function updateMemberOrganizationStatus(
  organizationId: string,
  status: MemberOrganizationStatus,
  session?: AuthenticatedFrontendSession
): Promise<MemberOrganizationResponse> {
  return requestJson<MemberOrganizationResponse>(`/api/v1/member-organizations/${organizationId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify({ status })
  });
}
