import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  CompanyDashboardSummary,
  CompanyDealProjection,
  CompanyUserSummary,
  EmailNotificationRecord,
  MudarabahWorkflowProjection,
  OrganizationGraphProjection,
  OrganizationGraphTrailEntry,
  OrganizationNetworkRequest,
  OrganizationProfile,
  OrganizationRelationshipIntent,
} from '../types/organization-network';

export type CreateNetworkRequestPayload = {
  targetUniqueIdentifier: string;
  relationshipType: OrganizationRelationshipIntent;
  message?: string;
  purpose?: string;
};

export type RegisterOrganizationPayload = {
  legalName: string;
  alias: string;
  uniqueIdentifier: string;
  contactEmail: string;
  businessCategory: string;
  publicProfileSummary?: string;
  primaryAdminUsername: string;
  primaryAdminPassword: string;
  primaryAdminDisplayName?: string;
};

export type InviteOrganizationUserPayload = {
  username: string;
  displayName: string;
  roleCodes: string[];
};

export async function registerOrganization(
  payload: RegisterOrganizationPayload,
): Promise<{
  organization: OrganizationProfile;
  primaryAdminUserId: string;
  onboardingCaseId?: string;
}> {
  return requestJson('/api/v1/organizations/register', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

export async function getOwnOrganizationProfile(
  session: AuthenticatedFrontendSession,
): Promise<OrganizationProfile> {
  return requestJson<OrganizationProfile>('/api/v1/organizations/me/profile', {
    headers: createSessionHeaders(session),
  });
}

export async function updateOwnOrganizationProfile(
  payload: {
    alias?: string;
    logoUrl?: string;
    businessCategory?: string;
    publicProfileSummary?: string;
    contactEmail?: string;
  },
  session: AuthenticatedFrontendSession,
): Promise<OrganizationProfile> {
  return requestJson<OrganizationProfile>('/api/v1/organizations/me/profile', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify(payload),
  });
}

export async function getCompanyDashboardSummary(
  session: AuthenticatedFrontendSession,
): Promise<CompanyDashboardSummary> {
  return requestJson<CompanyDashboardSummary>('/api/v1/organizations/me/dashboard-summary', {
    headers: createSessionHeaders(session),
  });
}

export async function listOrganizationUsers(
  session: AuthenticatedFrontendSession,
): Promise<CompanyUserSummary[]> {
  const response = await requestJson<{ items: CompanyUserSummary[] }>('/api/v1/organizations/me/users', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}

export async function inviteOrganizationUser(
  payload: InviteOrganizationUserPayload,
  session: AuthenticatedFrontendSession,
): Promise<CompanyUserSummary> {
  return requestJson<CompanyUserSummary>('/api/v1/organizations/me/users', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify(payload),
  });
}

export async function searchOrganizationByIdentifier(
  identifier: string,
  session: AuthenticatedFrontendSession,
): Promise<OrganizationProfile> {
  return requestJson<OrganizationProfile>(`/api/v1/organizations/search?identifier=${encodeURIComponent(identifier)}`, {
    headers: createSessionHeaders(session),
  });
}

export async function createOrganizationNetworkRequest(
  payload: CreateNetworkRequestPayload,
  session: AuthenticatedFrontendSession,
): Promise<OrganizationNetworkRequest> {
  return requestJson<OrganizationNetworkRequest>('/api/v1/organization-network/requests', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify(payload),
  });
}

export async function listOrganizationNetworkRequests(
  session: AuthenticatedFrontendSession,
): Promise<OrganizationNetworkRequest[]> {
  const response = await requestJson<{ items: OrganizationNetworkRequest[] }>('/api/v1/organization-network/requests', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}

export async function acceptOrganizationNetworkRequest(
  requestId: string,
  session: AuthenticatedFrontendSession,
): Promise<OrganizationNetworkRequest> {
  return requestJson<OrganizationNetworkRequest>(`/api/v1/organization-network/requests/${requestId}/accept`, {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}

export async function rejectOrganizationNetworkRequest(
  requestId: string,
  session: AuthenticatedFrontendSession,
): Promise<OrganizationNetworkRequest> {
  return requestJson<OrganizationNetworkRequest>(`/api/v1/organization-network/requests/${requestId}/reject`, {
    method: 'POST',
    headers: createSessionHeaders(session),
  });
}

export async function getOrganizationNetworkGraph(
  session: AuthenticatedFrontendSession,
): Promise<OrganizationGraphProjection> {
  return requestJson<OrganizationGraphProjection>('/api/v1/organization-network/graph', {
    headers: createSessionHeaders(session),
  });
}

export async function listCompanyDeals(
  session: AuthenticatedFrontendSession,
): Promise<CompanyDealProjection[]> {
  const response = await requestJson<{ items: CompanyDealProjection[] }>('/api/v1/company-ledger/deals', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}

export async function listMudarabahWorkflowProjections(
  session: AuthenticatedFrontendSession,
): Promise<MudarabahWorkflowProjection[]> {
  const response = await requestJson<{ items: MudarabahWorkflowProjection[] }>('/api/v1/company-ledger/mudarabah', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}

export async function getOrganizationGraphTrail(
  edgeId: string,
  session: AuthenticatedFrontendSession,
): Promise<OrganizationGraphTrailEntry[]> {
  const response = await requestJson<{ items: OrganizationGraphTrailEntry[] }>(
    `/api/v1/organization-network/graph/${encodeURIComponent(edgeId)}/trail`,
    {
      headers: createSessionHeaders(session),
    },
  );

  return response.items;
}

export async function listEmailNotificationOutbox(
  session: AuthenticatedFrontendSession,
): Promise<EmailNotificationRecord[]> {
  const response = await requestJson<{ items: EmailNotificationRecord[] }>('/api/v1/email-notifications/outbox', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}
