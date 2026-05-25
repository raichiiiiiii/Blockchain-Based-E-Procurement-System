import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryOnboardingCaseRepository } from '../../kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.js';
import type { OnboardingCase } from '../../kyc-aml-onboarding/domain/onboarding-case.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcurementOrderRepository } from '../infrastructure/in-memory-procurement-order-repository.js';

async function createSession(
  repository: InMemoryAuthSessionRepository,
  input: {
    token: string;
    actorUserId: string;
    actorOrganizationId: string;
    actorRoleCodes: string[];
  }
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
    authenticationMethod: 'localPassword'
  });
}

function approvedCase(memberOrganizationId: string): OnboardingCase {
  const now = new Date().toISOString();
  return {
    id: `kyc_aml_case_${memberOrganizationId}`,
    memberOrganizationId,
    kyc: {
      legalName: `${memberOrganizationId} Legal`,
      registrationNumber: `${memberOrganizationId}-REG`,
      countryCode: 'MY',
      businessType: 'Procurement'
    },
    aml: {
      declaredBusinessActivity: 'Procurement operations',
      expectedMonthlyTransactionValue: '100000',
      declaredSanctionsExposure: false,
      declaredPepExposure: false
    },
    evidenceReferences: [
      {
        type: 'companyRegistration',
        name: 'Company registration metadata',
        uri: 'evidence://company-registration',
        mediaType: 'application/pdf'
      }
    ],
    status: 'approved',
    submittedByUserId: 'compliance-user',
    createdAt: now,
    updatedAt: now,
    decision: {
      outcome: 'pass',
      rationale: 'Approved for procurement demo.',
      decidedByUserId: 'compliance-user',
      decidedAt: now
    }
  };
}

async function createOrderTestContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const orderRepository = new InMemoryProcurementOrderRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
  const onboardingCaseRepository = new InMemoryOnboardingCaseRepository();

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'buyer-user',
    actorOrganizationId: 'buyer-org',
    actorRoleCodes: ['buyer']
  });
  await createSession(sessionRepository, {
    token: 'supplier-token',
    actorUserId: 'supplier-user',
    actorOrganizationId: 'supplier-org',
    actorRoleCodes: ['supplier']
  });
  await createSession(sessionRepository, {
    token: 'other-supplier-token',
    actorUserId: 'other-supplier-user',
    actorOrganizationId: 'other-supplier-org',
    actorRoleCodes: ['supplier']
  });

  await onboardingCaseRepository.save(approvedCase('buyer-org'));

  const server = createTestableServer({
    sessionRepository,
    procurementOrderRepository: orderRepository,
    procureToPayLifecycleEventRepository: lifecycleEventRepository,
    onboardingCaseRepository
  });
  await server.ready();

  return {
    server,
    orderRepository,
    lifecycleEventRepository,
    onboardingCaseRepository
  };
}

test('buyer can create an order when organization eligibility is approved', async () => {
  const { server, lifecycleEventRepository } = await createOrderTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      authorization: 'Bearer buyer-token'
    },
    payload: {
      supplierOrganizationId: 'supplier-org',
      title: 'Solar inverter supply',
      amount: '25000',
      currency: 'MYR'
    }
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.strictEqual(body.data.status, 'created');
  assert.strictEqual(body.data.buyerOrganizationId, 'buyer-org');
  assert.strictEqual(body.data.supplierOrganizationId, 'supplier-org');

  const events = await lifecycleEventRepository.list();
  assert.strictEqual(events.length, 1);
  assert.strictEqual(events[0].eventType, 'purchaseOrderCreated');
  assert.strictEqual(events[0].targetId, body.data.orderId);
});

test('buyer order creation is blocked when eligibility is unknown', async () => {
  const sessionRepository = new InMemoryAuthSessionRepository();
  await createSession(sessionRepository, {
    token: 'unknown-buyer-token',
    actorUserId: 'unknown-buyer-user',
    actorOrganizationId: 'unknown-buyer-org',
    actorRoleCodes: ['buyer']
  });

  const server = createTestableServer({
    sessionRepository,
    procurementOrderRepository: new InMemoryProcurementOrderRepository(),
    procureToPayLifecycleEventRepository: new InMemoryProcureToPayLifecycleEventRepository(),
    onboardingCaseRepository: new InMemoryOnboardingCaseRepository()
  });
  await server.ready();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      authorization: 'Bearer unknown-buyer-token'
    },
    payload: {
      supplierOrganizationId: 'supplier-org',
      title: 'Blocked order',
      amount: '1000',
      currency: 'MYR'
    }
  });

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.details.eligibility, 'unknown');
});

test('supplier can list and accept assigned orders', async () => {
  const { server, lifecycleEventRepository } = await createOrderTestContext();

  const createResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      authorization: 'Bearer buyer-token'
    },
    payload: {
      supplierOrganizationId: 'supplier-org',
      title: 'Delivery fleet tablets',
      amount: '18000',
      currency: 'MYR'
    }
  });

  const orderId = createResponse.json().data.orderId;

  const listResponse = await server.inject({
    method: 'GET',
    url: '/api/v1/orders',
    headers: {
      authorization: 'Bearer supplier-token'
    }
  });

  assert.strictEqual(listResponse.statusCode, 200);
  assert.strictEqual(listResponse.json().data.items.length, 1);
  assert.strictEqual(listResponse.json().data.items[0].orderId, orderId);

  const acceptResponse = await server.inject({
    method: 'POST',
    url: `/api/v1/orders/${orderId}/acknowledgement`,
    headers: {
      authorization: 'Bearer supplier-token'
    },
    payload: {
      decision: 'accept'
    }
  });

  assert.strictEqual(acceptResponse.statusCode, 200);
  assert.strictEqual(acceptResponse.json().data.status, 'accepted');
  assert.strictEqual(acceptResponse.json().data.acceptedBy, 'supplier-user');

  const events = await lifecycleEventRepository.list();
  assert.strictEqual(events.length, 2);
  assert.strictEqual(events[1].eventType, 'purchaseOrderAccepted');
});

test('supplier from another organization cannot acknowledge an order', async () => {
  const { server } = await createOrderTestContext();

  const createResponse = await server.inject({
    method: 'POST',
    url: '/api/v1/orders',
    headers: {
      authorization: 'Bearer buyer-token'
    },
    payload: {
      supplierOrganizationId: 'supplier-org',
      title: 'Restricted supplier order',
      amount: '5000',
      currency: 'MYR'
    }
  });

  const orderId = createResponse.json().data.orderId;
  const response = await server.inject({
    method: 'POST',
    url: `/api/v1/orders/${orderId}/acknowledgement`,
    headers: {
      authorization: 'Bearer other-supplier-token'
    },
    payload: {
      decision: 'accept'
    }
  });

  assert.strictEqual(response.statusCode, 403);
});

test('anonymous users cannot list orders', async () => {
  const { server } = await createOrderTestContext();

  const response = await server.inject({
    method: 'GET',
    url: '/api/v1/orders'
  });

  assert.strictEqual(response.statusCode, 401);
});
