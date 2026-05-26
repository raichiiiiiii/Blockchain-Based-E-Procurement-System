import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { InMemoryEscrowRepository } from '../../escrow/infrastructure/in-memory-escrow-repository.js';
import type { EscrowRecord } from '../../escrow/domain/escrow.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryPaymentInstructionRepository } from '../infrastructure/in-memory-payment-instruction-repository.js';
import { LocalSandboxPaymentAdapter } from '../infrastructure/local-sandbox-payment-adapter.js';
import { ManualSettlementAdapter } from '../infrastructure/manual-settlement-adapter.js';
import { registerPaymentRoutes } from './payment.routes.js';

function settlementReadyEscrow(overrides: Partial<EscrowRecord> = {}): EscrowRecord {
  return {
    escrowId: 'escrow-ready-1',
    orderId: 'order-123',
    buyerOrganizationId: 'org-buyer-1',
    supplierOrganizationId: 'org-supplier-1',
    financierOrganizationId: 'org-financier-1',
    termsHash: 'sha256:terms-hash',
    acceptedOrderReference: 'accepted-order-123',
    status: 'settlementInstructionReady',
    createdBy: 'buyer-user-1',
    createdAt: '2026-05-26T08:00:00.000Z',
    updatedAt: '2026-05-26T09:00:00.000Z',
    lifecycleEventId: 'escrow-release-event-1',
    lifecycleEventHash: 'sha256:escrow-release-hash',
    ...overrides,
  };
}

function authenticatedRolePreHandler(): (request: FastifyRequest, reply: FastifyReply) => Promise<void> {
  return async (request) => {
    if (!request.headers['x-actor-role'] && !request.headers['x-actor-id']) {
      request.actorContext = {
        userId: undefined,
        authorizationContext: {
          roles: [],
        },
        isAuthenticated: false,
        actorRoleCodes: [],
      };
      return;
    }

    const role = String(request.headers['x-actor-role'] ?? 'buyer');
    const userId = String(request.headers['x-actor-id'] ?? `${role}-user-1`);
    const organizationByRole: Record<string, string> = {
      buyer: 'org-buyer-1',
      supplier: 'org-supplier-1',
      financier: 'org-financier-1',
      auditor: 'audit-org',
      administrator: 'platform-org',
    };

    request.actorContext = {
      userId,
      authorizationContext: {
        roles: [role],
      },
      isAuthenticated: true,
      actorUserId: userId,
      actorOrganizationId: organizationByRole[role],
      actorRoleCodes: [role],
      authenticationSessionId: `session-${userId}`,
      authenticationMethod: 'localPassword',
    };
  };
}

async function createApp(seedEscrows: EscrowRecord[] = [settlementReadyEscrow()]) {
  const app = fastify();
  const escrowRepository = new InMemoryEscrowRepository(seedEscrows);
  const paymentRepository = new InMemoryPaymentInstructionRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
  app.register(actorContextPlugin);
  app.register(registerPaymentRoutes, {
    repository: paymentRepository,
    escrowRepository,
    lifecycleEventRepository,
    adapters: {
      localSandbox: new LocalSandboxPaymentAdapter(),
      manualSettlement: new ManualSettlementAdapter(),
    },
    authenticatedPreHandler: authenticatedRolePreHandler(),
  });
  await app.ready();
  return { app, escrowRepository, paymentRepository, lifecycleEventRepository };
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    escrowId: 'escrow-ready-1',
    amount: '68000.00',
    currency: 'MYR',
    paymentReference: 'settlement:escrow-ready-1',
    adapterName: 'localSandbox',
    ...overrides,
  };
}

