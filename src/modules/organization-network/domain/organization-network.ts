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

export type OrganizationGraphNodeType =
  | 'organization'
  | 'buyer'
  | 'supplier'
  | 'financier'
  | 'regulator'
  | 'auditor'
  | 'shariahReviewer'
  | 'logisticsProofProvider'
  | 'erpAccountingAdapter'
  | 'apiIntegrationClient'
  | 'fabricProofBoundary';

export type OrganizationGraphEdgeType =
  | 'buyerSupplier'
  | 'financing'
  | 'oversight'
  | 'audit'
  | 'proofAnchoring'
  | 'integration'
  | 'deliveryProof';

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

export type CompanyProofStatus =
  | 'notAnchored'
  | 'pending'
  | 'anchored'
  | 'failed'
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

export type CompanyUserSummary = {
  userId: string;
  username?: string;
  displayName?: string;
  membershipStatus: 'active' | 'inactive' | 'invited';
  roleCodes: string[];
  createdAt?: string;
  updatedAt?: string;
};

export type CompanyDashboardRelationshipRole = {
  relationshipId: string;
  relationshipRole: OrganizationRelationshipIntent;
  counterpartOrganizationId: string;
  counterpartDisplayName: string;
  channelScope: OrganizationGraphChannelScope;
  currentStage: string;
};

export type CompanyDashboardSummary = {
  organization: OrganizationProfile;
  currentUser: {
    userId: string;
    roleCodes: string[];
  };
  relationshipRoles: CompanyDashboardRelationshipRole[];
  activeDealCount: number;
  latestProofStatus: CompanyProofStatus;
};

export type CompanyChannelMatrixEntry = {
  matrixId: string;
  partnerOrganizationId: string;
  partnerDisplayName: string;
  relationshipRole: OrganizationRelationshipIntent;
  relationshipType: OrganizationGraphRelationshipType;
  channelScope: OrganizationGraphChannelScope;
  proofScopeSummary: string;
  activeDealCount: number;
  latestProofStatus: CompanyProofStatus;
  eligibilityStatus: OrganizationEligibilityStatus;
  riskSummary: string;
  currentStage: string;
  latestLifecycleEventId?: string;
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
  escrowStatus:
    | 'notCreated'
    | 'accepted'
    | 'escrowCreated'
    | 'releasePending'
    | 'releaseReady'
    | 'released'
    | 'cancelled'
    | 'disputed'
    | 'funded'
    | 'awaitingProof'
    | 'releaseRequested'
    | 'releaseApproved'
    | 'releaseRejected'
    | 'onHold'
    | 'disputeOpen'
    | 'arbitration'
    | 'refunded'
    | 'expired'
    | 'settlementInstructionReady';
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
  nodeType?: OrganizationGraphNodeType;
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
  edgeType?: OrganizationGraphEdgeType;
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
  claimBoundary?: string;
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
