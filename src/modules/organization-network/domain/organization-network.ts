export type OrganizationEligibilityStatus = 'unknown' | 'eligible' | 'flagged' | 'blocked';

export type OrganizationNetworkRequestState =
  | 'draft'
  | 'sent'
  | 'received'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'blocked'
  | 'expired';

export type OrganizationRelationshipIntent =
  | 'buyer'
  | 'supplier'
  | 'financier'
  | 'logistics'
  | 'auditorRegulator'
  | 'mixed';

export type OrganizationGraphRelationshipType =
  | 'buyerSupplier'
  | 'financing'
  | 'audit'
  | 'logistics'
  | 'regulatory'
  | 'mixed';

export type OrganizationGraphChannelScope =
  | 'sharedChannelA'
  | 'sharedChannelB'
  | 'privateChannelC'
  | 'localProofOnly'
  | 'unavailable';

export type OrganizationGraphAnchorStatus =
  | 'notAnchored'
  | 'pending'
  | 'anchored'
  | 'failed';

export type OrganizationGraphVerificationStatus =
  | 'verified'
  | 'mismatch'
  | 'notFound'
  | 'unavailable';

export type OrganizationProfile = {
  organizationId: string;
  legalName: string;
  displayName?: string;
  alias?: string;
  uniqueIdentifier: string;
  logoUrl?: string;
  status: 'pendingReview' | 'active' | 'inactive' | 'suspended' | 'deleted';
  eligibilityStatus: OrganizationEligibilityStatus;
  businessCategory?: string;
  publicProfileSummary?: string;
  contactEmail?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type OrganizationPublicProfile = Omit<OrganizationProfile, 'contactEmail'>;

export type OrganizationRegistration = {
  organization: OrganizationProfile;
  primaryAdminUserId: string;
  onboardingCaseId?: string;
};

export type OrganizationNetworkRequest = {
  requestId: string;
  requesterOrganizationId: string;
  targetOrganizationId: string;
  targetUniqueIdentifier: string;
  relationshipType: OrganizationRelationshipIntent;
  message?: string;
  purpose?: string;
  state: OrganizationNetworkRequestState;
  createdByUserId: string;
  decidedByUserId?: string;
  createdAt: string;
  updatedAt: string;
  decidedAt?: string;
};

export type OrganizationGraphNode = {
  id: string;
  organizationId: string;
  uniqueIdentifier: string;
  displayName: string;
  alias?: string;
  logoUrl?: string;
  organizationStatus: OrganizationProfile['status'];
  eligibilityStatus: OrganizationEligibilityStatus;
  relationshipToCurrentOrg:
    | 'self'
    | 'connected'
    | 'pendingInbound'
    | 'pendingOutbound'
    | 'blocked';
  relationshipRole:
    | 'buyer'
    | 'supplier'
    | 'financier'
    | 'auditor'
    | 'regulator'
    | 'logistics'
    | 'mixed';
  activeDealCount: number;
  lastInteractionAt?: string;
  profileSummary?: string;
  proofChannelSummary?: string;
};

export type OrganizationGraphEdge = {
  id: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  direction: 'outbound' | 'inbound' | 'bidirectional';
  relationshipType: OrganizationGraphRelationshipType;
  channelScope: OrganizationGraphChannelScope;
  fabricChannelName?: string;
  privateDataCollectionName?: string;
  currentStage: string;
  latestLifecycleEventId?: string;
  latestPayloadHash?: string;
  anchorStatus?: OrganizationGraphAnchorStatus;
  verificationStatus?: OrganizationGraphVerificationStatus;
  safeSummary: string;
};

export type OrganizationGraphTrailEntry = {
  lifecycleEventId: string;
  eventType: string;
  timestamp: string;
  payloadHash: string;
  anchorStatus: OrganizationGraphAnchorStatus;
  verificationStatus: OrganizationGraphVerificationStatus;
  channelScope: OrganizationGraphChannelScope;
  relatedRecordType: string;
  relatedRecordId: string;
};

export type OrganizationGraphProjection = {
  currentOrganizationId: string;
  nodes: OrganizationGraphNode[];
  edges: OrganizationGraphEdge[];
  latestProofActivity: OrganizationGraphTrailEntry[];
};

export type EmailNotificationStatus = 'queued' | 'sent' | 'failed' | 'skipped';

export type EmailNotificationRecord = {
  notificationId: string;
  recipientOrganizationId: string;
  recipientUserId?: string;
  recipientEmail?: string;
  templateKey: string;
  subject: string;
  safeBody: string;
  relatedEntityType: string;
  relatedEntityId: string;
  status: EmailNotificationStatus;
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
};

export const organizationRelationshipIntents: readonly OrganizationRelationshipIntent[] = [
  'buyer',
  'supplier',
  'financier',
  'logistics',
  'auditorRegulator',
  'mixed',
];

export function isOrganizationRelationshipIntent(value: string): value is OrganizationRelationshipIntent {
  return organizationRelationshipIntents.includes(value as OrganizationRelationshipIntent);
}
