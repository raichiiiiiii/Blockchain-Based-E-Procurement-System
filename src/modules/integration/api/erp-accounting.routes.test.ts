import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import fastify from 'fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import actorContextPlugin from '../../../app/plugins/actor-context-plugin.js';
import { InMemoryProcurementContractRepository } from '../../contracts/infrastructure/in-memory-procurement-contract-repository.js';
import type { ProcurementContract } from '../../contracts/domain/procurement-contract.js';
import { InMemoryPaymentInstructionRepository } from '../../payments/infrastructure/in-memory-payment-instruction-repository.js';
import type { PaymentInstruction } from '../../payments/domain/payment-instruction.js';
import { InMemoryProcurementOrderRepository } from '../../procurement/infrastructure/in-memory-procurement-order-repository.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';
import { LocalJsonErpAccountingAdapter } from '../infrastructure/local-json-erp-accounting-adapter.js';
import { registerErpAccountingRoutes } from './erp-accounting.routes.js';

function authenticatedPreHandler(roles: string[]): (request: FastifyRequest, reply: FastifyReply) => Promise<unknown> {
  return async (request) => {
    request.actorContext = {
      userId: 'demo-user',
      authorizationContext: {
        roles,
      },
      isAuthenticated: true,
      actorUserId: 'demo-user',
      actorOrganizationId: 'demo-platform-org',
      actorRoleCodes: roles,
      authenticationSessionId: 'session-erp-test',
      authenticationMethod: 'localPassword',
    };
  };
}

function order(): ProcurementOrder {
  return {
    orderId: 'order-erp-1',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    title: 'Halal packaging lot',
    description: 'Accepted procurement order for ERP export.',
    amount: '68000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'demo-buyer-user',
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-21T09:00:00.000Z',
    lifecycleEventIds: ['event-order-1'],
  };
}

function paymentInstruction(): PaymentInstruction {
  return {
    paymentInstructionId: 'payment-erp-1',
    escrowId: 'escrow-erp-1',
    amount: '68000.00',
    currency: 'MYR',
    debtorOrganizationId: 'demo-buyer-org',
    creditorOrganizationId: 'demo-supplier-org',
    status: 'settled',
    paymentReference: 'PAY-ERP-001',
    adapterName: 'manualSettlement',
    createdByUserId: 'demo-financier-user',
    createdAt: '2026-05-22T09:00:00.000Z',
    updatedAt: '2026-05-22T10:00:00.000Z',
    lifecycleEventIds: ['event-payment-1'],
  };
}

function procurementContract(): ProcurementContract {
  return {
    contractId: 'contract-erp-1',
    contractNumber: 'AMANAH-BARAKAH-001',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    status: 'accepted',
    version: 1,
    machineReadableTerms: {
      parties: {
        buyerOrganizationId: 'demo-buyer-org',
        supplierOrganizationId: 'demo-supplier-org',
        financierOrganizationId: 'demo-financier-org',
      },
      lineItems: [{
        itemId: 'item-1',
        description: 'Halal packaging lot',
        quantity: '1',
        unitPrice: '68000.00',
        currency: 'MYR',
      }],
      deliveryTerms: 'Supplier dispatches to buyer warehouse.',
      acceptanceCriteria: ['Buyer reviews delivery evidence.'],
      escrowReleaseConditions: ['Accepted order', 'Delivery evidence', 'Eligibility'],
      paymentTerms: 'Sandbox/manual settlement only.',
      disputeAndArbitrationRules: 'Platform evidence only.',
      documentReferences: ['doc-contract-1'],
      clauseReferences: [],
      ocdsMapping: {
        awardId: 'award-erp-1',
        implementationMilestones: ['deliveryEvidenceSubmitted'],
      },
    },
    termsHash: 'sha256:contract-terms',
    createdByUserId: 'demo-buyer-user',
    createdAt: '2026-05-20T09:00:00.000Z',
    updatedAt: '2026-05-21T09:00:00.000Z',
    offers: [],
    acceptances: [],
    lifecycleEvents: [],
  };
}

async function createApp(roles: string[]) {
  const orderRepository = new InMemoryProcurementOrderRepository();
  await orderRepository.save(order());

  const paymentInstructionRepository = new InMemoryPaymentInstructionRepository();
  await paymentInstructionRepository.save(paymentInstruction());

  const contractRepository = new InMemoryProcurementContractRepository();
  await contractRepository.save(procurementContract());

  const adapter = new LocalJsonErpAccountingAdapter();
  const app = fastify();
  app.register(actorContextPlugin);
  app.register(registerErpAccountingRoutes, {
    adapter,
    orderRepository,
    paymentInstructionRepository,
    contractRepository,
    authenticatedPreHandler: authenticatedPreHandler(roles),
  });
  await app.ready();

  return { app, adapter };
}

