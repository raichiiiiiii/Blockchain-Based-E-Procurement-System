import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryProcurementContractRepository } from '../infrastructure/in-memory-procurement-contract-repository.js';
import type { MachineReadableTerms } from '../domain/procurement-contract.js';

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

async function createContractTestContext() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const contractRepository = new InMemoryProcurementContractRepository();

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'buyer-user',
    actorOrganizationId: 'demo-buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'supplier-token',
    actorUserId: 'supplier-user',
    actorOrganizationId: 'demo-supplier-org',
    actorRoleCodes: ['supplier'],
  });
  await createSession(sessionRepository, {
    token: 'other-buyer-token',
    actorUserId: 'other-buyer-user',
    actorOrganizationId: 'other-buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'auditor-token',
    actorUserId: 'auditor-user',
    actorOrganizationId: 'audit-org',
    actorRoleCodes: ['auditor'],
  });

  const server = createTestableServer({
    sessionRepository,
    procurementContractRepository: contractRepository,
  });
  await server.ready();

  return { server, contractRepository };
}

function terms(overrides: Partial<MachineReadableTerms> = {}): MachineReadableTerms {
  return {
    parties: {
      buyerOrganizationId: 'demo-buyer-org',
      supplierOrganizationId: 'demo-supplier-org',
      financierOrganizationId: 'demo-financier-org',
      buyerName: 'Amanah Retail Sdn Bhd',
      supplierName: 'Barakah Supplies Sdn Bhd',
      financierName: 'Mabrur Finance Partner',
    },
    lineItems: [
      {
        itemId: 'line-1',
        description: 'Halal-certified packaging supplies',
        quantity: '500 cartons',
        unitPrice: '24.00',
        currency: 'MYR',
      },
    ],
    deliveryTerms: 'Supplier records delivery evidence before buyer review.',
    acceptanceCriteria: ['Buyer confirms delivery evidence metadata', 'Escrow review remains manual in this slice'],
    escrowReleaseConditions: ['Accepted order exists', 'Delivery evidence is recorded', 'Buyer review is complete'],
    paymentTerms: 'Escrow-backed settlement instruction only; no real payment execution.',
    disputeAndArbitrationRules: 'Manual arbitration applies for disputed delivery or acceptance.',
    plsTerms: {
      shariahReviewId: 'shariah-review-demo',
      approvalReference: 'restricted-seedbed-review',
      profitSharingRatio: '60:40',
      lossAllocation: 'Capital provider bears capital loss unless negligence is proven.',
    },
    documentReferences: ['document-demo-contract'],
    clauseReferences: [
      {
        clauseId: 'delivery-1',
        title: 'Delivery evidence',
        summary: 'Supplier records safe evidence metadata before review.',
      },
    ],
    ocdsMapping: {
      contractId: 'ocds-contract-demo',
      implementationMilestones: ['delivery-evidence-recorded'],
    },
    ublMapping: {
      orderReference: 'PO-AMANAH-001',
      despatchAdviceReference: 'DA-BARAKAH-001',
    },
    ...overrides,
  };
}

function createPayload(overrides: Record<string, unknown> = {}) {
  return {
    contractNumber: 'AMANAH-BARAKAH-2026-001',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    humanReadableDocumentId: 'document-demo-contract',
    effectiveAt: '2026-05-26T00:00:00.000Z',
    expiresAt: '2026-12-31T23:59:59.000Z',
    machineReadableTerms: terms(),
    ...overrides,
  };
}

async function createContract(server: Awaited<ReturnType<typeof createContractTestContext>>['server']) {
  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/contracts',
    headers: { authorization: 'Bearer buyer-token' },
    payload: createPayload(),
  });
  assert.strictEqual(response.statusCode, 201);
  return response.json().data;
}

