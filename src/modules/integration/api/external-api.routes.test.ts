import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { createExternalSignature, hashExternalSecret } from '../application/external-request-signing.js';
import { InMemoryExternalApiAuditRepository } from '../infrastructure/in-memory-external-api-audit-repository.js';
import { InMemoryExternalClientCredentialRepository } from '../infrastructure/in-memory-external-client-credential-repository.js';
import { InMemoryExternalIdempotencyRepository } from '../infrastructure/in-memory-external-idempotency-repository.js';
import { InMemoryDeliveryEvidenceRepository } from '../../procurement/infrastructure/in-memory-delivery-evidence-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcurementOrderRepository } from '../../procurement/infrastructure/in-memory-procurement-order-repository.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';

const sharedSecret = 'external-test-secret';
const proofVerifyRoute = '/api/v1/external/proof/verify';
const proofVerifyBody = {
  eventId: 'event-123',
  payloadHash: `sha256:${'a'.repeat(64)}`,
};

function signedHeaders(input: {
  route?: string;
  clientId?: string;
  secret?: string;
  idempotencyKey?: string;
  timestamp?: string;
  requestBody?: unknown;
} = {}) {
  const timestamp = input.timestamp ?? new Date().toISOString();
  const idempotencyKey = input.idempotencyKey ?? 'idem-1';
  const clientId = input.clientId ?? 'proof-client';
  const signature = createExternalSignature({
    method: 'POST',
    path: input.route ?? proofVerifyRoute,
    timestamp,
    idempotencyKey,
    body: input.requestBody ?? proofVerifyBody,
  }, input.secret ?? sharedSecret);

  return {
    'x-client-id': clientId,
    'x-request-timestamp': timestamp,
    'x-signature': signature,
    'idempotency-key': idempotencyKey,
  };
}

function acceptedOrder(overrides: Partial<ProcurementOrder> = {}): ProcurementOrder {
  return {
    orderId: 'order-external-delivery-1',
    buyerOrganizationId: 'buyer-org',
    supplierOrganizationId: 'supplier-org',
    title: 'Halal packaging lot',
    amount: '68000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'buyer-user',
    createdAt: '2026-05-22T09:20:00.000Z',
    updatedAt: '2026-05-22T13:45:00.000Z',
    acceptedBy: 'supplier-user',
    acceptedAt: '2026-05-22T13:45:00.000Z',
    lifecycleEventIds: ['order-accepted-event'],
    ...overrides,
  };
}

async function createExternalApiTestContext(scopes: string[] = ['proof:verify']) {
  const externalClientCredentialRepository = new InMemoryExternalClientCredentialRepository([{
    clientId: 'proof-client',
    clientName: 'Proof Client',
    scopes: scopes as any,
    status: 'active',
    secretHash: hashExternalSecret(sharedSecret),
    createdAt: '2026-05-26T00:00:00.000Z',
  }]);
  const externalIdempotencyRepository = new InMemoryExternalIdempotencyRepository();
  const externalApiAuditRepository = new InMemoryExternalApiAuditRepository();
  const procurementOrderRepository = new InMemoryProcurementOrderRepository();
  const deliveryEvidenceRepository = new InMemoryDeliveryEvidenceRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();

  await procurementOrderRepository.save(acceptedOrder());

  const server = createTestableServer({
    externalClientCredentialRepository,
    externalIdempotencyRepository,
    externalApiAuditRepository,
    procurementOrderRepository,
    deliveryEvidenceRepository,
    procureToPayLifecycleEventRepository: lifecycleEventRepository,
    externalApiSharedSecret: sharedSecret,
  });
  await server.ready();

  return {
    server,
    externalApiAuditRepository,
    deliveryEvidenceRepository,
    lifecycleEventRepository,
  };
}

test('valid scoped external client can submit a proof verification request', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();

  const response = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    headers: signedHeaders(),
    payload: proofVerifyBody,
  });

  const responseBody = response.json();
  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 202);
  assert.strictEqual(responseBody.data.accepted, true);
  assert.strictEqual(responseBody.data.replayed, false);
  assert.strictEqual(responseBody.data.clientId, 'proof-client');
  assert.strictEqual(responseBody.data.scope, 'proof:verify');
  assert.strictEqual(JSON.stringify(responseBody).includes(sharedSecret), false);
  assert.strictEqual(auditEvents.at(-1)?.outcome, 'accepted');
});

