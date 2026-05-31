import type { FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify';
import { getRequestActorContext } from '../../auth/api/request-actor-context.js';
import type { OrganizationNetworkRepository } from '../application/organization-network-repository.js';
import type {
  CompanyChannelMatrixEntry,
  CompanyProofStatus,
  OrganizationGraphChannelScope,
  OrganizationGraphEdge,
  OrganizationGraphNode,
  OrganizationGraphProjection,
  OrganizationGraphRelationshipType,
  OrganizationRelationshipIntent,
} from '../domain/organization-network.js';
import {
  acceptOrganizationNetworkRequest,
  createOrganizationNetworkRequest,
  inviteOrganizationUser,
  registerOrganization,
  rejectOrganizationNetworkRequest,
  updateOrganizationProfile,
} from '../application/organization-network-service.js';

type OrganizationNetworkRoutesOptions = {
  repository: OrganizationNetworkRepository;
  authenticatedPreHandler?: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>;
};

type RequiredActorContext = {
  actorUserId: string;
  actorOrganizationId: string;
  actorRoleCodes: string[];
};

function isValidationEnvelope(value: unknown): value is { error: { code: 'VALIDATION_ERROR' } } {
  return Boolean(
    value
    && typeof value === 'object'
    && 'error' in value
    && (value as { error?: { code?: unknown } }).error?.code === 'VALIDATION_ERROR'
  );
}

function hasAnyRole(actorRoles: readonly string[], allowedRoles: readonly string[]): boolean {
  return actorRoles.some(role => allowedRoles.includes(role));
}

function canManageOrganization(actorRoles: readonly string[]): boolean {
  return hasAnyRole(actorRoles, ['administrator', 'organizationAdmin']);
}

function canRequestNetwork(actorRoles: readonly string[]): boolean {
  return hasAnyRole(actorRoles, [
    'administrator',
    'organizationAdmin',
    'buyer',
    'supplier',
    'financier',
  ]);
}

function canGovernanceRead(actorRoles: readonly string[]): boolean {
  return hasAnyRole(actorRoles, [
    'administrator',
    'auditor',
    'regulator',
    'securityOperator',
  ]);
}

function canViewCompanyLedger(actorRoles: readonly string[]): boolean {
  return hasAnyRole(actorRoles, [
    'administrator',
    'organizationAdmin',
    'buyer',
    'supplier',
    'financier',
    'complianceReviewer',
    'auditor',
    'regulator',
    'securityOperator',
    'shariahReviewer',
  ]);
}

function graphTypeToRelationshipIntent(type: OrganizationGraphRelationshipType): OrganizationRelationshipIntent {
  switch (type) {
    case 'financing':
      return 'financier';
    case 'logistics':
      return 'logistics';
    case 'audit':
    case 'regulatory':
      return 'auditorRegulator';
    case 'mixed':
      return 'mixed';
    case 'buyerSupplier':
    default:
      return 'buyer';
  }
}

function nodeTypeFor(node: OrganizationGraphNode): NonNullable<OrganizationGraphNode['nodeType']> {
  if (node.relationshipToCurrentOrg === 'self') {
    return 'organization';
  }

  switch (node.relationshipRole) {
    case 'buyer':
      return 'buyer';
    case 'supplier':
      return 'supplier';
    case 'financier':
      return 'financier';
    case 'auditor':
      return 'auditor';
    case 'regulator':
      return 'regulator';
    case 'logistics':
      return 'logisticsProofProvider';
    case 'mixed':
    default:
      return 'organization';
  }
}

function edgeTypeFor(edge: OrganizationGraphEdge): NonNullable<OrganizationGraphEdge['edgeType']> {
  switch (edge.relationshipType) {
    case 'buyerSupplier':
      return 'buyerSupplier';
    case 'financing':
      return 'financing';
    case 'audit':
      return 'audit';
    case 'regulatory':
      return 'oversight';
    case 'logistics':
      return 'deliveryProof';
    case 'mixed':
    default:
      return edge.channelScope === 'localProofOnly' ? 'integration' : 'proofAnchoring';
  }
}

function topologyBoundaryNode(input: {
  id: string;
  displayName: string;
  uniqueIdentifier: string;
  nodeType: NonNullable<OrganizationGraphNode['nodeType']>;
  summary: string;
}): OrganizationGraphNode {
  return {
    id: `node-${input.id}`,
    nodeType: input.nodeType,
    organizationId: input.id,
    uniqueIdentifier: input.uniqueIdentifier,
    displayName: input.displayName,
    organizationStatus: 'active',
    eligibilityStatus: 'unknown',
    relationshipToCurrentOrg: 'connected',
    relationshipRole: 'mixed',
    activeDealCount: 0,
    profileSummary: input.summary,
    proofChannelSummary: 'Boundary node for internal-pilot topology visibility. No production network certification is implied.',
  };
}

function topologyBoundaryEdge(input: {
  id: string;
  currentOrganizationId: string;
  targetOrganizationId: string;
  edgeType: NonNullable<OrganizationGraphEdge['edgeType']>;
  relationshipType: OrganizationGraphRelationshipType;
  currentStage: string;
  safeSummary: string;
}): OrganizationGraphEdge {
  return {
    id: input.id,
    edgeType: input.edgeType,
    sourceOrganizationId: input.currentOrganizationId,
    targetOrganizationId: input.targetOrganizationId,
    direction: 'outbound',
    relationshipType: input.relationshipType,
    channelScope: 'localProofOnly',
    currentStage: input.currentStage,
    latestLifecycleEventId: `topology:${input.id}`,
    anchorStatus: 'notAnchored',
    verificationStatus: 'unavailable',
    claimBoundary: 'Topology projection only; this is not a production Fabric consortium, ERP integration, logistics network, or external legal proof.',
    safeSummary: input.safeSummary,
  };
}

function enrichGraphTopology(graph: OrganizationGraphProjection): OrganizationGraphProjection {
  const nodes = graph.nodes.map(node => ({
    ...node,
    nodeType: node.nodeType ?? nodeTypeFor(node),
  }));
  const edges = graph.edges.map(edge => ({
    ...edge,
    edgeType: edge.edgeType ?? edgeTypeFor(edge),
    claimBoundary: edge.claimBoundary ?? 'Relationship proof metadata only; no production consortium or external integration claim is implied.',
  }));

  const boundaryNodes = [
    topologyBoundaryNode({
      id: 'topology-fabric-proof-boundary',
      displayName: 'Fabric proof boundary',
      uniqueIdentifier: 'fabric-proof-boundary',
      nodeType: 'fabricProofBoundary',
      summary: 'Proof anchoring boundary for hashes and metadata only.',
    }),
    topologyBoundaryNode({
      id: 'topology-api-integration-client',
      displayName: 'API integration client',
      uniqueIdentifier: 'api-integration-client',
      nodeType: 'apiIntegrationClient',
      summary: 'Scoped external client boundary for future safe integrations.',
    }),
    topologyBoundaryNode({
      id: 'topology-erp-accounting-adapter',
      displayName: 'ERP and accounting adapter',
      uniqueIdentifier: 'erp-accounting-adapter',
      nodeType: 'erpAccountingAdapter',
      summary: 'Adapter boundary for local JSON/OCDS/UBL style mapping, not production ERP certification.',
    }),
    topologyBoundaryNode({
      id: 'topology-logistics-proof-provider',
      displayName: 'Logistics proof provider',
      uniqueIdentifier: 'logistics-proof-provider',
      nodeType: 'logisticsProofProvider',
      summary: 'Delivery proof intake boundary for safe metadata, not real logistics integration.',
    }),
  ];

  const boundaryEdges = [
    topologyBoundaryEdge({
      id: 'topology-proof-anchoring',
      currentOrganizationId: graph.currentOrganizationId,
      targetOrganizationId: 'topology-fabric-proof-boundary',
      edgeType: 'proofAnchoring',
      relationshipType: 'mixed',
      currentStage: 'proofBoundaryProjected',
      safeSummary: 'Only hashes and proof metadata belong in the proof boundary.',
    }),
    topologyBoundaryEdge({
      id: 'topology-external-api',
      currentOrganizationId: graph.currentOrganizationId,
      targetOrganizationId: 'topology-api-integration-client',
      edgeType: 'integration',
      relationshipType: 'mixed',
      currentStage: 'integrationBoundaryProjected',
      safeSummary: 'External clients require scoped credentials and audit logging.',
    }),
    topologyBoundaryEdge({
      id: 'topology-erp-adapter',
      currentOrganizationId: graph.currentOrganizationId,
      targetOrganizationId: 'topology-erp-accounting-adapter',
      edgeType: 'integration',
      relationshipType: 'mixed',
      currentStage: 'adapterBoundaryProjected',
      safeSummary: 'ERP/accounting mapping is adapter-scoped and does not claim production network certification.',
    }),
    topologyBoundaryEdge({
      id: 'topology-delivery-proof',
      currentOrganizationId: graph.currentOrganizationId,
      targetOrganizationId: 'topology-logistics-proof-provider',
      edgeType: 'deliveryProof',
      relationshipType: 'logistics',
      currentStage: 'deliveryProofBoundaryProjected',
      safeSummary: 'Delivery proof uses safe metadata and hashes, not full logistics infrastructure.',
    }),
  ];

  return {
    ...graph,
    nodes: [...nodes, ...boundaryNodes],
    edges: [...edges, ...boundaryEdges],
    latestProofActivity: [...graph.latestProofActivity, ...boundaryEdges.map(edge => ({
      lifecycleEventId: edge.latestLifecycleEventId ?? edge.id,
      eventType: edge.currentStage,
      timestamp: new Date().toISOString(),
      payloadHash: `sha256:${'0'.repeat(64)}`,
      anchorStatus: edge.anchorStatus ?? 'notAnchored',
      verificationStatus: edge.verificationStatus ?? 'unavailable',
      channelScope: edge.channelScope,
      relatedRecordType: 'topologyBoundary',
      relatedRecordId: edge.id,
    }))].slice(0, 9),
  };
}

function proofStatusFromEdge(statuses: Array<string | undefined>): CompanyProofStatus {
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

function proofScopeSummary(scope: OrganizationGraphChannelScope): string {
  switch (scope) {
    case 'sharedChannelA':
      return 'Procurement proof visibility shared by buyer and supplier.';
    case 'sharedChannelB':
      return 'Regulated export and audit evidence visibility scope.';
    case 'privateChannelC':
      return 'Restricted PLS, financier, and Shariah governance visibility scope.';
    case 'localProofOnly':
      return 'Local metadata proof scope; no live Fabric channel is claimed.';
    case 'unavailable':
    default:
      return 'Proof visibility is intentionally unavailable or degraded for this relationship.';
  }
}

function riskSummary(input: { eligibilityStatus: string; latestProofStatus: CompanyProofStatus }): string {
  if (input.eligibilityStatus === 'blocked') {
    return 'Blocked or rejected onboarding state. Governed transactions must remain unavailable.';
  }

  if (input.eligibilityStatus === 'flagged') {
    return 'Flagged onboarding state. Review is required before expanding transaction activity.';
  }

  if (input.latestProofStatus === 'failed' || input.latestProofStatus === 'mismatch') {
    return 'Proof exception detected. Audit or security review is recommended.';
  }

  if (input.latestProofStatus === 'unavailable' || input.latestProofStatus === 'notFound') {
    return 'Proof visibility is incomplete for this partner relationship.';
  }

  return 'No high-risk partner signal is present in the current safe projection.';
}

async function buildChannelMatrix(
  repository: OrganizationNetworkRepository,
  organizationId: string,
): Promise<CompanyChannelMatrixEntry[]> {
  const [graph, deals] = await Promise.all([
    repository.getGraphForOrganization(organizationId),
    repository.listCompanyDealProjections(organizationId),
  ]);

  return graph.edges.map(edge => {
    const partnerOrganizationId = edge.sourceOrganizationId === organizationId
      ? edge.targetOrganizationId
      : edge.sourceOrganizationId;
    const partner = graph.nodes.find(node => node.organizationId === partnerOrganizationId);
    const dealCount = deals.filter(deal =>
      deal.counterpartOrganizationId === partnerOrganizationId
      || deal.relationshipId === edge.id
    ).length;
    const latestProofStatus = proofStatusFromEdge([edge.verificationStatus, edge.anchorStatus]);
    const eligibilityStatus = partner?.eligibilityStatus ?? 'unknown';

    return {
      matrixId: `matrix-${edge.id}`,
      partnerOrganizationId,
      partnerDisplayName: partner?.displayName ?? partnerOrganizationId,
      relationshipRole: graphTypeToRelationshipIntent(edge.relationshipType),
      relationshipType: edge.relationshipType,
      channelScope: edge.channelScope,
      proofScopeSummary: proofScopeSummary(edge.channelScope),
      activeDealCount: dealCount,
      latestProofStatus,
      eligibilityStatus,
      riskSummary: riskSummary({ eligibilityStatus, latestProofStatus }),
      currentStage: edge.currentStage,
      latestLifecycleEventId: edge.latestLifecycleEventId,
    };
  });
}

function actorOrUnauthorized(request: FastifyRequest, reply: FastifyReply): RequiredActorContext | null {
  const actor = getRequestActorContext(request);
  if (!actor.actorUserId || !actor.actorOrganizationId) {
    reply.code(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return null;
  }

  return {
    actorUserId: actor.actorUserId,
    actorOrganizationId: actor.actorOrganizationId,
    actorRoleCodes: actor.actorRoleCodes,
  };
}

function forbidden(reply: FastifyReply, message = 'Access denied') {
  return reply.code(403).send({
    error: {
      code: 'FORBIDDEN',
      message,
    },
  });
}

function notFound(reply: FastifyReply, message = 'Resource not found') {
  return reply.code(404).send({
    error: {
      code: 'NOT_FOUND',
      message,
    },
  });
}

const registerOrganizationNetworkRoutes: FastifyPluginAsync<OrganizationNetworkRoutesOptions> = async (fastify, options) => {
  fastify.post<{ Body: Record<string, unknown> }>(
    '/organizations/register',
    {
      schema: {
        body: {
          type: 'object',
          required: [
            'legalName',
            'alias',
            'uniqueIdentifier',
            'contactEmail',
            'businessCategory',
            'primaryAdminUsername',
            'primaryAdminPassword',
          ],
          properties: {
            legalName: { type: 'string' },
            alias: { type: 'string' },
            uniqueIdentifier: { type: 'string' },
            logoUrl: { type: 'string' },
            contactEmail: { type: 'string' },
            businessCategory: { type: 'string' },
            registrationNumber: { type: 'string' },
            publicProfileSummary: { type: 'string' },
            primaryAdminUsername: { type: 'string' },
            primaryAdminPassword: { type: 'string' },
            primaryAdminDisplayName: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      try {
        const result = await registerOrganization(request.body, options.repository);

        if (result.status === 'duplicateIdentifier') {
          return reply.code(409).send({
            error: {
              code: 'CONFLICT',
              message: 'An organization with this unique identifier already exists',
            },
          });
        }

        if (result.status === 'duplicateUsername') {
          return reply.code(409).send({
            error: {
              code: 'CONFLICT',
              message: 'A platform user with this username already exists',
            },
          });
        }

        return reply.code(201).send({ data: result.registration });
      } catch (error) {
        if (isValidationEnvelope(error)) {
          return reply.code(400).send(error);
        }

        throw error;
      }
    },
  );

  fastify.get(
    '/organizations/me/profile',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const profile = await options.repository.findProfileByOrganizationId(actor.actorOrganizationId);
      if (!profile) {
        return notFound(reply, 'Organization profile not found');
      }

      return reply.code(200).send({ data: profile });
    },
  );

  fastify.get(
    '/organizations/me/dashboard-summary',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const summary = await options.repository.getCompanyDashboardSummary({
        organizationId: actor.actorOrganizationId,
        actorUserId: actor.actorUserId,
        actorRoleCodes: actor.actorRoleCodes,
      });
      if (!summary) {
        return notFound(reply, 'Organization profile not found');
      }

      return reply.code(200).send({ data: summary });
    },
  );

  fastify.get(
    '/organizations/me/channel-matrix',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canViewCompanyLedger(actor.actorRoleCodes)) {
        return forbidden(reply, 'Organization channel matrix access denied');
      }

      const matrix = await buildChannelMatrix(options.repository, actor.actorOrganizationId);
      return reply.code(200).send({ data: { items: matrix } });
    },
  );

  fastify.patch<{ Body: Record<string, unknown> }>(
    '/organizations/me/profile',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canManageOrganization(actor.actorRoleCodes)) {
        return forbidden(reply, 'Organization admin access required');
      }

      try {
        const profile = await updateOrganizationProfile(actor.actorOrganizationId, request.body, options.repository);
        if (!profile) {
          return notFound(reply, 'Organization profile not found');
        }

        return reply.code(200).send({ data: profile });
      } catch (error) {
        if (isValidationEnvelope(error)) {
          return reply.code(400).send(error);
        }

        throw error;
      }
    },
  );

  fastify.get(
    '/organizations/me/users',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canManageOrganization(actor.actorRoleCodes)) {
        return forbidden(reply, 'Organization admin access required');
      }

      const users = await options.repository.listOrganizationUsers(actor.actorOrganizationId);
      return reply.code(200).send({ data: { items: users } });
    },
  );

  fastify.post<{ Body: Record<string, unknown> }>(
    '/organizations/me/users',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canManageOrganization(actor.actorRoleCodes)) {
        return forbidden(reply, 'Organization admin access required');
      }

      try {
        const result = await inviteOrganizationUser(
          actor.actorOrganizationId,
          actor.actorUserId,
          request.body,
          options.repository,
        );

        if (result.status === 'organizationNotFound') {
          return notFound(reply, 'Organization profile not found');
        }

        if (result.status === 'duplicateUsername') {
          return reply.code(409).send({
            error: {
              code: 'CONFLICT',
              message: 'A platform user with this username already exists',
            },
          });
        }

        return reply.code(201).send({ data: result.user });
      } catch (error) {
        if (isValidationEnvelope(error)) {
          return reply.code(400).send(error);
        }

        throw error;
      }
    },
  );

  fastify.get<{ Querystring: { identifier?: string } }>(
    '/organizations/search',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const identifier = request.query.identifier?.trim();
      if (!identifier) {
        return reply.code(400).send({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'identifier is required',
            details: { issues: [{ path: 'identifier', message: 'identifier is required' }] },
          },
        });
      }

      const profile = await options.repository.searchPublicProfileByUniqueIdentifier(identifier);
      if (!profile) {
        return notFound(reply, 'Organization not found');
      }

      return reply.code(200).send({ data: profile });
    },
  );

  fastify.post<{ Body: Record<string, unknown> }>(
    '/organization-network/requests',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canRequestNetwork(actor.actorRoleCodes)) {
        return forbidden(reply, 'Network request access denied');
      }

      try {
        const result = await createOrganizationNetworkRequest(
          actor.actorOrganizationId,
          actor.actorUserId,
          request.body,
          options.repository,
        );

        if (result.status === 'targetNotFound') {
          return notFound(reply, 'Target organization not found');
        }

        if (result.status === 'selfRequest') {
          return reply.code(409).send({
            error: {
              code: 'CONFLICT',
              message: 'Cannot request a relationship with your own organization',
            },
          });
        }

        if (result.status === 'duplicateActiveRequest') {
          return reply.code(409).send({
            error: {
              code: 'CONFLICT',
              message: 'A pending network request already exists for this organization',
            },
          });
        }

        return reply.code(201).send({ data: result.request });
      } catch (error) {
        if (isValidationEnvelope(error)) {
          return reply.code(400).send(error);
        }

        throw error;
      }
    },
  );

  fastify.get(
    '/organization-network/requests',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const requests = await options.repository.listNetworkRequestsForOrganization(actor.actorOrganizationId);
      return reply.code(200).send({ data: { items: requests } });
    },
  );

  fastify.post<{ Params: { requestId: string } }>(
    '/organization-network/requests/:requestId/accept',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canRequestNetwork(actor.actorRoleCodes)) {
        return forbidden(reply, 'Network request access denied');
      }

      const result = await acceptOrganizationNetworkRequest({
        requestId: request.params.requestId,
        actorOrganizationId: actor.actorOrganizationId,
        actorUserId: actor.actorUserId,
      }, options.repository);

      if (result.status === 'notFound') {
        return notFound(reply, 'Network request not found');
      }

      if (result.status === 'forbidden') {
        return forbidden(reply, 'Only the target organization can accept this request');
      }

      if (result.status === 'notActionable') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Network request is not actionable',
          },
        });
      }

      return reply.code(200).send({ data: result.request });
    },
  );

  fastify.post<{ Params: { requestId: string } }>(
    '/organization-network/requests/:requestId/reject',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canRequestNetwork(actor.actorRoleCodes)) {
        return forbidden(reply, 'Network request access denied');
      }

      const result = await rejectOrganizationNetworkRequest({
        requestId: request.params.requestId,
        actorOrganizationId: actor.actorOrganizationId,
        actorUserId: actor.actorUserId,
      }, options.repository);

      if (result.status === 'notFound') {
        return notFound(reply, 'Network request not found');
      }

      if (result.status === 'forbidden') {
        return forbidden(reply, 'Only the target organization can reject this request');
      }

      if (result.status === 'notActionable') {
        return reply.code(409).send({
          error: {
            code: 'CONFLICT',
            message: 'Network request is not actionable',
          },
        });
      }

      return reply.code(200).send({ data: result.request });
    },
  );

  fastify.get(
    '/organization-network/graph',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const graph = await options.repository.getGraphForOrganization(actor.actorOrganizationId);
      return reply.code(200).send({ data: enrichGraphTopology(graph) });
    },
  );

  fastify.get(
    '/company-ledger/deals',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canViewCompanyLedger(actor.actorRoleCodes)) {
        return forbidden(reply, 'Company ledger access denied');
      }

      const deals = await options.repository.listCompanyDealProjections(actor.actorOrganizationId);
      return reply.code(200).send({ data: { items: deals } });
    },
  );

  fastify.get(
    '/company-ledger/mudarabah',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      if (!canViewCompanyLedger(actor.actorRoleCodes)) {
        return forbidden(reply, 'Company ledger access denied');
      }

      const projections = await options.repository.listMudarabahWorkflowProjections(actor.actorOrganizationId);
      return reply.code(200).send({ data: { items: projections } });
    },
  );

  fastify.get<{ Params: { edgeId: string } }>(
    '/organization-network/graph/:edgeId/trail',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const trail = await options.repository.getTrailForEdge(actor.actorOrganizationId, request.params.edgeId);
      if (!trail) {
        return notFound(reply, 'Graph edge not found');
      }

      return reply.code(200).send({ data: { items: trail } });
    },
  );

  fastify.get(
    '/email-notifications/outbox',
    { preHandler: options.authenticatedPreHandler },
    async (request, reply) => {
      const actor = actorOrUnauthorized(request, reply);
      if (!actor) {
        return;
      }

      const notifications = await options.repository.listEmailNotificationsForOrganization(
        actor.actorOrganizationId,
        { includeGovernanceView: canGovernanceRead(actor.actorRoleCodes) },
      );

      return reply.code(200).send({ data: { items: notifications } });
    },
  );
};

export { registerOrganizationNetworkRoutes };
