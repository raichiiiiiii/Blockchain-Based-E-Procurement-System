export type OrganizationEligibilityStatus = 'unknown' | 'eligible' | 'flagged' | 'blocked';

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
  relationshipToCurrentOrg: 'self' | 'connected' | 'pendingInbound' | 'pendingOutbound' | 'blocked';
  relationshipRole: 'buyer' | 'supplier' | 'financier' | 'auditor' | 'regulator' | 'logistics' | 'mixed';
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
  relationshipType: 'buyerSupplier' | 'financing' | 'audit' | 'logistics' | 'regulatory' | 'mixed';
  channelScope: 'sharedChannelA' | 'sharedChannelB' | 'privateChannelC' | 'localProofOnly' | 'unavailable';
  fabricChannelName?: string;
  privateDataCollectionName?: string;
  currentStage: string;
  latestLifecycleEventId?: string;
  latestPayloadHash?: string;
  anchorStatus?: 'notAnchored' | 'pending' | 'anchored' | 'failed';
  verificationStatus?: 'verified' | 'mismatch' | 'notFound' | 'unavailable';
  safeSummary: string;
};

export type OrganizationGraphTrailEntry = {
  lifecycleEventId: string;
  eventType: string;
  timestamp: string;
  payloadHash: string;
  anchorStatus: 'notAnchored' | 'pending' | 'anchored' | 'failed';
  verificationStatus: 'verified' | 'mismatch' | 'notFound' | 'unavailable';
  channelScope: OrganizationGraphEdge['channelScope'];
  relatedRecordType: string;
  relatedRecordId: string;
};

export type OrganizationGraphProjection = {
  currentOrganizationId: string;
  nodes: OrganizationGraphNode[];
  edges: OrganizationGraphEdge[];
  latestProofActivity: OrganizationGraphTrailEntry[];
};

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
  status: 'queued' | 'sent' | 'failed' | 'skipped';
  createdAt: string;
  sentAt?: string;
  failureReason?: string;
};