test('buyer can create a machine-readable contract with deterministic hash and lifecycle records', async () => {
  const { server } = await createContractTestContext();

  const response = await server.inject({
    method: 'POST',
    url: '/api/v1/contracts',
    headers: { authorization: 'Bearer buyer-token' },
    payload: createPayload(),
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.match(body.data.contractId, /^contract_/);
  assert.match(body.data.termsHash, /^sha256:[a-f0-9]{64}$/);
  assert.strictEqual(body.data.status, 'draft');
  assert.strictEqual(body.data.machineReadableTerms.parties.buyerName, 'Amanah Retail Sdn Bhd');
  assert.strictEqual(body.data.humanReadableDocumentId, 'document-demo-contract');
  assert.deepStrictEqual(
    body.data.lifecycleEvents.map((event: { eventType: string }) => event.eventType),
    ['companyRegistered', 'kycApproved', 'networkMembershipIssued', 'privateNetworkEstablished', 'contractCreated'],
  );
});

test('supplier can submit a revised offer and reset acceptance state for the new terms hash', async () => {
  const { server, contractRepository } = await createContractTestContext();
  const contract = await createContract(server);

  const response = await server.inject({
    method: 'POST',
    url: `/api/v1/contracts/${contract.contractId}/offers`,
    headers: { authorization: 'Bearer supplier-token' },
    payload: {
      proposedTerms: terms({
        paymentTerms: 'Escrow-backed settlement instruction after delivery review; no real payment execution.',
      }),
      comment: 'Supplier proposes payment text aligned with delivery review.',
    },
  });

  assert.strictEqual(response.statusCode, 201);
  const body = response.json();
  assert.strictEqual(body.data.status, 'negotiating');
  assert.strictEqual(body.data.offers.length, 1);
  assert.notStrictEqual(body.data.termsHash, contract.termsHash);

  const stored = await contractRepository.findById(contract.contractId);
  assert.strictEqual(stored?.lifecycleEvents.at(-1)?.eventType, 'offerSubmitted');
});

test('buyer and supplier acceptance records finalise contract terms without payment execution', async () => {
  const { server } = await createContractTestContext();
  const contract = await createContract(server);

  const buyerAcceptance = await server.inject({
    method: 'POST',
    url: `/api/v1/contracts/${contract.contractId}/acceptance`,
    headers: { authorization: 'Bearer buyer-token' },
    payload: { acceptedBy: 'buyer' },
  });
  assert.strictEqual(buyerAcceptance.statusCode, 200);
  assert.strictEqual(buyerAcceptance.json().data.status, 'draft');

  const supplierAcceptance = await server.inject({
    method: 'POST',
    url: `/api/v1/contracts/${contract.contractId}/acceptance`,
    headers: { authorization: 'Bearer supplier-token' },
    payload: { acceptedBy: 'supplier' },
  });

  assert.strictEqual(supplierAcceptance.statusCode, 200);
  const body = supplierAcceptance.json();
  assert.strictEqual(body.data.status, 'accepted');
  assert.match(body.data.signedAt, /^2026-|^20/);
  assert.strictEqual(body.data.acceptances.length, 2);
  assert.strictEqual(body.data.lifecycleEvents.at(-1).eventType, 'contractAccepted');
});

test('unrelated buyer cannot read or alter another organization contract while auditor can read', async () => {
  const { server } = await createContractTestContext();
  const contract = await createContract(server);

  const forbiddenRead = await server.inject({
    method: 'GET',
    url: `/api/v1/contracts/${contract.contractId}`,
    headers: { authorization: 'Bearer other-buyer-token' },
  });
  assert.strictEqual(forbiddenRead.statusCode, 403);

  const forbiddenOffer = await server.inject({
    method: 'POST',
    url: `/api/v1/contracts/${contract.contractId}/offers`,
    headers: { authorization: 'Bearer other-buyer-token' },
    payload: {
      proposedTerms: terms(),
      comment: 'Attempted unrelated edit',
    },
  });
  assert.strictEqual(forbiddenOffer.statusCode, 403);

  const auditorRead = await server.inject({
    method: 'GET',
    url: `/api/v1/contracts/${contract.contractId}`,
    headers: { authorization: 'Bearer auditor-token' },
  });
  assert.strictEqual(auditorRead.statusCode, 200);
  assert.strictEqual(auditorRead.json().data.contractId, contract.contractId);
});

test('anonymous and invalid contract requests use approved error envelopes', async () => {
  const { server } = await createContractTestContext();

  const anonymous = await server.inject({
    method: 'POST',
    url: '/api/v1/contracts',
    payload: createPayload(),
  });
  assert.strictEqual(anonymous.statusCode, 401);
  assert.strictEqual(anonymous.json().error.code, 'UNAUTHORIZED');

  const invalid = await server.inject({
    method: 'POST',
    url: '/api/v1/contracts',
    headers: { authorization: 'Bearer buyer-token' },
    payload: createPayload({
      machineReadableTerms: {
        ...terms(),
        lineItems: [],
      },
    }),
  });
  assert.strictEqual(invalid.statusCode, 400);
  assert.strictEqual(invalid.json().error.code, 'VALIDATION_ERROR');
});

test('duplicate acceptance for the same party and terms hash is rejected as conflict', async () => {
  const { server } = await createContractTestContext();
  const contract = await createContract(server);

  const first = await server.inject({
    method: 'POST',
    url: `/api/v1/contracts/${contract.contractId}/acceptance`,
    headers: { authorization: 'Bearer buyer-token' },
    payload: { acceptedBy: 'buyer' },
  });
  assert.strictEqual(first.statusCode, 200);

  const duplicate = await server.inject({
    method: 'POST',
    url: `/api/v1/contracts/${contract.contractId}/acceptance`,
    headers: { authorization: 'Bearer buyer-token' },
    payload: { acceptedBy: 'buyer' },
  });
  assert.strictEqual(duplicate.statusCode, 409);
  assert.strictEqual(duplicate.json().error.code, 'CONFLICT');
});