test('external calls without signed authentication headers are rejected and audited', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();

  const response = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    payload: proofVerifyBody,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
  assert.strictEqual(auditEvents.at(-1)?.outcome, 'rejected');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'missing_external_auth_headers');
});

test('invalid external signatures are rejected', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();

  const response = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    headers: signedHeaders({ secret: 'wrong-secret' }),
    payload: proofVerifyBody,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 401);
  assert.strictEqual(response.json().error.code, 'UNAUTHORIZED');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'invalid_external_signature');
});

test('valid external client without required scope is rejected', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext(['evidence:write']);

  const response = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    headers: signedHeaders(),
    payload: proofVerifyBody,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'external_scope_denied');
});

test('idempotency key replays return the original request id', async () => {
  const { server } = await createExternalApiTestContext();
  const headers = signedHeaders({ idempotencyKey: 'idem-replay' });

  const first = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    headers,
    payload: proofVerifyBody,
  });
  const second = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    headers,
    payload: proofVerifyBody,
  });

  assert.strictEqual(first.statusCode, 202);
  assert.strictEqual(second.statusCode, 200);
  assert.strictEqual(second.json().data.replayed, true);
  assert.strictEqual(second.json().data.requestId, first.json().data.requestId);
});

test('invalid external proof payload is rejected with the standard error envelope', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext();
  const invalidBody = {
    eventId: 'event-123',
    payloadHash: 'not-a-sha256-hash',
  };

  const response = await server.inject({
    method: 'POST',
    url: proofVerifyRoute,
    headers: signedHeaders({ requestBody: invalidBody }),
    payload: invalidBody,
  });

  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.json().error.code, 'VALIDATION_ERROR');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'invalid_external_proof_verify_payload');
});

test('valid signed IoT event creates delivery evidence and delivery proof lifecycle event', async () => {
  const { server, deliveryEvidenceRepository, lifecycleEventRepository, externalApiAuditRepository } =
    await createExternalApiTestContext(['evidence:write']);
  const route = '/api/v1/external/iot/events';
  const iotBody = {
    orderId: 'order-external-delivery-1',
    supplierOrganizationId: 'supplier-org',
    deviceId: 'temp-sensor-7',
    eventType: 'temperatureWithinRange',
    observedAt: '2026-05-26T08:15:00.000Z',
    locationId: 'warehouse-a',
    readingSummary: '2-8C maintained',
    payloadHash: `sha256:${'b'.repeat(64)}`,
  };

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ route, requestBody: iotBody, idempotencyKey: 'iot-1' }),
    payload: iotBody,
  });

  const body = response.json();
  const storedEvidence = await deliveryEvidenceRepository.listByOrderId('order-external-delivery-1');
  const lifecycleEvents = await lifecycleEventRepository.list();
  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 202);
  assert.strictEqual(body.data.accepted, true);
  assert.strictEqual(body.data.evidence.evidenceType, 'inspectionRecord');
  assert.strictEqual(body.data.evidence.evidenceHash, iotBody.payloadHash);
  assert.strictEqual(storedEvidence.length, 1);
  assert.strictEqual(storedEvidence[0].evidenceReference, 'iot:temp-sensor-7:temperatureWithinRange:2026-05-26T08:15:00.000Z');
  assert.strictEqual(lifecycleEvents.length, 1);
  assert.strictEqual(lifecycleEvents[0].eventType, 'deliveryProofSubmitted');
  assert.strictEqual(auditEvents.at(-1)?.outcome, 'accepted');
});

test('external delivery proof idempotency replay does not create duplicate evidence', async () => {
  const { server, deliveryEvidenceRepository } = await createExternalApiTestContext(['evidence:write']);
  const route = '/api/v1/external/qr/proofs';
  const qrBody = {
    orderId: 'order-external-delivery-1',
    supplierOrganizationId: 'supplier-org',
    qrProofId: 'qr-proof-22',
    publicKeyId: 'supplier-key-1',
    signature: `sha256:${'c'.repeat(64)}`,
    observedAt: '2026-05-26T08:20:00.000Z',
  };
  const headers = signedHeaders({ route, requestBody: qrBody, idempotencyKey: 'qr-replay' });

  const first = await server.inject({ method: 'POST', url: route, headers, payload: qrBody });
  const second = await server.inject({ method: 'POST', url: route, headers, payload: qrBody });
  const storedEvidence = await deliveryEvidenceRepository.listByOrderId('order-external-delivery-1');

  assert.strictEqual(first.statusCode, 202);
  assert.strictEqual(second.statusCode, 200);
  assert.strictEqual(second.json().data.replayed, true);
  assert.strictEqual(second.json().data.requestId, first.json().data.requestId);
  assert.strictEqual(storedEvidence.length, 1);
});

