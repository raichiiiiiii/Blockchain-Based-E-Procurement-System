import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryOrganizationNetworkRepository } from '../infrastructure/in-memory-organization-network-repository.js';

async function createSession(
  repository: InMemoryAuthSessionRepository,
  input: {
    token: string;
    actorUserId: string;
    actorOrganizationId: string;
    actorRoleCodes: string[];
  },
) {
  await repository.save({
    sessionId: `session-${input.actorUserId}`,
    tokenHash: hashToken(input.token),
    actorUserId: input.actorUserId,
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes,
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    authenticationMethod: 'localPassword',
  });
}

async function createNetworkTestContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const organizationNetworkRepository = new InMemoryOrganizationNetworkRepository();

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'demo-buyer-user',
    actorOrganizationId: 'demo-buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'org-admin-token',
    actorUserId: 'demo-buyer-admin-user',
    actorOrganizationId: 'demo-buyer-org',
    actorRoleCodes: ['organizationAdmin'],
  });
  await createSession(sessionRepository, {
    token: 'supplier-token',
    actorUserId: 'demo-supplier-user',
    actorOrganizationId: 'demo-supplier-org',
    actorRoleCodes: ['supplier'],
  });
  await createSession(sessionRepository, {
    token: 'compliance-token',
    actorUserId: 'demo-compliance-user',
    actorOrganizationId: 'demo-compliance-org',
    actorRoleCodes: ['complianceReviewer'],
  });
  await createSession(sessionRepository, {
    token: 'auditor-token',
    actorUserId: 'demo-auditor-user',
    actorOrganizationId: 'demo-audit-org',
    actorRoleCodes: ['auditor'],
  });

  const server = createTestableServer({
    sessionRepository,
    organizationNetworkRepository,
  });
  await server.ready();

  return { server, organizationNetworkRepository };
}

test('public organization registration creates pending profile and admin bootstrap without returning password', async () => {
  const { server } = await createNetworkTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/organizations/register',
    payload: {
      legalName: 'Nur Logistics Sdn Bhd',
      alias: 'Nur Logistics',
      uniqueIdentifier: 'nur-logistics',
      contactEmail: 'ops@nur.example',
      businessCategory: 'Logistics partner',
      publicProfileSummary: 'Delivery partner for verified procurement evidence.',
      primaryAdminUsername: 'nur.admin',
      primaryAdminPassword: 'safe-password',
      primaryAdminDisplayName: 'Nur Admin',
    },
  });

  assert.equal(response.statusCode, 201);
  const body = response.json();
  assert.equal(body.data.organization.status, 'pendingReview');
  assert.equal(body.data.organization.uniqueIdentifier, 'nur-logistics');
  assert.equal(body.data.organization.eligibilityStatus, 'unknown');
  assert.equal(typeof body.data.primaryAdminUserId, 'string');
  assert.equal(JSON.stringify(body).includes('safe-password'), false);
});

test('company dashboard summary shows organization context and deal count', async () => {
  const { server } = await createNetworkTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/organizations/me/dashboard-summary',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(response.statusCode, 200);
  const summary = response.json().data;
  assert.equal(summary.organization.legalName, 'Amanah Retail Sdn Bhd');
  assert.equal(summary.organization.uniqueIdentifier, 'amanah-retail');
  assert.deepEqual(summary.currentUser.roleCodes, ['buyer']);
  assert.ok(summary.relationshipRoles.some(
    (relationship: { counterpartOrganizationId: string }) => relationship.counterpartOrganizationId === 'demo-supplier-org',
  ));
  assert.equal(summary.activeDealCount, 1);
  assert.equal(summary.latestProofStatus, 'verified');
});

test('organization admin can list and prepare scoped company users', async () => {
  const { server } = await createNetworkTestContext();

  const listResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/organizations/me/users',
    headers: {
      authorization: 'Bearer org-admin-token',
    },
  });

  assert.equal(listResponse.statusCode, 200);
  assert.ok(listResponse.json().data.items.some(
    (user: { username: string }) => user.username === 'buyer.demo',
  ));

  const inviteResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/organizations/me/users',
    headers: {
      authorization: 'Bearer org-admin-token',
    },
    payload: {
      username: 'amanah.ops',
      displayName: 'Amanah Operations User',
      roleCodes: ['buyer'],
    },
  });

  assert.equal(inviteResponse.statusCode, 201);
  assert.equal(inviteResponse.json().data.username, 'amanah.ops');
  assert.deepEqual(inviteResponse.json().data.roleCodes, ['buyer']);

  const buyerInvite = await server.inject({
    method: 'POST',
    url: '/api/v1/organizations/me/users',
    headers: {
      authorization: 'Bearer buyer-token',
    },
    payload: {
      username: 'bad.assign',
      displayName: 'Bad Assign',
      roleCodes: ['buyer'],
    },
  });
  assert.equal(buyerInvite.statusCode, 403);
});

