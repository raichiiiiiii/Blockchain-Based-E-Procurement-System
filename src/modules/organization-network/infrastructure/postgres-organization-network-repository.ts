import { createHash, randomUUID } from 'node:crypto';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString } from '../../../infrastructure/database/postgres-row-utils.js';
import type {
  CreateNetworkRequestInput,
  DecideNetworkRequestInput,
  OrganizationNetworkRepository,
  RegisterOrganizationInput,
  UpdateOrganizationProfileInput,
} from '../application/organization-network-repository.js';
import type {
  EmailNotificationRecord,
  EmailNotificationStatus,
  OrganizationEligibilityStatus,
  OrganizationGraphChannelScope,
  OrganizationGraphEdge,
  OrganizationGraphNode,
  OrganizationGraphProjection,
  OrganizationGraphRelationshipType,
  OrganizationGraphTrailEntry,
  OrganizationNetworkRequest,
  OrganizationNetworkRequestState,
  OrganizationProfile,
  OrganizationRelationshipIntent,
} from '../domain/organization-network.js';

type OrganizationProfileRow = {
  id: string;
  legal_name: string;
  display_name: string | null;
  alias: string | null;
  unique_identifier: string | null;
  logo_url: string | null;
  status: OrganizationProfile['status'];
  business_category: string | null;
  business_type: string | null;
  public_profile_summary: string | null;
  contact_email: string | null;
  registration_number: string;
  created_at: Date | string;
  updated_at: Date | string;
  onboarding_status: string | null;
};

type NetworkRequestRow = {
  request_id: string;
  requester_organization_id: string;
  target_organization_id: string;
  target_unique_identifier: string;
  relationship_type: OrganizationRelationshipIntent;
  message: string | null;
  purpose: string | null;
  state: OrganizationNetworkRequestState;
  created_by_user_id: string;
  decided_by_user_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  decided_at: Date | string | null;
};

type RelationshipRow = {
  relationship_id: string;
  source_organization_id: string;
  target_organization_id: string;
  relationship_type: OrganizationRelationshipIntent;
  channel_scope: OrganizationGraphChannelScope;
  created_at: Date | string;
  updated_at: Date | string;
};