describe('ERP accounting routes', () => {
  it('exports an accepted procurement order to UBL/Peppol-like JSON and replays idempotency key', async () => {
    const { app } = await createApp(['administrator']);

    const first = await app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      headers: {
        'idempotency-key': 'erp-order-export-1',
      },
      payload: {
        profileType: 'ublOrder',
        sourceId: 'order-erp-1',
      },
    });
    assert.strictEqual(first.statusCode, 200);
    const firstBody = JSON.parse(first.body);
    assert.strictEqual(firstBody.data.profileType, 'ublOrder');
    assert.strictEqual(firstBody.data.payload.documentType, 'Order');
    assert.strictEqual(firstBody.data.payload.profileId, 'urn:fdc:peppol.eu:poacc:bis:ordering:3');

    const replay = await app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      headers: {
        'idempotency-key': 'erp-order-export-1',
      },
      payload: {
        profileType: 'ublOrder',
        sourceId: 'order-erp-1',
      },
    });
    assert.strictEqual(replay.statusCode, 200);
    assert.strictEqual(JSON.parse(replay.body).data.jobId, firstBody.data.jobId);
  });

  it('returns clear mapping errors for invalid order imports', async () => {
    const { app } = await createApp(['administrator']);

    const response = await app.inject({
      method: 'POST',
      url: '/integrations/erp/import',
      payload: {
        profileType: 'ublOrder',
        payload: {
          id: 'external-order-1',
        },
      },
    });

    assert.strictEqual(response.statusCode, 422);
    const body = JSON.parse(response.body);
    assert.strictEqual(body.data.status, 'rejected');
    assert.ok(body.data.mappingErrors.includes('buyerCustomerParty is required'));
    assert.strictEqual(body.data.claimBoundary, 'localJsonAdapterOnlyNoProductionErpSync');
  });

  it('exports payment status and OCDS-like contract release packages', async () => {
    const { app } = await createApp(['administrator']);

    const despatchAdvice = await app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      payload: {
        profileType: 'ublDespatchAdvice',
        sourceId: 'order-erp-1',
      },
    });
    assert.strictEqual(despatchAdvice.statusCode, 200);
    assert.strictEqual(JSON.parse(despatchAdvice.body).data.payload.documentType, 'DespatchAdvice');

    const payment = await app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      payload: {
        profileType: 'paymentStatus',
        sourceId: 'payment-erp-1',
      },
    });
    assert.strictEqual(payment.statusCode, 200);
    assert.strictEqual(JSON.parse(payment.body).data.payload.status, 'settled');

    const contract = await app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      payload: {
        profileType: 'ocdsReleasePackage',
        sourceId: 'contract-erp-1',
      },
    });
    assert.strictEqual(contract.statusCode, 200);
    assert.strictEqual(JSON.parse(contract.body).data.payload.standard, 'OCDS-like');
  });

  it('restricts export/import to administrators and allows auditors to inspect jobs', async () => {
    const buyer = await createApp(['buyer']);
    const denied = await buyer.app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      payload: {
        profileType: 'ublOrder',
        sourceId: 'order-erp-1',
      },
    });
    assert.strictEqual(denied.statusCode, 403);

    const admin = await createApp(['administrator']);
    const created = await admin.app.inject({
      method: 'POST',
      url: '/integrations/erp/export',
      payload: {
        profileType: 'ublOrder',
        sourceId: 'order-erp-1',
      },
    });
    const jobId = JSON.parse(created.body).data.jobId;

    const auditorApp = fastify();
    auditorApp.register(actorContextPlugin);
    auditorApp.register(registerErpAccountingRoutes, {
      adapter: admin.adapter,
      orderRepository: new InMemoryProcurementOrderRepository(),
      paymentInstructionRepository: new InMemoryPaymentInstructionRepository(),
      contractRepository: new InMemoryProcurementContractRepository(),
      authenticatedPreHandler: authenticatedPreHandler(['auditor']),
    });
    await auditorApp.ready();

    const read = await auditorApp.inject({
      method: 'GET',
      url: `/integrations/erp/jobs/${jobId}`,
    });
    assert.strictEqual(read.statusCode, 200);
  });
});
