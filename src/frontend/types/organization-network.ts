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

export type CompanyProofStatus =
  | 'notAnchored'
  | 'pending'
  | 'anchored'
  | 'failed'
  | 'verified'
  | 'mismatch'
  | 'notFound'
  | 'unavailable';

export type CompanyUserSummary = {
  userId: string;
  username?: string;
  displayName?: string;
  membershipStatus: 'active' | 'inactive' | 'invited';
  roleCodes: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyDashboardSummary = {
  organization: OrganizationProfile;
  currentUser: {
    userId: string;
    roleCodes: string[];
  };
  relationshipRoles: Array<{
    relationshipId: string;
    relationshipRole: OrganizationRelationshipIntent;
    counterpartOrganizationId: string;
    counterpartDisplayName: string;
    channelScope: OrganizationGraphEdge['channelScope'];
    currentStage: string;
  }>;
  activeDealCount: number;
  latestProofStatus: CompanyProofStatus;
};

export type CompanyDealProjection = {
  dealId: string;
  relationshipId?: string;
  title: string;
  counterpartOrganizationId: string;
  counterpartDisplayName: string;
  relationship: 'buyerToSupplier' | 'supplierToBuyer' | 'financing' | 'governance' | 'unknown';
  orderId?: string;
  orderStatus: 'notStarted' | 'created' | 'accepted' | 'rejected';
  deliveryEvidenceStatus: 'notSubmitted' | 'metadataRecorded';
  escrowId?: string;
  escrowStatus: string;
  proofStatus: CompanyProofStatus;
  proofEventId?: string;
  proofPayloadHash?: string;
  financingStatus: 'noFinancing' | 'pendingShariahReview' | 'approvedForActivation' | 'activeSimulation' | 'blocked' | 'rejected';
  latestLifecycleEvent?: string;
  updatedAt?: string;
  safeSummary: string;
};

export type MudarabahWorkflowProjection = {
  projectionId: string;
  dealId?: string;
  contractId?: string;
  procurementReference?: string;
  buyerOrganizationId?: string;
  supplierOrganizationId?: string;
  financierOrganizationId?: string;
  status: 'noFinancing' | 'pendingShariahReview' | 'approvedForActivation' | 'activeSimulation' | 'blocked' | 'rejected';
  capitalAmount?: string;
  currency?: string;
  financierSharePercent?: number;
  ventureOperatorSharePercent?: number;
  shariahReference?: string;
  certificateReference?: string;
  simulationOnlyNotice: string;
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
