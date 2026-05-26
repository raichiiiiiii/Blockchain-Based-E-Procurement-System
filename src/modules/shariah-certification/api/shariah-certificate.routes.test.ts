import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { InMemoryShariahCertificateRepository } from '../infrastructure/in-memory-shariah-certificate-repository.js';
import { registerShariahCertificateRoutes } from './shariah-certificate.routes.js';

function authenticatedPreHandler(roles: string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> {
  return async (request) => {
    request.actorContext = {
      userId: 'demo-user',
      authorizationContext: {
        roles,
      },
      isAuthenticated: true,
      actorUserId: 'demo-user',
      actorOrganizationId: 'demo-shariah-org',
      actorRoleCodes: roles,
      authenticationSessionId: 'session-shariah-certificate-test',
      authenticationMethod: 'localPassword',
    };
  };
}

async function createApp(roles: string[]) {
  const repository = new InMemoryShariahCertificateRepository();
  const app = fastify();
  app.register(actorContextPlugin);
  app.register(registerShariahCertificateRoutes, {
    repository,
    authenticatedPreHandler: authenticatedPreHandler(roles),
  });
  await app.ready();
  return { app, repository };
}

function validPayload() {
  return {
    issuedBy: 'MVP Shariah Governance Board',
    reviewerBoard: 'Restricted PLS Review Panel',
    fatwaReference: 'FATWA-MVP-001',
    scope: 'restricted-pls-seedbed',
    contractTemplateVersion: 'mudarabah-procurement-v1',
    conditions: ['No guaranteed profit or principal'],
    issuedAt: '2026-05-20T00:00:00.000Z',
    expiresAt: '2027-05-20T00:00:00.000Z',
    certificateDocumentId: 'doc-certificate-1',
  };
}

describe('Shariah certificate routes', () => {
  it('lets Shariah reviewer register, list, read, and revoke certificate artifact', async () => {
    const { app } = await createApp(['shariahReviewer']);

    const createResponse = await app.inject({
      method: 'POST',
      url: '/shariah/certificates',
      payload: validPayload(),
    });

    assert.strictEqual(createResponse.statusCode, 201);
    const createBody = JSON.parse(createResponse.body);
    assert.strictEqual(createBody.data.status, 'active');
    assert.match(createBody.data.certificateHash, /^sha256:/);
    assert.strictEqual(createBody.data.createdByUserId, 'demo-user');

    const certificateId = createBody.data.certificateId;
    const listResponse = await app.inject({
      method: 'GET',
      url: '/shariah/certificates',
    });
    assert.strictEqual(listResponse.statusCode, 200);
    assert.strictEqual(JSON.parse(listResponse.body).data.items.length, 1);

    const readResponse = await app.inject({
      method: 'GET',
      url: `/shariah/certificates/${certificateId}`,
    });
    assert.strictEqual(readResponse.statusCode, 200);

    const revokeResponse = await app.inject({
      method: 'POST',
      url: `/shariah/certificates/${certificateId}/revoke`,
      payload: {
        reason: 'Template retired after governance review',
      },
    });
    assert.strictEqual(revokeResponse.statusCode, 200);
    assert.strictEqual(JSON.parse(revokeResponse.body).data.status, 'revoked');
  });

  it('denies certificate registration to non-governance roles while allowing read for financier', async () => {
    const buyerApp = await createApp(['buyer']);
    const createDenied = await buyerApp.app.inject({
      method: 'POST',
      url: '/shariah/certificates',
      payload: validPayload(),
    });
    assert.strictEqual(createDenied.statusCode, 403);

    const financierApp = await createApp(['financier']);
    const listResponse = await financierApp.app.inject({
      method: 'GET',
      url: '/shariah/certificates',
    });
    assert.strictEqual(listResponse.statusCode, 200);
  });

  it('validates certificate artifact registration payloads', async () => {
    const { app } = await createApp(['shariahReviewer']);

    const response = await app.inject({
      method: 'POST',
      url: '/shariah/certificates',
      payload: {
        issuedBy: '',
        reviewerBoard: '',
      },
    });

    assert.strictEqual(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.error.code, 'VALIDATION_ERROR');
    assert.ok(body.error.details.issues.length >= 1);
  });
});