describe('Payment instruction routes', () => {
  it('creates a sandbox payment instruction only for settlement-ready escrow', async () => {
    const { app, lifecycleEventRepository } = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: {
        'x-actor-role': 'buyer',
        'x-request-id': 'req-payment-create',
      },
      payload: validPayload(),
    });

    assert.strictEqual(response.statusCode, 201);
    const body = response.json();
    assert.strictEqual(body.data.status, 'accepted');
    assert.strictEqual(body.data.adapterName, 'localSandbox');
    assert.strictEqual(body.data.escrowId, 'escrow-ready-1');
    assert.match(body.data.adapterReference, /^sandbox-payment:/);

    const events = await lifecycleEventRepository.list();
    assert.strictEqual(events.length, 1);
    assert.strictEqual(events[0].lifecycleStage, 'settlement');
    assert.strictEqual(events[0].eventType, 'settlementInitiated');
    assert.strictEqual(events[0].targetType, 'paymentInstruction');
  });

  it('rejects payment instruction creation before escrow reaches settlement instruction state', async () => {
    const { app } = await createApp([
      settlementReadyEscrow({ status: 'releaseRequested' }),
    ]);

    const response = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: validPayload(),
    });

    assert.strictEqual(response.statusCode, 409);
    assert.strictEqual(response.json().error.details.reason, 'escrowNotReadyForPaymentInstruction');
  });

  it('prevents duplicate active payment instructions for the same escrow', async () => {
    const { app } = await createApp();

    const first = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: validPayload({ sandboxStatus: 'pending' }),
    });
    assert.strictEqual(first.statusCode, 201);

    const second = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: validPayload({ sandboxStatus: 'accepted' }),
    });

    assert.strictEqual(second.statusCode, 409);
    assert.strictEqual(second.json().error.details.reason, 'activePaymentInstructionExists');
  });

  it('lets sandbox reconciliation simulate settled and failed states without mutating escrow state', async () => {
    const { app, escrowRepository, lifecycleEventRepository } = await createApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: validPayload({ sandboxStatus: 'pending' }),
    });
    const paymentInstructionId = createResponse.json().data.paymentInstructionId;

    const reconcileResponse = await app.inject({
      method: 'POST',
      url: `/payments/instructions/${paymentInstructionId}/reconcile`,
      headers: { 'x-actor-role': 'financier' },
      payload: { status: 'settled' },
    });

    assert.strictEqual(reconcileResponse.statusCode, 200);
    assert.strictEqual(reconcileResponse.json().data.status, 'settled');
    assert.strictEqual((await escrowRepository.findById('escrow-ready-1'))?.status, 'settlementInstructionReady');

    const events = await lifecycleEventRepository.list();
    assert.strictEqual(events.at(-1)?.eventType, 'settlementCompleted');
  });

  it('records sandbox failure as auditable payment state without corrupting escrow state', async () => {
    const { app, escrowRepository, lifecycleEventRepository } = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: validPayload({ sandboxStatus: 'failed' }),
    });

    assert.strictEqual(response.statusCode, 201);
    assert.strictEqual(response.json().data.status, 'failed');
    assert.strictEqual((await escrowRepository.findById('escrow-ready-1'))?.status, 'settlementInstructionReady');
    assert.strictEqual((await lifecycleEventRepository.list())[0].eventType, 'settlementFailed');
  });

  it('allows auditor read while denying unauthorized mutation and anonymous access', async () => {
    const { app } = await createApp();

    const createResponse = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: validPayload(),
    });
    const paymentInstructionId = createResponse.json().data.paymentInstructionId;

    const readResponse = await app.inject({
      method: 'GET',
      url: `/payments/instructions/${paymentInstructionId}`,
      headers: { 'x-actor-role': 'auditor' },
    });
    assert.strictEqual(readResponse.statusCode, 200);

    const supplierReconcile = await app.inject({
      method: 'POST',
      url: `/payments/instructions/${paymentInstructionId}/reconcile`,
      headers: { 'x-actor-role': 'supplier' },
      payload: { status: 'settled' },
    });
    assert.strictEqual(supplierReconcile.statusCode, 403);

    const anonymous = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      payload: validPayload(),
    });
    assert.strictEqual(anonymous.statusCode, 401);
  });

  it('rejects invalid payment instruction payloads with the standard validation envelope', async () => {
    const { app } = await createApp();

    const response = await app.inject({
      method: 'POST',
      url: '/payments/instructions',
      headers: { 'x-actor-role': 'buyer' },
      payload: {
        escrowId: 'escrow-ready-1',
        amount: '0',
        currency: 'myr',
      },
    });

    assert.strictEqual(response.statusCode, 400);
    assert.strictEqual(response.json().error.code, 'VALIDATION_ERROR');
  });
});