test('QR proof with invalid detached signature metadata is rejected', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext(['evidence:write']);
  const route = '/api/v1/external/qr/proofs';
  const qrBody = {
    orderId: 'order-external-delivery-1',
    supplierOrganizationId: 'supplier-org',
    qrProofId: 'qr-proof-invalid',
    publicKeyId: 'supplier-key-1',
    signature: 'not-a-signature-hash',
  };

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ route, requestBody: qrBody, idempotencyKey: 'qr-invalid' }),
    payload: qrBody,
  });
  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 400);
  assert.strictEqual(response.json().error.code, 'VALIDATION_ERROR');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'invalid_external_delivery_payload');
});

test('valid scoped EPCIS event creates logistics delivery evidence', async () => {
  const { server, deliveryEvidenceRepository, lifecycleEventRepository } =
    await createExternalApiTestContext(['logistics:write']);
  const route = '/api/v1/external/epcis/events';
  const epcisBody = {
    orderId: 'order-external-delivery-1',
    supplierOrganizationId: 'supplier-org',
    type: 'ObjectEvent',
    eventTime: '2026-05-26T08:30:00.000Z',
    bizStep: 'shipping',
    disposition: 'in_transit',
    readPoint: 'dock-door-2',
    epcList: ['urn:epc:id:sgtin:0614141.107346.2017'],
  };

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ route, requestBody: epcisBody, idempotencyKey: 'epcis-1' }),
    payload: epcisBody,
  });

  const storedEvidence = await deliveryEvidenceRepository.listByOrderId('order-external-delivery-1');
  const lifecycleEvents = await lifecycleEventRepository.list();

  assert.strictEqual(response.statusCode, 202);
  assert.strictEqual(storedEvidence.length, 1);
  assert.strictEqual(storedEvidence[0].evidenceType, 'warehouseReceipt');
  assert.match(storedEvidence[0].evidenceHash, /^sha256:[a-f0-9]{64}$/);
  assert.strictEqual(lifecycleEvents[0].eventType, 'logisticsEventRecorded');
});

test('external delivery proof client without required scope is rejected', async () => {
  const { server, externalApiAuditRepository } = await createExternalApiTestContext(['proof:verify']);
  const route = '/api/v1/external/epcis/events';
  const epcisBody = {
    orderId: 'order-external-delivery-1',
    supplierOrganizationId: 'supplier-org',
    type: 'ObjectEvent',
    eventTime: '2026-05-26T08:30:00.000Z',
  };

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ route, requestBody: epcisBody, idempotencyKey: 'epcis-scope' }),
    payload: epcisBody,
  });
  const auditEvents = await externalApiAuditRepository.list();

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
  assert.strictEqual(auditEvents.at(-1)?.reason, 'external_scope_denied');
});

test('external delivery proof for unrelated supplier is rejected', async () => {
  const { server, deliveryEvidenceRepository } = await createExternalApiTestContext(['evidence:write']);
  const route = '/api/v1/external/iot/events';
  const iotBody = {
    orderId: 'order-external-delivery-1',
    supplierOrganizationId: 'unrelated-supplier-org',
    deviceId: 'temp-sensor-7',
    eventType: 'temperatureWithinRange',
    observedAt: '2026-05-26T08:15:00.000Z',
  };

  const response = await server.inject({
    method: 'POST',
    url: route,
    headers: signedHeaders({ route, requestBody: iotBody, idempotencyKey: 'iot-unrelated' }),
    payload: iotBody,
  });
  const storedEvidence = await deliveryEvidenceRepository.listByOrderId('order-external-delivery-1');

  assert.strictEqual(response.statusCode, 403);
  assert.strictEqual(response.json().error.code, 'FORBIDDEN');
  assert.strictEqual(storedEvidence.length, 0);
});
