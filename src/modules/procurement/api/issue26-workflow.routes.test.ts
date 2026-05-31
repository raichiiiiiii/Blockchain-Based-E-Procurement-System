import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import { InMemoryOnboardingCaseRepository } from '../../kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.js';
import type { OnboardingCase } from '../../kyc-aml-onboarding/domain/onboarding-case.js';
import { InMemoryDeliveryEvidenceRepository } from '../infrastructure/in-memory-delivery-evidence-repository.js';
import { InMemoryProcurementCloseoutRepository } from '../infrastructure/in-memory-procurement-closeout-repository.js';
import { InMemoryProcurementInvoiceRepository } from '../infrastructure/in-memory-invoice-repository.js';
import { InMemoryProcurementOrderRepository } from '../infrastructure/in-memory-procurement-order-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemorySourceToAwardRepository } from '../infrastructure/in-memory-source-to-award-repository.js';

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

function approvedCase(memberOrganizationId: string): OnboardingCase {
  const now = new Date().toISOString();
  return {
    id: `kyc_aml_case_${memberOrganizationId}`,
    memberOrganizationId,
    kyc: {
      legalName: `${memberOrganizationId} Legal`,
      registrationNumber: `${memberOrganizationId}-REG`,
      countryCode: 'MY',
      businessType: 'Procurement',
    },
    aml: {
      declaredBusinessActivity: 'Procurement operations',
      expectedMonthlyTransactionValue: '100000',
      declaredSanctionsExposure: false,
      declaredPepExposure: false,
    },
    evidenceReferences: [{
      type: 'companyRegistration',
      name: 'Company registration metadata',
      uri: 'evidence://company-registration',
      mediaType: 'application/pdf',
    }],
    status: 'approved',
    submittedByUserId: 'compliance-user',
    createdAt: now,
    updatedAt: now,
    decision: {
      outcome: 'pass',
      rationale: 'Approved for procurement demo.',
      decidedByUserId: 'compliance-user',
      decidedAt: now,
    },
  };
}

async function createIssue26Context() {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const onboardingCaseRepository = new InMemoryOnboardingCaseRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
  const orderRepository = new InMemoryProcurementOrderRepository();
  const deliveryEvidenceRepository = new InMemoryDeliveryEvidenceRepository();
  const sourceToAwardRepository = new InMemorySourceToAwardRepository();
  const invoiceRepository = new InMemoryProcurementInvoiceRepository();
  const closeoutRepository = new InMemoryProcurementCloseoutRepository();

  await Promise.all([
    createSession(sessionRepository, {
      token: 'buyer-token',
      actorUserId: 'buyer-user',
      actorOrganizationId: 'buyer-org',
      actorRoleCodes: ['buyer'],
    }),
    createSession(sessionRepository, {
      token: 'supplier-token',
      actorUserId: 'supplier-user',
      actorOrganizationId: 'supplier-org',
      actorRoleCodes: ['supplier'],
    }),
    createSession(sessionRepository, {
      token: 'other-supplier-token',
      actorUserId: 'other-supplier-user',
      actorOrganizationId: 'other-supplier-org',
      actorRoleCodes: ['supplier'],
    }),
    createSession(sessionRepository, {
      token: 'auditor-token',
      actorUserId: 'auditor-user',
      actorOrganizationId: 'audit-org',
      actorRoleCodes: ['auditor'],
    }),
  ]);
  await onboardingCaseRepository.save(approvedCase('buyer-org'));

  const server = createTestableServer({
    sessionRepository,
    onboardingCaseRepository,
    procureToPayLifecycleEventRepository: lifecycleEventRepository,
    procurementOrderRepository: orderRepository,
    deliveryEvidenceRepository,
    sourceToAwardRepository,
    invoiceRepository,
    procurementCloseoutRepository: closeoutRepository,
  });
  await server.ready();

  return {
    server,
    lifecycleEventRepository,
  };
}