test('company ledger and Mudarabah projection are scoped to authenticated company context', async () => {
  const { server } = await createNetworkTestContext();

  const dealsResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/company-ledger/deals',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(dealsResponse.statusCode, 200);
  const deals = dealsResponse.json().data.items;
  assert.equal(deals.length, 1);
  assert.equal(deals[0].orderStatus, 'accepted');
  assert.equal(deals[0].deliveryEvidenceStatus, 'metadataRecorded');
  assert.equal(deals[0].proofStatus, 'pending');
  assert.match(deals[0].proofPayloadHash, /^sha256:/);

  const mudarabahResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/company-ledger/mudarabah',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(mudarabahResponse.statusCode, 200);
  const projections = mudarabahResponse.json().data.items;
  assert.equal(projections[0].status, 'approvedForActivation');
  assert.match(projections[0].simulationOnlyNotice, /does not guarantee profit or principal/);
});

test('channel matrix exposes partner proof scopes without production Fabric claims', async () => {
  const { server } = await createNetworkTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/organizations/me/channel-matrix',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(response.statusCode, 200);
  const matrix = response.json().data.items;
  assert.ok(matrix.some(
    (entry: { partnerOrganizationId: string; channelScope: string }) =>
      entry.partnerOrganizationId === 'demo-supplier-org' && entry.channelScope === 'sharedChannelA',
  ));
  assert.equal(JSON.stringify(matrix).includes('production Fabric'), false);

  const anonymousResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/organizations/me/channel-matrix',
  });
  assert.equal(anonymousResponse.statusCode, 401);
});

test('buyer can request network relationship and supplier acceptance appears in graph and outbox', async () => {
  const { server } = await createNetworkTestContext();

  const createResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/organization-network/requests',
    headers: {
      authorization: 'Bearer buyer-token',
    },
    payload: {
      targetUniqueIdentifier: 'barakah-supplies',
      relationshipType: 'buyer',
      purpose: 'Prepare controlled order collaboration.',
      message: 'Request procurement network setup.',
    },
  });

  assert.equal(createResponse.statusCode, 201);
  const request = createResponse.json().data;
  assert.equal(request.state, 'sent');
  assert.equal(request.requesterOrganizationId, 'demo-buyer-org');
  assert.equal(request.targetOrganizationId, 'demo-supplier-org');

  const acceptResponse = await server.inject({
    method: 'POST',
    url: `/api/v1/organization-network/requests/${request.requestId}/accept`,
    headers: {
      authorization: 'Bearer supplier-token',
    },
  });

  assert.equal(acceptResponse.statusCode, 200);
  assert.equal(acceptResponse.json().data.state, 'accepted');

  const graphResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/organization-network/graph',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(graphResponse.statusCode, 200);
  const graph = graphResponse.json().data;
  assert.ok(graph.nodes.some((node: { uniqueIdentifier: string }) => node.uniqueIdentifier === 'barakah-supplies'));
  const acceptedEdge = graph.edges.find((edge: { targetOrganizationId: string; currentStage: string }) =>
    edge.targetOrganizationId === 'demo-supplier-org' && edge.currentStage === 'networkEstablished'
  );
  assert.ok(acceptedEdge);
  assert.equal(acceptedEdge.channelScope, 'sharedChannelA');

  const trailResponse = await server.inject({
    method: 'GET',
    url: `/api/v1/organization-network/graph/${acceptedEdge.id}/trail`,
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(trailResponse.statusCode, 200);
  const trail = trailResponse.json().data.items;
  assert.equal(trail.length, 1);
  assert.match(trail[0].payloadHash, /^sha256:[0-9a-f]{64}$/);
  assert.equal(JSON.stringify(trail).includes('Request procurement network setup'), false);

  const outboxResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/email-notifications/outbox',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(outboxResponse.statusCode, 200);
  assert.ok(outboxResponse.json().data.items.some(
    (notification: { templateKey: string }) => notification.templateKey === 'networkRequestAccepted',
  ));
});

test('graph includes claim-boundary nodes with explicit non-production wording', async () => {
  const { server } = await createNetworkTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/organization-network/graph',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });

  assert.equal(response.statusCode, 200);
  const graph = response.json().data;
  const boundaryNode = graph.nodes.find((node: { uniqueIdentifier: string }) =>
    node.uniqueIdentifier === 'fabric-proof-boundary'
  );
  assert.ok(boundaryNode);
  assert.match(boundaryNode.proofChannelSummary, /No production network certification is implied/);

  const boundaryEdge = graph.edges.find((edge: { targetOrganizationId: string }) =>
    edge.targetOrganizationId === 'topology-fabric-proof-boundary'
  );
  assert.ok(boundaryEdge);
  assert.match(boundaryEdge.claimBoundary, /not a production Fabric consortium/);
});

test('network routes enforce session and role restrictions', async () => {
  const { server } = await createNetworkTestContext();

  const anonymousGraph = await server.inject({
    method: 'GET',
    url: '/api/v1/organization-network/graph',
  });
  assert.equal(anonymousGraph.statusCode, 401);

  const complianceCreate = await server.inject({
    method: 'POST',
    url: '/api/v1/organization-network/requests',
    headers: {
      authorization: 'Bearer compliance-token',
    },
    payload: {
      targetUniqueIdentifier: 'barakah-supplies',
      relationshipType: 'buyer',
    },
  });
  assert.equal(complianceCreate.statusCode, 403);

  const forbiddenAccept = await server.inject({
    method: 'POST',
    url: '/api/v1/organization-network/requests/not-visible/accept',
    headers: {
      authorization: 'Bearer buyer-token',
    },
  });
  assert.equal(forbiddenAccept.statusCode, 404);
});
