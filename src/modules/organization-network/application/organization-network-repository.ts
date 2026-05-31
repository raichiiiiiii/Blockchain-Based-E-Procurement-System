import type {
  EmailNotificationRecord,
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
  updateProfile(
    organizationId: string,
    input: UpdateOrganizationProfileInput,
  ): Promise<OrganizationProfile | null>;
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
  listEmailNotificationsForOrganization(
    organizationId: string,
    options?: { includeGovernanceView?: boolean },
  ): Promise<EmailNotificationRecord[]>;
};
