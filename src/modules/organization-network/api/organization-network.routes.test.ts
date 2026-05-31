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
