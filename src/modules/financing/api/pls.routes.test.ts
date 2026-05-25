import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import type { ShariahReview } from '../../shariah-review/domain/shariah-review.js';
import { InMemoryShariahReviewRepository } from '../../shariah-review/infrastructure/in-memory-shariah-review-repository.js';
import type { PlsContract } from '../domain/pls-contract.js';
import { InMemoryPlsContractRepository } from '../infrastructure/in-memory-pls-contract-repository.js';
import { registerPlsRoutes } from './pls.routes.js';

function contract(overrides: Partial<PlsContract> = {}): PlsContract {
  return {
    contractId: 'pls-contract-route-1',
    procurementReference: 'po-local-1002',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    capitalAmount: '68000.00',
    currency: 'MYR',
    profitShare: {
      financierPercent: 60,
      ventureOperatorPercent: 40,
    },
    lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
    status: 'pendingShariahReview',
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-20T09:00:00.000Z',
    ...overrides,
  };
}

function approvedReview(): ShariahReview {
  return {
    id: 'review-route-approved',
    organizationId: 'demo-supplier-org',
    title: 'Restricted mudarabah review',
    summary: 'Review of procurement-linked PLS seedbed contract.',
    status: 'approved',
    submittedByUserId: 'demo-shariah-user',
    createdAt: '2026-05-20T10:00:00.000Z',
    decidedAt: '2026-05-21T10:00:00.000Z',
  };
}

function authenticatedPreHandler(roles: string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> {
  return async (request) => {
    request.actorContext = {
      userId: 'demo-user',
      authorizationContext: {
        roles,
      },
      isAuthenticated: true,
      actorUserId: 'demo-user',
      actorOrganizationId: 'demo-financier-org',
      actorRoleCodes: roles,
      authenticationSessionId: 'session-pls-route-test',
      authenticationMethod: 'localPassword',
    };
  };
}

async function createApp(roles: string[]) {
  const contractRepository = new InMemoryPlsContractRepository([
    contract(),
    contract({
      contractId: 'pls-contract-active',
      status: 'active',
      shariahApproval: {
        reviewId: 'review-route-approved',
        status: 'approved',
        decidedAt: '2026-05-21T10:00:00.000Z',
      },
    }),
  ]);
  const shariahReviewRepository = new InMemoryShariahReviewRepository();
  await shariahReviewRepository.save(approvedReview());

  const app = fastify();
  app.register(actorContextPlugin);
  app.register(registerPlsRoutes, {
    contractRepository,
    shariahReviewRepository,
    authenticatedPreHandler: authenticatedPreHandler(roles),
  });
  await app.ready();

  return app;
}

describe('PLS routes', () => {
  it('allows financier to activate a contract with an approved Shariah reference', async () => {
    const app = await createApp(['financier']);

    const response = await app.inject({
      method: 'POST',
      url: '/financing/pls-contracts/pls-contract-route-1/activate',
      payload: {
        shariahReviewId: 'review-route-approved',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.data.status, 'active');
    assert.strictEqual(body.data.shariahApproval.status, 'approved');
  });

  it('denies activation to non-financier roles', async () => {
    const app = await createApp(['shariahReviewer']);

    const response = await app.inject({
      method: 'POST',
      url: '/financing/pls-contracts/pls-contract-route-1/activate',
      payload: {
        shariahReviewId: 'review-route-approved',
      },
    });

    assert.strictEqual(response.statusCode, 403);
  });

  it('lets Shariah reviewer inspect contracts without activating them', async () => {
    const app = await createApp(['shariahReviewer']);

    const response = await app.inject({
      method: 'GET',
      url: '/financing/pls-contracts',
    });

    assert.strictEqual(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.ok(body.data.items.length >= 1);
  });

  it('records distribution scenarios only for active contracts', async () => {
    const app = await createApp(['financier']);

    const inactiveResponse = await app.inject({
      method: 'POST',
      url: '/financing/pls-contracts/pls-contract-route-1/distributions',
      payload: {
        eventType: 'profit',
        grossResultAmount: '10000.00',
        calculationBasis: 'Inactive contract scenario.',
      },
    });

    const activeResponse = await app.inject({
      method: 'POST',
      url: '/financing/pls-contracts/pls-contract-active/distributions',
      payload: {
        eventType: 'profit',
        grossResultAmount: '10000.00',
        calculationBasis: 'Accepted order margin scenario.',
      },
    });

    assert.strictEqual(inactiveResponse.statusCode, 409);
    assert.strictEqual(activeResponse.statusCode, 201);
    const body = JSON.parse(activeResponse.body);
    assert.strictEqual(body.data.allocations[0].amount, '6000.00');
  });
});
