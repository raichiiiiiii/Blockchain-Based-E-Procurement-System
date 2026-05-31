import { createHash, randomUUID } from 'node:crypto';
import type {
  CreateNetworkRequestInput,
  DecideNetworkRequestInput,
  OrganizationNetworkRepository,
  RegisterOrganizationInput,
  UpdateOrganizationProfileInput,
} from '../application/organization-network-repository.js';
import type {
  EmailNotificationRecord,
  OrganizationGraphChannelScope,
  OrganizationGraphEdge,
  OrganizationGraphNode,
  OrganizationGraphProjection,
  OrganizationGraphRelationshipType,
  OrganizationGraphTrailEntry,
  OrganizationNetworkRequest,
  OrganizationProfile,
  OrganizationRelationshipIntent,
} from '../domain/organization-network.js';

type RelationshipRecord = {
  relationshipId: string;
  sourceOrganizationId: string;
  targetOrganizationId: string;
  relationshipType: OrganizationRelationshipIntent;
  channelScope: OrganizationGraphChannelScope;
  status: 'active';
  createdAt: string;
  updatedAt: string;
};

function hashPayload(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function relationshipTypeToGraphType(type: OrganizationRelationshipIntent): OrganizationGraphRelationshipType {
  switch (type) {
    case 'financier':
      return 'financing';
    case 'logistics':
      return 'logistics';
    case 'auditorRegulator':
      return 'regulatory';
    case 'mixed':
      return 'mixed';
    case 'buyer':
    case 'supplier':
    default:
      return 'buyerSupplier';
  }
}

function relationshipTypeToChannelScope(type: OrganizationRelationshipIntent): OrganizationGraphChannelScope {
  switch (type) {
    case 'auditorRegulator':
      return 'sharedChannelB';
    case 'financier':
      return 'privateChannelC';
    case 'logistics':
      return 'localProofOnly';
    case 'mixed':
      return 'sharedChannelA';
    case 'buyer':
    case 'supplier':
    default:
      return 'sharedChannelA';
  }
}

function channelNameFor(scope: OrganizationGraphChannelScope): string | undefined {
  switch (scope) {
    case 'sharedChannelA':
      return 'procurement-proof-channel';
    case 'sharedChannelB':
      return 'regulated-export-channel';
    case 'privateChannelC':
      return 'pls-governance-channel';
    default:
      return undefined;
  }
}

function profileToPublic(profile: OrganizationProfile) {
  const { contactEmail: _contactEmail, ...safeProfile } = profile;
  return safeProfile;
}

export class InMemoryOrganizationNetworkRepository implements OrganizationNetworkRepository {
  private readonly profiles = new Map<string, OrganizationProfile>();
  private readonly requests = new Map<string, OrganizationNetworkRequest>();
  private readonly relationships = new Map<string, RelationshipRecord>();
  private readonly emailNotifications = new Map<string, EmailNotificationRecord>();
  private readonly usernames = new Set<string>();

  constructor(seedDemoData = true) {
    if (seedDemoData) {
      this.seedDemoGraph();
    }
  }

  private seedDemoGraph() {
    const now = '2026-05-31T00:00:00.000Z';
    const profiles: OrganizationProfile[] = [
      {
        organizationId: 'demo-buyer-org',
        legalName: 'Amanah Retail Sdn Bhd',
        displayName: 'Amanah Retail',
        alias: 'Amanah',
        uniqueIdentifier: 'amanah-retail',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Regulated buyer',
        publicProfileSummary: 'Retail buyer coordinating verified procurement, escrow readiness, and proof review.',
        contactEmail: 'ops@amanah.example',
        createdAt: now,
        updatedAt: now,
      },
      {
        organizationId: 'demo-supplier-org',
        legalName: 'Barakah Supplies Sdn Bhd',
        displayName: 'Barakah Supplies',
        alias: 'Barakah',
        uniqueIdentifier: 'barakah-supplies',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'SME supplier',
        publicProfileSummary: 'Supplier organization providing packaging goods with delivery evidence metadata.',
        contactEmail: 'supply@barakah.example',
        createdAt: now,
        updatedAt: now,
      },
      {
        organizationId: 'demo-financier-org',
        legalName: 'Mabrur Finance Partner',
        displayName: 'Mabrur Finance',
        alias: 'Mabrur',
        uniqueIdentifier: 'mabrur-finance',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Islamic SME financier',
        publicProfileSummary: 'Restricted PLS seedbed finance participant for approved procurement contracts.',
        contactEmail: 'finance@mabrur.example',
        createdAt: now,
        updatedAt: now,
      },
      {
        organizationId: 'demo-regulator-org',
        legalName: 'Demo Reporting Authority',
        displayName: 'Reporting Authority',
        alias: 'Regulator',
        uniqueIdentifier: 'reporting-authority',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Regulator',
        publicProfileSummary: 'Reporting user that reviews export bundle integrity metadata.',
        contactEmail: 'reporting@example.test',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const profile of profiles) {
      this.profiles.set(profile.organizationId, profile);
    }

    this.relationships.set('rel-amanah-barakah', {
      relationshipId: 'rel-amanah-barakah',
      sourceOrganizationId: 'demo-buyer-org',
      targetOrganizationId: 'demo-supplier-org',
      relationshipType: 'buyer',
      channelScope: 'sharedChannelA',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
    this.relationships.set('rel-mabrur-amanah', {
      relationshipId: 'rel-mabrur-amanah',
      sourceOrganizationId: 'demo-financier-org',
      targetOrganizationId: 'demo-buyer-org',
      relationshipType: 'financier',
      channelScope: 'privateChannelC',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  async registerOrganization(input: RegisterOrganizationInput) {
    const duplicateIdentifier = [...this.profiles.values()].some(
      profile => profile.uniqueIdentifier.toLowerCase() === input.uniqueIdentifier.toLowerCase(),
    );
    if (duplicateIdentifier) {
      return { status: 'duplicateIdentifier' as const };
    }

    if (this.usernames.has(input.primaryAdminUsername.toLowerCase())) {
      return { status: 'duplicateUsername' as const };
    }

    const now = new Date().toISOString();
    const organizationId = `org_${randomUUID()}`;
    const profile: OrganizationProfile = {
      organizationId,
      legalName: input.legalName,
      displayName: input.alias,
      alias: input.alias,
      uniqueIdentifier: input.uniqueIdentifier,
      logoUrl: input.logoUrl,
      status: 'pendingReview',
      eligibilityStatus: 'unknown',
      businessCategory: input.businessCategory,
      publicProfileSummary: input.publicProfileSummary,
      contactEmail: input.contactEmail,
      createdAt: now,
      updatedAt: now,
    };
    const primaryAdminUserId = `user_${randomUUID()}`;

    this.profiles.set(organizationId, profile);
    this.usernames.add(input.primaryAdminUsername.toLowerCase());

    return {
      status: 'registered' as const,
      registration: {
        organization: profile,
        primaryAdminUserId,
        onboardingCaseId: `kyc_${organizationId}`,
      },
    };
  }

  async findProfileByOrganizationId(organizationId: string) {
    const profile = this.profiles.get(organizationId);
    return profile ? { ...profile } : null;
  }

  async updateProfile(organizationId: string, input: UpdateOrganizationProfileInput) {
    const current = this.profiles.get(organizationId);
    if (!current) {
      return null;
    }

    const updated: OrganizationProfile = {
      ...current,
      alias: input.alias ?? current.alias,
      displayName: input.alias ?? current.displayName,
      logoUrl: input.logoUrl ?? current.logoUrl,
      businessCategory: input.businessCategory ?? current.businessCategory,
      publicProfileSummary: input.publicProfileSummary ?? current.publicProfileSummary,
      contactEmail: input.contactEmail ?? current.contactEmail,
      updatedAt: new Date().toISOString(),
    };
    this.profiles.set(organizationId, updated);
    return { ...updated };
  }

  async searchPublicProfileByUniqueIdentifier(identifier: string) {
    const profile = [...this.profiles.values()].find(
      candidate => candidate.uniqueIdentifier.toLowerCase() === identifier.trim().toLowerCase(),
    );

    return profile ? profileToPublic(profile) : null;
  }

  async createNetworkRequest(input: CreateNetworkRequestInput) {
    const target = await this.searchPublicProfileByUniqueIdentifier(input.targetUniqueIdentifier);
    if (!target) {
      return { status: 'targetNotFound' as const };
    }

    if (target.organizationId === input.requesterOrganizationId) {
      return { status: 'selfRequest' as const };
    }

    const duplicate = [...this.requests.values()].some(request =>
      request.requesterOrganizationId === input.requesterOrganizationId
      && request.targetOrganizationId === target.organizationId
      && ['sent', 'received'].includes(request.state)
    );
    if (duplicate) {
      return { status: 'duplicateActiveRequest' as const };
    }

    const now = new Date().toISOString();
    const request: OrganizationNetworkRequest = {
      requestId: `network_request_${randomUUID()}`,
      requesterOrganizationId: input.requesterOrganizationId,
      targetOrganizationId: target.organizationId,
      targetUniqueIdentifier: target.uniqueIdentifier,
      relationshipType: input.relationshipType,
      message: input.message,
      purpose: input.purpose,
      state: 'sent',
      createdByUserId: input.createdByUserId,
      createdAt: now,
      updatedAt: now,
    };
    this.requests.set(request.requestId, request);
    this.recordEmail({
      recipientOrganizationId: target.organizationId,
      templateKey: 'networkRequestSent',
      subject: 'Network request received',
      safeBody: 'A verified platform organization requested network establishment.',
      relatedEntityType: 'organizationNetworkRequest',
      relatedEntityId: request.requestId,
    });

    return { status: 'created' as const, request: { ...request } };
  }

  async listNetworkRequestsForOrganization(organizationId: string) {
    return [...this.requests.values()]
      .filter(request => request.requesterOrganizationId === organizationId || request.targetOrganizationId === organizationId)
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .map(request => ({ ...request }));
  }

  async acceptNetworkRequest(input: DecideNetworkRequestInput) {
    return this.decideRequest(input, 'accepted');
  }

  async rejectNetworkRequest(input: DecideNetworkRequestInput) {
    return this.decideRequest(input, 'rejected');
  }

  private async decideRequest(input: DecideNetworkRequestInput, decision: 'accepted' | 'rejected') {
    const request = this.requests.get(input.requestId);
    if (!request) {
      return { status: 'notFound' as const };
    }

    if (request.targetOrganizationId !== input.actorOrganizationId) {
      return { status: 'forbidden' as const };
    }

    if (!['sent', 'received'].includes(request.state)) {
      return { status: 'notActionable' as const };
    }

    const now = new Date().toISOString();
    const updated: OrganizationNetworkRequest = {
      ...request,
      state: decision,
      decidedByUserId: input.actorUserId,
      decidedAt: now,
      updatedAt: now,
    };
    this.requests.set(request.requestId, updated);

    if (decision === 'accepted') {
      const relationshipId = `rel_${randomUUID()}`;
      this.relationships.set(relationshipId, {
        relationshipId,
        sourceOrganizationId: request.requesterOrganizationId,
        targetOrganizationId: request.targetOrganizationId,
        relationshipType: request.relationshipType,
        channelScope: relationshipTypeToChannelScope(request.relationshipType),
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });
    }

    this.recordEmail({
      recipientOrganizationId: request.requesterOrganizationId,
      templateKey: decision === 'accepted' ? 'networkRequestAccepted' : 'networkRequestRejected',
      subject: decision === 'accepted' ? 'Network request accepted' : 'Network request rejected',
      safeBody: decision === 'accepted'
        ? 'A network relationship request was accepted.'
        : 'A network relationship request was not accepted.',
      relatedEntityType: 'organizationNetworkRequest',
      relatedEntityId: request.requestId,
    });

    return { status: decision as 'accepted' | 'rejected', request: { ...updated } };
  }

  async getGraphForOrganization(organizationId: string): Promise<OrganizationGraphProjection> {
    const current = this.profiles.get(organizationId);
    const nodes = new Map<string, OrganizationGraphNode>();
    const edges: OrganizationGraphEdge[] = [];

    if (current) {
      nodes.set(current.organizationId, this.toGraphNode(current, organizationId, 'self'));
    }

    for (const relationship of this.relationships.values()) {
      if (relationship.sourceOrganizationId !== organizationId && relationship.targetOrganizationId !== organizationId) {
        continue;
      }

      const source = this.profiles.get(relationship.sourceOrganizationId);
      const target = this.profiles.get(relationship.targetOrganizationId);
      if (!source || !target) {
        continue;
      }

      nodes.set(source.organizationId, this.toGraphNode(source, organizationId, source.organizationId === organizationId ? 'self' : 'connected'));
      nodes.set(target.organizationId, this.toGraphNode(target, organizationId, target.organizationId === organizationId ? 'self' : 'connected'));
      edges.push(this.relationshipToEdge(relationship));
    }

    for (const request of this.requests.values()) {
      if (!['sent', 'received'].includes(request.state)) {
        continue;
      }

      if (request.requesterOrganizationId !== organizationId && request.targetOrganizationId !== organizationId) {
        continue;
      }

      const requester = this.profiles.get(request.requesterOrganizationId);
      const target = this.profiles.get(request.targetOrganizationId);
      if (!requester || !target) {
        continue;
      }

      nodes.set(requester.organizationId, this.toGraphNode(
        requester,
        organizationId,
        requester.organizationId === organizationId ? 'self' : 'pendingInbound',
      ));
      nodes.set(target.organizationId, this.toGraphNode(
        target,
        organizationId,
        target.organizationId === organizationId ? 'self' : 'pendingOutbound',
      ));
      edges.push(this.requestToEdge(request));
    }

    return {
      currentOrganizationId: organizationId,
      nodes: [...nodes.values()],
      edges,
      latestProofActivity: edges.slice(0, 5).map(edge => this.edgeToTrailEntry(edge)),
    };
  }

  async getTrailForEdge(organizationId: string, edgeId: string) {
    const graph = await this.getGraphForOrganization(organizationId);
    const edge = graph.edges.find(candidate => candidate.id === edgeId);
    if (!edge) {
      return null;
    }

    return [this.edgeToTrailEntry(edge)];
  }

  async listEmailNotificationsForOrganization(
    organizationId: string,
    options?: { includeGovernanceView?: boolean },
  ) {
    return [...this.emailNotifications.values()]
      .filter(notification =>
        options?.includeGovernanceView || notification.recipientOrganizationId === organizationId
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map(notification => ({ ...notification }));
  }

  private toGraphNode(
    profile: OrganizationProfile,
    currentOrganizationId: string,
    relationshipToCurrentOrg: 'self' | 'connected' | 'pendingInbound' | 'pendingOutbound',
  ) {
    const activeDealCount = [...this.relationships.values()].filter(relationship =>
      relationship.sourceOrganizationId === profile.organizationId || relationship.targetOrganizationId === profile.organizationId
    ).length;

    return {
      id: `node-${profile.organizationId}`,
      organizationId: profile.organizationId,
      uniqueIdentifier: profile.uniqueIdentifier,
      displayName: profile.displayName ?? profile.legalName,
      alias: profile.alias,
      logoUrl: profile.logoUrl,
      organizationStatus: profile.status,
      eligibilityStatus: profile.eligibilityStatus,
      relationshipToCurrentOrg,
      relationshipRole: profile.organizationId === currentOrganizationId ? 'mixed' as const : 'mixed' as const,
      activeDealCount,
      lastInteractionAt: profile.updatedAt,
      profileSummary: profile.publicProfileSummary,
      proofChannelSummary: relationshipToCurrentOrg === 'self'
        ? 'Current organization proof activity'
        : 'Shared proof metadata visible by relationship scope',
    };
  }

  private relationshipToEdge(relationship: RelationshipRecord): OrganizationGraphEdge {
    const latestPayloadHash = hashPayload({
      relationshipId: relationship.relationshipId,
      sourceOrganizationId: relationship.sourceOrganizationId,
      targetOrganizationId: relationship.targetOrganizationId,
      relationshipType: relationship.relationshipType,
    });

    return {
      id: relationship.relationshipId,
      sourceOrganizationId: relationship.sourceOrganizationId,
      targetOrganizationId: relationship.targetOrganizationId,
      direction: 'outbound',
      relationshipType: relationshipTypeToGraphType(relationship.relationshipType),
      channelScope: relationship.channelScope,
      fabricChannelName: channelNameFor(relationship.channelScope),
      privateDataCollectionName: relationship.channelScope === 'privateChannelC' ? 'relationshipPrivateMetadata' : undefined,
      currentStage: 'networkEstablished',
      latestLifecycleEventId: `networkRelationship:${relationship.relationshipId}`,
      latestPayloadHash,
      anchorStatus: relationship.channelScope === 'localProofOnly' ? 'notAnchored' : 'anchored',
      verificationStatus: relationship.channelScope === 'localProofOnly' ? 'unavailable' : 'verified',
      safeSummary: 'Network relationship is visible by organization relationship scope.',
    };
  }

  private requestToEdge(request: OrganizationNetworkRequest): OrganizationGraphEdge {
    return {
      id: request.requestId,
      sourceOrganizationId: request.requesterOrganizationId,
      targetOrganizationId: request.targetOrganizationId,
      direction: 'outbound',
      relationshipType: relationshipTypeToGraphType(request.relationshipType),
      channelScope: 'localProofOnly',
      currentStage: 'networkRequestSent',
      latestLifecycleEventId: `networkRequest:${request.requestId}`,
      latestPayloadHash: hashPayload({
        requestId: request.requestId,
        relationshipType: request.relationshipType,
        state: request.state,
      }),
      anchorStatus: 'pending',
      verificationStatus: 'unavailable',
      safeSummary: 'Network request is pending acceptance. No private terms are exposed.',
    };
  }

  private edgeToTrailEntry(edge: OrganizationGraphEdge): OrganizationGraphTrailEntry {
    return {
      lifecycleEventId: edge.latestLifecycleEventId ?? `organizationNetwork:${edge.id}`,
      eventType: edge.currentStage,
      timestamp: new Date().toISOString(),
      payloadHash: edge.latestPayloadHash ?? hashPayload(edge.id),
      anchorStatus: edge.anchorStatus ?? 'notAnchored',
      verificationStatus: edge.verificationStatus ?? 'unavailable',
      channelScope: edge.channelScope,
      relatedRecordType: edge.id.startsWith('network_request_') ? 'organizationNetworkRequest' : 'organizationRelationship',
      relatedRecordId: edge.id,
    };
  }

  private recordEmail(input: Omit<EmailNotificationRecord, 'notificationId' | 'status' | 'createdAt'>) {
    const notification: EmailNotificationRecord = {
      ...input,
      notificationId: `email_${randomUUID()}`,
      status: 'queued',
      createdAt: new Date().toISOString(),
    };
    this.emailNotifications.set(notification.notificationId, notification);
  }
}