type EmailNotificationRow = {
  notification_id: string;
  recipient_organization_id: string;
  recipient_user_id: string | null;
  recipient_email: string | null;
  template_key: string;
  subject: string;
  safe_body: string;
  related_entity_type: string;
  related_entity_id: string;
  status: EmailNotificationStatus;
  created_at: Date | string;
  sent_at: Date | string | null;
  failure_reason: string | null;
};

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function hashPayload(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function eligibilityFromOnboarding(status: string | null): OrganizationEligibilityStatus {
  switch (status) {
    case 'approved':
      return 'eligible';
    case 'flagged':
      return 'flagged';
    case 'blocked':
    case 'rejected':
      return 'blocked';
    case 'submitted':
    default:
      return 'unknown';
  }
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
    case 'financier':
      return 'privateChannelC';
    case 'auditorRegulator':
      return 'sharedChannelB';
    case 'logistics':
      return 'localProofOnly';
    case 'mixed':
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

function toProfile(row: OrganizationProfileRow): OrganizationProfile {
  return {
    organizationId: row.id,
    legalName: row.legal_name,
    displayName: row.display_name ?? undefined,
    alias: row.alias ?? undefined,
    uniqueIdentifier: row.unique_identifier ?? row.registration_number,
    logoUrl: row.logo_url ?? undefined,
    status: row.status,
    eligibilityStatus: eligibilityFromOnboarding(row.onboarding_status),
    businessCategory: row.business_category ?? row.business_type ?? undefined,
    publicProfileSummary: row.public_profile_summary ?? undefined,
    contactEmail: row.contact_email ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };
}

function toNetworkRequest(row: NetworkRequestRow): OrganizationNetworkRequest {
  return {
    requestId: row.request_id,
    requesterOrganizationId: row.requester_organization_id,
    targetOrganizationId: row.target_organization_id,
    targetUniqueIdentifier: row.target_unique_identifier,
    relationshipType: row.relationship_type,
    message: row.message ?? undefined,
    purpose: row.purpose ?? undefined,
    state: row.state,
    createdByUserId: row.created_by_user_id,
    decidedByUserId: row.decided_by_user_id ?? undefined,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    decidedAt: row.decided_at ? toIsoString(row.decided_at) : undefined,
  };
}

function toEmailNotification(row: EmailNotificationRow): EmailNotificationRecord {
  return {
    notificationId: row.notification_id,
    recipientOrganizationId: row.recipient_organization_id,
    recipientUserId: row.recipient_user_id ?? undefined,
    recipientEmail: row.recipient_email ?? undefined,
    templateKey: row.template_key,
    subject: row.subject,
    safeBody: row.safe_body,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    sentAt: row.sent_at ? toIsoString(row.sent_at) : undefined,
    failureReason: row.failure_reason ?? undefined,
  };
}

function publicProfile(profile: OrganizationProfile) {
  const { contactEmail: _contactEmail, ...safeProfile } = profile;
  return safeProfile;
}

export class PostgresOrganizationNetworkRepository implements OrganizationNetworkRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async registerOrganization(input: RegisterOrganizationInput) {
    const duplicateIdentifier = await this.searchPublicProfileByUniqueIdentifier(input.uniqueIdentifier);
    if (duplicateIdentifier) {
      return { status: 'duplicateIdentifier' as const };
    }

    const duplicateUsername = await this.db.query(
      'SELECT 1 FROM platform_user_credentials WHERE username = $1',
      [input.primaryAdminUsername],
    );
    if ((duplicateUsername.rowCount ?? 0) > 0) {
      return { status: 'duplicateUsername' as const };
    }

    const now = new Date().toISOString();
    const organizationId = `org_${randomUUID()}`;
    const primaryAdminUserId = `user_${randomUUID()}`;
    const onboardingCaseId = `kyc_${organizationId}`;
    const roleId = 'role_organizationAdmin';
    const registrationNumber = input.registrationNumber ?? input.uniqueIdentifier;

    await this.db.query('BEGIN');
    try {
      await this.db.query(
        `
          INSERT INTO member_organizations (
            id,
            registration_number,
            legal_name,
            display_name,
            organization_type,
            business_type,
            contact_email,
            status,
            alias,
            unique_identifier,
            logo_url,
            business_category,
            public_profile_summary,
            created_at,
            updated_at
          )
          VALUES ($1, $2, $3, $4, 'business', $5, $6, 'pendingReview', $4, $7, $8, $5, $9, $10, $10)
        `,
        [
          organizationId,
          registrationNumber,
          input.legalName,
          input.alias,
          input.businessCategory,
          input.contactEmail,
          input.uniqueIdentifier,
          input.logoUrl ?? null,
          input.publicProfileSummary ?? null,
          now,
        ],
      );

      await this.db.query(
        `
          INSERT INTO platform_users (user_id, display_name, status, created_at, updated_at)
          VALUES ($1, $2, 'active', $3, $3)
        `,
        [primaryAdminUserId, input.primaryAdminDisplayName ?? input.primaryAdminUsername, now],
      );

      await this.db.query(
        `
          INSERT INTO platform_user_credentials (user_id, username, password_hash, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $4)
        `,
        [primaryAdminUserId, input.primaryAdminUsername, hashPassword(input.primaryAdminPassword), now],
      );

      await this.db.query(
        `
          INSERT INTO roles (id, role_code, display_name, scope, description, permissions, status, is_system_reserved, created_at, updated_at)
          VALUES ($1, 'organizationAdmin', 'Organization Admin', 'organization', 'Manage organization profile, network relationships, and local users.', '["organization:manage","network:manage"]'::jsonb, 'active', true, $2, $2)
          ON CONFLICT (role_code, scope)
          DO UPDATE SET
            display_name = EXCLUDED.display_name,
            description = EXCLUDED.description,
            status = EXCLUDED.status,
            updated_at = EXCLUDED.updated_at
        `,
        [roleId, now],
      );

      await this.db.query(
        `
          INSERT INTO organization_memberships (user_id, organization_id, status, created_at, updated_at)
          VALUES ($1, $2, 'active', $3, $3)
        `,
        [primaryAdminUserId, organizationId, now],
      );

      await this.db.query(
        `
          INSERT INTO role_assignments (user_id, organization_id, role_id, status, created_at, updated_at)
          VALUES ($1, $2, $3, 'active', $4, $4)
        `,
        [primaryAdminUserId, organizationId, roleId, now],
      );

      await this.db.query(
        `
          INSERT INTO kyc_aml_onboarding_cases (
            case_id,
            member_organization_id,
            kyc,
            aml,
            evidence_references,
            status,
            submitted_by_user_id,
            created_at,
            updated_at
          )
          VALUES ($1, $2, '{"status":"pending","source":"organization-registration"}'::jsonb, '{"status":"pending","source":"organization-registration"}'::jsonb, '[]'::jsonb, 'submitted', $3, $4, $4)
        `,
        [onboardingCaseId, organizationId, primaryAdminUserId, now],
      );

      await this.db.query('COMMIT');
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }

    const profile = await this.findProfileByOrganizationId(organizationId);
    if (!profile) {
      throw new Error('Registered organization could not be read back');
    }

    return {
      status: 'registered' as const,
      registration: {
        organization: profile,
        primaryAdminUserId,
        onboardingCaseId,
      },
    };
  }

  async findProfileByOrganizationId(organizationId: string) {
    const result = await this.db.query<OrganizationProfileRow>(
      `
        SELECT
          organizations.*,
          latest_case.status AS onboarding_status
        FROM member_organizations organizations
        LEFT JOIN LATERAL (
          SELECT status
          FROM kyc_aml_onboarding_cases cases
          WHERE cases.member_organization_id = organizations.id
          ORDER BY cases.updated_at DESC, cases.case_id DESC
          LIMIT 1
        ) latest_case ON TRUE
        WHERE organizations.id = $1
      `,
      [organizationId],
    );

    return result.rows[0] ? toProfile(result.rows[0]) : null;
  }

  async updateProfile(organizationId: string, input: UpdateOrganizationProfileInput) {
    const current = await this.findProfileByOrganizationId(organizationId);
    if (!current) {
      return null;
    }

    await this.db.query(
      `
        UPDATE member_organizations
        SET
          display_name = COALESCE($2, display_name),
          alias = COALESCE($2, alias),
          logo_url = COALESCE($3, logo_url),
          business_category = COALESCE($4, business_category),
          business_type = COALESCE($4, business_type),
          public_profile_summary = COALESCE($5, public_profile_summary),
          contact_email = COALESCE($6, contact_email),
          updated_at = now()
        WHERE id = $1
      `,
      [
        organizationId,
        input.alias ?? null,
        input.logoUrl ?? null,
        input.businessCategory ?? null,
        input.publicProfileSummary ?? null,
        input.contactEmail ?? null,
      ],
    );

    return this.findProfileByOrganizationId(organizationId);
  }

  async searchPublicProfileByUniqueIdentifier(identifier: string) {
    const result = await this.db.query<OrganizationProfileRow>(
      `
        SELECT
          organizations.*,
          latest_case.status AS onboarding_status
        FROM member_organizations organizations
        LEFT JOIN LATERAL (
          SELECT status
          FROM kyc_aml_onboarding_cases cases
          WHERE cases.member_organization_id = organizations.id
          ORDER BY cases.updated_at DESC, cases.case_id DESC
          LIMIT 1
        ) latest_case ON TRUE
        WHERE lower(COALESCE(organizations.unique_identifier, organizations.registration_number)) = lower($1)
      `,
      [identifier],
    );

    return result.rows[0] ? publicProfile(toProfile(result.rows[0])) : null;
  }

  async createNetworkRequest(input: CreateNetworkRequestInput) {
    const target = await this.searchPublicProfileByUniqueIdentifier(input.targetUniqueIdentifier);
    if (!target) {
      return { status: 'targetNotFound' as const };
    }

    if (target.organizationId === input.requesterOrganizationId) {
      return { status: 'selfRequest' as const };
    }

    const duplicate = await this.db.query(
      `
        SELECT 1
        FROM organization_network_requests
        WHERE requester_organization_id = $1
          AND target_organization_id = $2
          AND state IN ('sent', 'received')
      `,
      [input.requesterOrganizationId, target.organizationId],
    );
    if ((duplicate.rowCount ?? 0) > 0) {
      return { status: 'duplicateActiveRequest' as const };
    }

    const now = new Date().toISOString();
    const requestId = `network_request_${randomUUID()}`;
    const result = await this.db.query<NetworkRequestRow>(
      `
        INSERT INTO organization_network_requests (
          request_id,
          requester_organization_id,
          target_organization_id,
          target_unique_identifier,
          relationship_type,
          message,
          purpose,
          state,
          created_by_user_id,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'sent', $8, $9, $9)
        RETURNING *
      `,
      [
        requestId,
        input.requesterOrganizationId,
        target.organizationId,
        target.uniqueIdentifier,
        input.relationshipType,
        input.message ?? null,
        input.purpose ?? null,
        input.createdByUserId,
        now,
      ],
    );

    await this.recordEmail({
      recipientOrganizationId: target.organizationId,
      templateKey: 'networkRequestSent',
      subject: 'Network request received',
      safeBody: 'A verified platform organization requested network establishment.',
      relatedEntityType: 'organizationNetworkRequest',
      relatedEntityId: requestId,
    });

    return { status: 'created' as const, request: toNetworkRequest(result.rows[0]) };
  }

  async listNetworkRequestsForOrganization(organizationId: string) {
    const result = await this.db.query<NetworkRequestRow>(
      `
        SELECT *
        FROM organization_network_requests
        WHERE requester_organization_id = $1
           OR target_organization_id = $1
        ORDER BY updated_at DESC, request_id ASC
      `,
      [organizationId],
    );

    return result.rows.map(row => toNetworkRequest(row));
  }

  async acceptNetworkRequest(input: DecideNetworkRequestInput) {
    return this.decideNetworkRequest(input, 'accepted');
  }

  async rejectNetworkRequest(input: DecideNetworkRequestInput) {
    return this.decideNetworkRequest(input, 'rejected');
  }

  private async decideNetworkRequest(input: DecideNetworkRequestInput, decision: 'accepted' | 'rejected') {
    const existing = await this.db.query<NetworkRequestRow>(
      'SELECT * FROM organization_network_requests WHERE request_id = $1',
      [input.requestId],
    );

    if (!existing.rows[0]) {
      return { status: 'notFound' as const };
    }

    const request = toNetworkRequest(existing.rows[0]);
    if (request.targetOrganizationId !== input.actorOrganizationId) {
      return { status: 'forbidden' as const };
    }

    if (!['sent', 'received'].includes(request.state)) {
      return { status: 'notActionable' as const };
    }

    const now = new Date().toISOString();
    await this.db.query('BEGIN');
    try {
      const updated = await this.db.query<NetworkRequestRow>(
        `
          UPDATE organization_network_requests
          SET state = $2,
              decided_by_user_id = $3,
              decided_at = $4,
              updated_at = $4
          WHERE request_id = $1
          RETURNING *
        `,
        [input.requestId, decision, input.actorUserId, now],
      );

      if (decision === 'accepted') {
        await this.db.query(
          `
            INSERT INTO organization_network_relationships (
              relationship_id,
              source_organization_id,
              target_organization_id,
              relationship_type,
              channel_scope,
              status,
              created_at,
              updated_at
            )
            VALUES ($1, $2, $3, $4, $5, 'active', $6, $6)
            ON CONFLICT DO NOTHING
          `,
          [
            `rel_${randomUUID()}`,
            request.requesterOrganizationId,
            request.targetOrganizationId,
            request.relationshipType,
            relationshipTypeToChannelScope(request.relationshipType),
            now,
          ],
        );
      }

      await this.recordEmail({
        recipientOrganizationId: request.requesterOrganizationId,
        templateKey: decision === 'accepted' ? 'networkRequestAccepted' : 'networkRequestRejected',
        subject: decision === 'accepted' ? 'Network request accepted' : 'Network request rejected',
        safeBody: decision === 'accepted'
          ? 'A network relationship request was accepted.'
          : 'A network relationship request was not accepted.',
        relatedEntityType: 'organizationNetworkRequest',
        relatedEntityId: request.requestId,
      });

      await this.db.query('COMMIT');
      return { status: decision, request: toNetworkRequest(updated.rows[0]) } as
        | { status: 'accepted'; request: OrganizationNetworkRequest }
        | { status: 'rejected'; request: OrganizationNetworkRequest };
    } catch (error) {
      await this.db.query('ROLLBACK');
      throw error;
    }
  }

  async getGraphForOrganization(organizationId: string): Promise<OrganizationGraphProjection> {
    const nodes = new Map<string, OrganizationGraphNode>();
    const edges: OrganizationGraphEdge[] = [];
    const current = await this.findProfileByOrganizationId(organizationId);
    if (current) {
      nodes.set(organizationId, this.profileToNode(current, organizationId, 'self'));
    }

    const relationships = await this.db.query<RelationshipRow>(
      `
        SELECT *
        FROM organization_network_relationships
        WHERE status = 'active'
          AND (source_organization_id = $1 OR target_organization_id = $1)
        ORDER BY updated_at DESC, relationship_id ASC
      `,
      [organizationId],
    );

    for (const row of relationships.rows) {
      const source = await this.findProfileByOrganizationId(row.source_organization_id);
      const target = await this.findProfileByOrganizationId(row.target_organization_id);
      if (!source || !target) {
        continue;
      }

      nodes.set(source.organizationId, this.profileToNode(source, organizationId, source.organizationId === organizationId ? 'self' : 'connected'));
      nodes.set(target.organizationId, this.profileToNode(target, organizationId, target.organizationId === organizationId ? 'self' : 'connected'));
      edges.push(this.relationshipRowToEdge(row));
    }

    const requests = await this.listNetworkRequestsForOrganization(organizationId);
    for (const request of requests.filter(candidate => ['sent', 'received'].includes(candidate.state))) {
      const requester = await this.findProfileByOrganizationId(request.requesterOrganizationId);
      const target = await this.findProfileByOrganizationId(request.targetOrganizationId);
      if (!requester || !target) {
        continue;
      }

      nodes.set(requester.organizationId, this.profileToNode(
        requester,
        organizationId,
        requester.organizationId === organizationId ? 'self' : 'pendingInbound',
      ));
      nodes.set(target.organizationId, this.profileToNode(
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
    const result = await this.db.query<EmailNotificationRow>(
      `
        SELECT *
        FROM outgoing_email_notifications
        WHERE $2::BOOLEAN = TRUE
           OR recipient_organization_id = $1
        ORDER BY created_at DESC, notification_id ASC
      `,
      [organizationId, options?.includeGovernanceView ?? false],
    );

    return result.rows.map(row => toEmailNotification(row));
  }

  private async recordEmail(input: {
    recipientOrganizationId: string;
    templateKey: string;
    subject: string;
    safeBody: string;
    relatedEntityType: string;
    relatedEntityId: string;
  }) {
    await this.db.query(
      `
        INSERT INTO outgoing_email_notifications (
          notification_id,
          recipient_organization_id,
          template_key,
          subject,
          safe_body,
          related_entity_type,
          related_entity_id,
          status,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', $8)
      `,
      [
        `email_${randomUUID()}`,
        input.recipientOrganizationId,
        input.templateKey,
        input.subject,
        input.safeBody,
        input.relatedEntityType,
        input.relatedEntityId,
        new Date().toISOString(),
      ],
    );
  }

  private profileToNode(
    profile: OrganizationProfile,
    currentOrganizationId: string,
    relationshipToCurrentOrg: OrganizationGraphNode['relationshipToCurrentOrg'],
  ): OrganizationGraphNode {
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
      relationshipRole: profile.organizationId === currentOrganizationId ? 'mixed' : 'mixed',
      activeDealCount: 0,
      lastInteractionAt: profile.updatedAt,
      profileSummary: profile.publicProfileSummary,
      proofChannelSummary: relationshipToCurrentOrg === 'self'
        ? 'Current organization proof activity'
        : 'Shared proof metadata visible by relationship scope',
    };
  }

  private relationshipRowToEdge(row: RelationshipRow): OrganizationGraphEdge {
    return {
      id: row.relationship_id,
      sourceOrganizationId: row.source_organization_id,
      targetOrganizationId: row.target_organization_id,
      direction: 'outbound',
      relationshipType: relationshipTypeToGraphType(row.relationship_type),
      channelScope: row.channel_scope,
      fabricChannelName: channelNameFor(row.channel_scope),
      privateDataCollectionName: row.channel_scope === 'privateChannelC' ? 'relationshipPrivateMetadata' : undefined,
      currentStage: 'networkEstablished',
      latestLifecycleEventId: `networkRelationship:${row.relationship_id}`,
      latestPayloadHash: hashPayload({
        relationshipId: row.relationship_id,
        sourceOrganizationId: row.source_organization_id,
        targetOrganizationId: row.target_organization_id,
        relationshipType: row.relationship_type,
      }),
      anchorStatus: row.channel_scope === 'localProofOnly' ? 'notAnchored' : 'anchored',
      verificationStatus: row.channel_scope === 'localProofOnly' ? 'unavailable' : 'verified',
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
}
