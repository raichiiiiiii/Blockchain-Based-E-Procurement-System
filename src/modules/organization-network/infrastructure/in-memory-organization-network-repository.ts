import { createHash, randomUUID } from 'node:crypto';
import type {
  CreateNetworkRequestInput,
  DecideNetworkRequestInput,
  InviteOrganizationUserInput,
  OrganizationNetworkRepository,
  RegisterOrganizationInput,
  UpdateOrganizationProfileInput,
} from '../application/organization-network-repository.js';
import type {
  CompanyDashboardSummary,
  CompanyDealProjection,
  CompanyProofStatus,
  CompanyUserSummary,
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
  MudarabahWorkflowProjection,
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
  private readonly users = new Map<string, CompanyUserSummary & { organizationId: string }>();
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
        organizationId: 'demo-platform-org',
        legalName: 'PLS Procurement Platform',
        displayName: 'PLS Procurement',
        alias: 'Platform',
        uniqueIdentifier: 'platform',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Platform operator',
        publicProfileSummary: 'Platform operator account for governed workspace administration.',
        contactEmail: 'platform@example.test',
        createdAt: now,
        updatedAt: now,
      },
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
      {
        organizationId: 'demo-compliance-org',
        legalName: 'Demo Compliance Office',
        displayName: 'Compliance Office',
        alias: 'Compliance',
        uniqueIdentifier: 'compliance-office',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Compliance reviewer',
        publicProfileSummary: 'Compliance reviewer organization for KYC and eligibility decisions.',
        contactEmail: 'compliance@example.test',
        createdAt: now,
        updatedAt: now,
      },
      {
        organizationId: 'demo-shariah-org',
        legalName: 'Demo Shariah Review Office',
        displayName: 'Shariah Review Office',
        alias: 'Shariah',
        uniqueIdentifier: 'shariah-review-office',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Shariah reviewer',
        publicProfileSummary: 'Restricted PLS seedbed review organization.',
        contactEmail: 'shariah@example.test',
        createdAt: now,
        updatedAt: now,
      },
      {
        organizationId: 'demo-audit-org',
        legalName: 'Demo Audit Office',
        displayName: 'Audit Office',
        alias: 'Auditor',
        uniqueIdentifier: 'audit-office',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Auditor',
        publicProfileSummary: 'Auditor organization for proof and audit trail review.',
        contactEmail: 'auditor@example.test',
        createdAt: now,
        updatedAt: now,
      },
      {
        organizationId: 'demo-security-org',
        legalName: 'Demo Security Operations',
        displayName: 'Security Operations',
        alias: 'Security',
        uniqueIdentifier: 'security-operations',
        status: 'active',
        eligibilityStatus: 'eligible',
        businessCategory: 'Security operator',
        publicProfileSummary: 'Security operator organization for read-only access and proof alerts.',
        contactEmail: 'security@example.test',
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const profile of profiles) {
      this.profiles.set(profile.organizationId, profile);
    }

    const users: Array<CompanyUserSummary & { organizationId: string }> = [
      {
        userId: 'demo-admin-user',
        username: 'admin.demo',
        displayName: 'Demo Administrator',
        organizationId: 'demo-platform-org',
        membershipStatus: 'active',
        roleCodes: ['administrator'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-buyer-user',
        username: 'buyer.demo',
        displayName: 'Demo Buyer',
        organizationId: 'demo-buyer-org',
        membershipStatus: 'active',
        roleCodes: ['buyer'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-amanah-admin-user',
        username: 'amanah.admin',
        displayName: 'Amanah Company Admin',
        organizationId: 'demo-buyer-org',
        membershipStatus: 'active',
        roleCodes: ['organizationAdmin'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-supplier-user',
        username: 'supplier.demo',
        displayName: 'Demo Supplier',
        organizationId: 'demo-supplier-org',
        membershipStatus: 'active',
        roleCodes: ['supplier', 'organizationAdmin'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-financier-user',
        username: 'financier.demo',
        displayName: 'Demo Financier',
        organizationId: 'demo-financier-org',
        membershipStatus: 'active',
        roleCodes: ['financier', 'organizationAdmin'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-compliance-user',
        username: 'compliance.demo',
        displayName: 'Demo Compliance Reviewer',
        organizationId: 'demo-compliance-org',
        membershipStatus: 'active',
        roleCodes: ['complianceReviewer'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-shariah-user',
        username: 'shariah.demo',
        displayName: 'Demo Shariah Reviewer',
        organizationId: 'demo-shariah-org',
        membershipStatus: 'active',
        roleCodes: ['shariahReviewer'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-auditor-user',
        username: 'auditor.demo',
        displayName: 'Demo Auditor',
        organizationId: 'demo-audit-org',
        membershipStatus: 'active',
        roleCodes: ['auditor'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-regulator-user',
        username: 'regulator.demo',
        displayName: 'Demo Regulator',
        organizationId: 'demo-regulator-org',
        membershipStatus: 'active',
        roleCodes: ['regulator'],
        createdAt: now,
        updatedAt: now,
      },
      {
        userId: 'demo-security-user',
        username: 'security.demo',
        displayName: 'Demo Security Operator',
        organizationId: 'demo-security-org',
        membershipStatus: 'active',
        roleCodes: ['securityOperator'],
        createdAt: now,
        updatedAt: now,
      },
    ];

    for (const user of users) {
      this.users.set(user.userId, user);
      if (user.username) {
        this.usernames.add(user.username.toLowerCase());
      }
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
    this.users.set(primaryAdminUserId, {
      userId: primaryAdminUserId,
      username: input.primaryAdminUsername,
      displayName: input.primaryAdminDisplayName ?? input.primaryAdminUsername,
      organizationId,
      membershipStatus: 'active',
      roleCodes: ['organizationAdmin'],
      createdAt: now,
      updatedAt: now,
    });

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

  async getCompanyDashboardSummary(input: {
    organizationId: string;
    actorUserId: string;
    actorRoleCodes: string[];
  }): Promise<CompanyDashboardSummary | null> {
    const organization = await this.findProfileByOrganizationId(input.organizationId);
    if (!organization) {
      return null;
    }

    const graph = await this.getGraphForOrganization(input.organizationId);
    const relationshipRoles = graph.edges.map(edge => {
      const counterpartOrganizationId = edge.sourceOrganizationId === input.organizationId
        ? edge.targetOrganizationId
        : edge.sourceOrganizationId;
      const counterpart = this.profiles.get(counterpartOrganizationId);
      return {
        relationshipId: edge.id,
        relationshipRole: this.graphTypeToRelationshipIntent(edge.relationshipType),
        counterpartOrganizationId,
        counterpartDisplayName: counterpart?.displayName ?? counterpart?.legalName ?? counterpartOrganizationId,
        channelScope: edge.channelScope,
        currentStage: edge.currentStage,
      };
    });

    return {
      organization,
      currentUser: {
        userId: input.actorUserId,
        roleCodes: input.actorRoleCodes,
      },
      relationshipRoles,
      activeDealCount: (await this.listCompanyDealProjections(input.organizationId)).length,
      latestProofStatus: this.latestProofStatus(graph.edges.map(edge => edge.verificationStatus ?? edge.anchorStatus)),
    };
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

  async listOrganizationUsers(organizationId: string) {
    return [...this.users.values()]
      .filter(user => user.organizationId === organizationId)
      .sort((a, b) => (a.displayName ?? a.userId).localeCompare(b.displayName ?? b.userId))
      .map(({ organizationId: _organizationId, ...user }) => ({ ...user }));
  }

  async inviteOrganizationUser(input: InviteOrganizationUserInput) {
    if (!this.profiles.has(input.organizationId)) {
      return { status: 'organizationNotFound' as const };
    }

    if (this.usernames.has(input.username.toLowerCase())) {
      return { status: 'duplicateUsername' as const };
    }

    const now = new Date().toISOString();
    const userId = `user_${randomUUID()}`;
    const user: CompanyUserSummary & { organizationId: string } = {
      userId,
      username: input.username,
      displayName: input.displayName,
      organizationId: input.organizationId,
      membershipStatus: 'invited',
      roleCodes: input.roleCodes,
      createdAt: now,
      updatedAt: now,
    };
    this.users.set(userId, user);
    this.usernames.add(input.username.toLowerCase());
    this.recordEmail({
      recipientOrganizationId: input.organizationId,
      recipientUserId: userId,
      templateKey: 'organizationUserInvited',
      subject: 'Workspace access prepared',
      safeBody: 'Organization access was prepared for a company user. Credentials are issued through the operator process.',
      relatedEntityType: 'organizationUser',
      relatedEntityId: userId,
    });

    const { organizationId: _organizationId, ...summary } = user;
    return { status: 'created' as const, user: summary };
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

  async listCompanyDealProjections(organizationId: string): Promise<CompanyDealProjection[]> {
    if (!['demo-buyer-org', 'demo-supplier-org', 'demo-financier-org'].includes(organizationId)) {
      return [];
    }

    const buyer = this.profiles.get('demo-buyer-org');
    const supplier = this.profiles.get('demo-supplier-org');
    const financier = this.profiles.get('demo-financier-org');
    const isSupplier = organizationId === 'demo-supplier-org';
    const isFinancier = organizationId === 'demo-financier-org';
    const counterpart = isSupplier ? buyer : isFinancier ? buyer : supplier;
    const relationship: CompanyDealProjection['relationship'] = isSupplier
      ? 'supplierToBuyer'
      : isFinancier
        ? 'financing'
        : 'buyerToSupplier';

    return [{
      dealId: 'deal-amanah-barakah-packaging',
      relationshipId: isFinancier ? 'rel-mabrur-amanah' : 'rel-amanah-barakah',
      title: 'Halal packaging procurement',
      counterpartOrganizationId: counterpart?.organizationId ?? 'demo-supplier-org',
      counterpartDisplayName: counterpart?.displayName ?? counterpart?.legalName ?? 'Counterparty',
      relationship,
      orderId: 'demo-order-001',
      orderStatus: 'accepted',
      deliveryEvidenceStatus: 'metadataRecorded',
      escrowId: 'demo-escrow-001',
      escrowStatus: 'escrowCreated',
      proofStatus: 'pending',
      proofEventId: 'demo-delivery-event-001',
      proofPayloadHash: 'sha256:demo-delivery-event-hash',
      financingStatus: 'approvedForActivation',
      latestLifecycleEvent: 'deliveryEvidenceSubmitted',
      updatedAt: '2026-05-31T00:00:00.000Z',
      safeSummary: 'Company-visible deal projection links accepted order, delivery evidence metadata, escrow state, and restricted PLS readiness without exposing private terms.',
    }];
  }

  async listMudarabahWorkflowProjections(organizationId: string): Promise<MudarabahWorkflowProjection[]> {
    if (!['demo-buyer-org', 'demo-supplier-org', 'demo-financier-org', 'demo-shariah-org'].includes(organizationId)) {
      return [{
        projectionId: `mudarabah-none-${organizationId}`,
        status: 'noFinancing',
        simulationOnlyNotice: 'No Mudarabah or PLS seedbed projection is linked to this company context.',
      }];
    }

    return [{
      projectionId: 'mudarabah-amanah-barakah',
      dealId: 'deal-amanah-barakah-packaging',
      contractId: 'pls-demo-halal-packaging',
      procurementReference: 'demo-order-001',
      buyerOrganizationId: 'demo-buyer-org',
      supplierOrganizationId: 'demo-supplier-org',
      financierOrganizationId: 'demo-financier-org',
      status: 'approvedForActivation',
      capitalAmount: '68000.00',
      currency: 'MYR',
      financierSharePercent: 60,
      ventureOperatorSharePercent: 40,
      shariahReference: 'review-demo-approved',
      certificateReference: 'shariah-certificate-mudarabah-v1',
      simulationOnlyNotice: 'Restricted Mudarabah seedbed projection only. It does not guarantee profit or principal, execute payment, or claim formal external Shariah certification.',
      updatedAt: '2026-05-31T00:00:00.000Z',
    }];
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

  private graphTypeToRelationshipIntent(type: OrganizationGraphRelationshipType): OrganizationRelationshipIntent {
    switch (type) {
      case 'financing':
        return 'financier';
      case 'logistics':
        return 'logistics';
      case 'regulatory':
      case 'audit':
        return 'auditorRegulator';
      case 'mixed':
        return 'mixed';
      case 'buyerSupplier':
      default:
        return 'buyer';
    }
  }

  private latestProofStatus(statuses: Array<string | undefined>): CompanyProofStatus {
    if (statuses.includes('mismatch')) {
      return 'mismatch';
    }

    if (statuses.includes('failed')) {
      return 'failed';
    }

    if (statuses.includes('verified')) {
      return 'verified';
    }

    if (statuses.includes('anchored')) {
      return 'anchored';
    }

    if (statuses.includes('pending')) {
      return 'pending';
    }

    if (statuses.includes('notFound')) {
      return 'notFound';
    }

    if (statuses.includes('notAnchored')) {
      return 'notAnchored';
    }

    return 'unavailable';
  }
}