async function createAwardedAcceptedOrder(server: Awaited<ReturnType<typeof createIssue26Context>>['server']) {
  const requisition = await server.inject({
    method: 'POST',
    url: '/api/v1/source-to-award/requisitions',
    headers: { authorization: 'Bearer buyer-token' },
    payload: {
      title: 'Cold-chain packaging',
      estimatedAmount: '68000.00',
      currency: 'MYR',
    },
  });
  assert.strictEqual(requisition.statusCode, 200);
  const requisitionId = requisition.json().data.case.requisition.requisitionId;

  const approval = await server.inject({
    method: 'POST',
    url: `/api/v1/source-to-award/requisitions/${requisitionId}/approve`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  assert.strictEqual(approval.statusCode, 200);

  const rfq = await server.inject({
    method: 'POST',
    url: '/api/v1/source-to-award/rfqs',
    headers: { authorization: 'Bearer buyer-token' },
    payload: {
      requisitionId,
      supplierOrganizationIds: ['supplier-org'],
    },
  });
  assert.strictEqual(rfq.statusCode, 200);
  const rfqId = rfq.json().data.case.rfq.rfqId;

  const quotation = await server.inject({
    method: 'POST',
    url: `/api/v1/source-to-award/rfqs/${rfqId}/quotations`,
    headers: { authorization: 'Bearer supplier-token' },
    payload: {
      amount: '68000.00',
      currency: 'MYR',
      deliveryDays: 7,
      notes: 'Available stock with supervised dispatch.',
    },
  });
  assert.strictEqual(quotation.statusCode, 200);
  const quotationId = quotation.json().data.case.quotations[0].quotationId;

  const award = await server.inject({
    method: 'POST',
    url: `/api/v1/source-to-award/rfqs/${rfqId}/award`,
    headers: { authorization: 'Bearer buyer-token' },
    payload: {
      quotationId,
      rationale: 'Best compliant offer for the demo case.',
    },
  });
  assert.strictEqual(award.statusCode, 201);
  const orderId = award.json().data.order.orderId;

  const acknowledge = await server.inject({
    method: 'POST',
    url: `/api/v1/orders/${orderId}/acknowledgement`,
    headers: { authorization: 'Bearer supplier-token' },
    payload: { decision: 'accept' },
  });
  assert.strictEqual(acknowledge.statusCode, 200);

  return {
    sourceCaseId: award.json().data.case.caseId as string,
    orderId,
  };
}

test('buyer and supplier can execute source-to-award through purchase order handoff', async () => {
  const { server, lifecycleEventRepository } = await createIssue26Context();
  const { sourceCaseId, orderId } = await createAwardedAcceptedOrder(server);

  const readCase = await server.inject({
    method: 'GET',
    url: `/api/v1/source-to-award/cases/${sourceCaseId}`,
    headers: { authorization: 'Bearer supplier-token' },
  });

  assert.strictEqual(readCase.statusCode, 200);
  assert.strictEqual(readCase.json().data.case.generatedOrderId, orderId);
  assert.strictEqual(readCase.json().data.case.status, 'purchaseOrderGenerated');

  const events = await lifecycleEventRepository.list();
  for (const eventType of [
    'requisitionCreated',
    'requisitionApproved',
    'rfqIssued',
    'quotationSubmitted',
    'awardSelected',
    'purchaseOrderGenerated',
    'purchaseOrderAccepted',
  ]) {
    assert.ok(events.some(event => event.eventType === eventType), `${eventType} event should be recorded`);
  }
});

test('uninvited supplier cannot submit a quotation', async () => {
  const { server } = await createIssue26Context();
  const requisition = await server.inject({
    method: 'POST',
    url: '/api/v1/source-to-award/requisitions',
    headers: { authorization: 'Bearer buyer-token' },
    payload: { title: 'Restricted RFQ', estimatedAmount: '1000', currency: 'MYR' },
  });
  const requisitionId = requisition.json().data.case.requisition.requisitionId;
  await server.inject({
    method: 'POST',
    url: `/api/v1/source-to-award/requisitions/${requisitionId}/approve`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  const rfq = await server.inject({
    method: 'POST',
    url: '/api/v1/source-to-award/rfqs',
    headers: { authorization: 'Bearer buyer-token' },
    payload: { requisitionId, supplierOrganizationIds: ['supplier-org'] },
  });
  const rfqId = rfq.json().data.case.rfq.rfqId;

  const response = await server.inject({
    method: 'POST',
    url: `/api/v1/source-to-award/rfqs/${rfqId}/quotations`,
    headers: { authorization: 'Bearer other-supplier-token' },
    payload: { amount: '1000', currency: 'MYR' },
  });

  assert.strictEqual(response.statusCode, 403);
});

test('supplier invoice can be matched, approved for payment readiness, and closed out', async () => {
  const { server, lifecycleEventRepository } = await createIssue26Context();
  const { orderId } = await createAwardedAcceptedOrder(server);

  const evidence = await server.inject({
    method: 'POST',
    url: `/api/v1/orders/${orderId}/delivery-evidence`,
    headers: { authorization: 'Bearer supplier-token' },
    payload: {
      evidenceType: 'deliveryNote',
      evidenceReference: 'delivery-note:issue26:001',
      notes: 'Goods dispatched and received for matching.',
    },
  });
  assert.strictEqual(evidence.statusCode, 201);
  const evidenceId = evidence.json().data.evidenceId;

  const invoice = await server.inject({
    method: 'POST',
    url: '/api/v1/invoices',
    headers: { authorization: 'Bearer supplier-token' },
    payload: {
      orderId,
      deliveryEvidenceId: evidenceId,
      amount: '68000.00',
      currency: 'MYR',
      invoiceReference: 'invoice:issue26:001',
    },
  });
  assert.strictEqual(invoice.statusCode, 200);
  const invoiceId = invoice.json().data.invoiceId;

  const match = await server.inject({
    method: 'POST',
    url: `/api/v1/invoices/${invoiceId}/verify-match`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  assert.strictEqual(match.statusCode, 200);
  assert.strictEqual(match.json().data.matchResult.status, 'passed');

  const approval = await server.inject({
    method: 'POST',
    url: `/api/v1/invoices/${invoiceId}/approve-payment`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  assert.strictEqual(approval.statusCode, 200);
  assert.strictEqual(approval.json().data.status, 'paymentApproved');

  const closeout = await server.inject({
    method: 'POST',
    url: `/api/v1/procurement-cases/${orderId}/closeout`,
    headers: { authorization: 'Bearer buyer-token' },
    payload: { notes: 'Closed after evidence and invoice match.' },
  });
  assert.strictEqual(closeout.statusCode, 200);
  assert.strictEqual(closeout.json().data.status, 'closed');
  assert.strictEqual(closeout.json().data.metrics.invoiceExceptionCount, 0);

  const performance = await server.inject({
    method: 'GET',
    url: '/api/v1/suppliers/supplier-org/performance',
    headers: { authorization: 'Bearer auditor-token' },
  });
  assert.strictEqual(performance.statusCode, 200);
  assert.strictEqual(performance.json().data.supplierOrganizationId, 'supplier-org');
  assert.ok(performance.json().data.score >= 80);

  const events = await lifecycleEventRepository.list();
  assert.ok(events.some(event => event.eventType === 'invoiceIssued'));
  assert.ok(events.some(event => event.eventType === 'invoiceMatchPassed'));
  assert.ok(events.some(event => event.eventType === 'invoicePaymentApproved'));
});

test('invoice mismatch is explicit and does not approve payment readiness', async () => {
  const { server } = await createIssue26Context();
  const { orderId } = await createAwardedAcceptedOrder(server);

  const invoice = await server.inject({
    method: 'POST',
    url: '/api/v1/invoices',
    headers: { authorization: 'Bearer supplier-token' },
    payload: {
      orderId,
      amount: '99999.00',
      currency: 'MYR',
      invoiceReference: 'invoice:mismatch:001',
    },
  });
  assert.strictEqual(invoice.statusCode, 200);
  const invoiceId = invoice.json().data.invoiceId;

  const match = await server.inject({
    method: 'POST',
    url: `/api/v1/invoices/${invoiceId}/verify-match`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  assert.strictEqual(match.statusCode, 200);
  assert.strictEqual(match.json().data.matchResult.status, 'failed');
  assert.ok(match.json().data.matchResult.issues.includes('amountMismatch'));
  assert.ok(match.json().data.matchResult.issues.includes('deliveryEvidenceMissing'));

  const approval = await server.inject({
    method: 'POST',
    url: `/api/v1/invoices/${invoiceId}/approve-payment`,
    headers: { authorization: 'Bearer buyer-token' },
  });
  assert.strictEqual(approval.statusCode, 409);
});
