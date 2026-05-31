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
  OrganizationPublicProfile,
  OrganizationRegistration,
  OrganizationRelationshipIntent,
} from '../domain/organization-network.js';

export type RegisterOrganizationInput = {
  legalName: string;
  alias: string;
  uniqueIdentifier: string;
  logoUrl?: string;
  contactEmail: string;
  businessCategory: string;
  registrationNumber?: string;
  publicProfileSummary?: string;
  primaryAdminUsername: string;
  primaryAdminPassword: string;
  primaryAdminDisplayName?: string;
};

export type UpdateOrganizationProfileInput = {
  alias?: string;
  logoUrl?: string;
  businessCategory?: string;
  publicProfileSummary?: string;
  contactEmail?: string;
};

export type InviteOrganizationUserInput = {
  organizationId: string;
  username: string;
  displayName: string;
  roleCodes: string[];
  invitedByUserId: string;
};

export type CreateNetworkRequestInput = {
  requesterOrganizationId: string;
  targetUniqueIdentifier: string;
  relationshipType: OrganizationRelationshipIntent;
  message?: string;
  purpose?: string;
  createdByUserId: string;
};

export type DecideNetworkRequestInput = {
  requestId: string;
  actorOrganizationId: string;
  actorUserId: string;
};

export type NetworkDecisionResult =
  | { status: 'accepted'; request: OrganizationNetworkRequest }
  | { status: 'rejected'; request: OrganizationNetworkRequest }
  | { status: 'notFound' }
  | { status: 'forbidden' }
  | { status: 'notActionable' };

export type OrganizationNetworkRepository = {
  registerOrganization(input: RegisterOrganizationInput): Promise<
    | { status: 'registered'; registration: OrganizationRegistration }
    | { status: 'duplicateIdentifier' }
    | { status: 'duplicateUsername' }
  >;
  findProfileByOrganizationId(organizationId: string): Promise<OrganizationProfile | null>;
  getCompanyDashboardSummary(input: {
    organizationId: string;
    actorUserId: string;
    actorRoleCodes: string[];
  }): Promise<CompanyDashboardSummary | null>;
  updateProfile(
    organizationId: string,
    input: UpdateOrganizationProfileInput,
  ): Promise<OrganizationProfile | null>;
  listOrganizationUsers(organizationId: string): Promise<CompanyUserSummary[]>;
  inviteOrganizationUser(input: InviteOrganizationUserInput): Promise<
    | { status: 'created'; user: CompanyUserSummary }
    | { status: 'duplicateUsername' }
    | { status: 'organizationNotFound' }
  >;
  searchPublicProfileByUniqueIdentifier(identifier: string): Promise<OrganizationPublicProfile | null>;
  createNetworkRequest(input: CreateNetworkRequestInput): Promise<
    | { status: 'created'; request: OrganizationNetworkRequest }
    | { status: 'targetNotFound' }
    | { status: 'selfRequest' }
    | { status: 'duplicateActiveRequest' }
  >;
  listNetworkRequestsForOrganization(organizationId: string): Promise<OrganizationNetworkRequest[]>;
  acceptNetworkRequest(input: DecideNetworkRequestInput): Promise<NetworkDecisionResult>;
  rejectNetworkRequest(input: DecideNetworkRequestInput): Promise<NetworkDecisionResult>;
  getGraphForOrganization(organizationId: string): Promise<OrganizationGraphProjection>;
  getTrailForEdge(organizationId: string, edgeId: string): Promise<OrganizationGraphTrailEntry[] | null>;
  listCompanyDealProjections(organizationId: string): Promise<CompanyDealProjection[]>;
  listMudarabahWorkflowProjections(organizationId: string): Promise<MudarabahWorkflowProjection[]>;
  listEmailNotificationsForOrganization(
    organizationId: string,
    options?: { includeGovernanceView?: boolean },
  ): Promise<EmailNotificationRecord[]>;
};
