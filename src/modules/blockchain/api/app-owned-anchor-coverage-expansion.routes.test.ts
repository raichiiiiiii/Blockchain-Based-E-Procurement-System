import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createTestableServer } from '../../../app/server.js';
import { hashToken } from '../../auth/application/session-token.js';
import { InMemoryAuthSessionRepository } from '../../auth/infrastructure/in-memory-auth-session-repository.js';
import {
  InMemoryBlockchainAnchorGateway,
} from '../infrastructure/in-memory-blockchain-anchor-gateway.js';
import type { AnchorEventInput, AnchorEventResult } from '../application/blockchain-anchor-gateway.js';
import { InMemoryBlockchainAnchorMetadataRepository } from '../infrastructure/in-memory-blockchain-anchor-metadata-repository.js';
import { InMemoryDeliveryEvidenceRepository } from '../../procurement/infrastructure/in-memory-delivery-evidence-repository.js';
import { InMemoryProcureToPayLifecycleEventRepository } from '../../procurement/infrastructure/in-memory-procure-to-pay-lifecycle-event-repository.js';
import { InMemoryProcurementOrderRepository } from '../../procurement/infrastructure/in-memory-procurement-order-repository.js';
import { InMemoryEscrowRepository } from '../../escrow/infrastructure/in-memory-escrow-repository.js';
import { InMemoryOnboardingCaseRepository } from '../../kyc-aml-onboarding/infrastructure/in-memory-onboarding-case-repository.js';
import type { OnboardingCase } from '../../kyc-aml-onboarding/domain/onboarding-case.js';
import type { DeliveryEvidenceRecord } from '../../procurement/domain/delivery-evidence.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';
import type { EscrowRecord } from '../../escrow/domain/escrow.js';

const changedPayloadHash = `sha256:${'6'.repeat(64)}`;

function toGatewayPayloadHash(payloadHash: string): string {
  return payloadHash.startsWith('sha256:') ? payloadHash : `sha256:${payloadHash}`;
}

class CapturingBlockchainAnchorGateway extends InMemoryBlockchainAnchorGateway {
  readonly anchorInputs: AnchorEventInput[] = [];

  async anchorEvent(input: AnchorEventInput): Promise<AnchorEventResult> {
    this.anchorInputs.push({ ...input });
    return super.anchorEvent(input);
  }
}

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
    issuedAt: '2026-05-31T08:00:00.000Z',
    expiresAt: '2026-05-31T10:00:00.000Z',
    authenticationMethod: 'localPassword',
  });
}

function approvedCase(memberOrganizationId: string): OnboardingCase {
  return {
    id: `case-${memberOrganizationId}`,
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
      uri: `evidence://${memberOrganizationId}/company-registration`,
      mediaType: 'application/pdf',
    }],
    status: 'approved',
    submittedByUserId: 'compliance-user',
    createdAt: '2026-05-30T08:00:00.000Z',
    updatedAt: '2026-05-30T09:00:00.000Z',
    decision: {
      outcome: 'pass',
      rationale: 'Approved for procurement proof regression.',
      decidedByUserId: 'compliance-user',
      decidedAt: '2026-05-30T09:00:00.000Z',
    },
  };
}

function acceptedOrder(): ProcurementOrder {
  return {
    orderId: 'order-app-owned-expansion-1',
    buyerOrganizationId: 'buyer-org',
    supplierOrganizationId: 'supplier-org',
    title: 'App-owned proof expansion order',
    amount: '68000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'buyer-user',
    createdAt: '2026-05-30T08:00:00.000Z',
    updatedAt: '2026-05-30T09:00:00.000Z',
    acceptedBy: 'supplier-user',
    acceptedAt: '2026-05-30T09:00:00.000Z',
    lifecycleEventIds: ['order-accepted-event'],
  };
}

function seededDeliveryEvidence(): DeliveryEvidenceRecord {
  return {
    evidenceId: 'delivery-evidence-seeded-release',
    orderId: 'order-app-owned-expansion-1',
    buyerOrganizationId: 'buyer-org',
    supplierOrganizationId: 'supplier-org',
    submittedByUserId: 'supplier-user',
    evidenceType: 'deliveryNote',
    evidenceReference: 'delivery-ref:seeded-release',
    evidenceHash: `sha256:${'d'.repeat(64)}`,
    notes: 'Safe delivery evidence metadata for escrow release condition.',
    submittedAt: '2026-05-30T09:30:00.000Z',
    verificationStatus: 'metadataRecorded',
  };
}

function fundedEscrow(): EscrowRecord {
  return {
    escrowId: 'escrow-app-owned-release-1',
    orderId: 'order-app-owned-expansion-1',
    buyerOrganizationId: 'buyer-org',
    supplierOrganizationId: 'supplier-org',
    financierOrganizationId: 'financier-org',
    termsHash: `sha256:${'4'.repeat(64)}`,
    status: 'funded',
    acceptedOrderReference: 'accepted-order-app-owned-expansion-1',
    createdBy: 'buyer-user',
    createdAt: '2026-05-30T09:10:00.000Z',
    updatedAt: '2026-05-30T09:15:00.000Z',
  };
}

async function createCoverageContext(options?: {
  gateway?: CapturingBlockchainAnchorGateway;
  seedEscrow?: boolean;
  seedDeliveryEvidence?: boolean;
}) {
  const sessionRepository = new InMemoryAuthSessionRepository();
  const orderRepository = new InMemoryProcurementOrderRepository();
  const deliveryEvidenceRepository = new InMemoryDeliveryEvidenceRepository();
  const lifecycleEventRepository = new InMemoryProcureToPayLifecycleEventRepository();
  const anchorMetadataRepository = new InMemoryBlockchainAnchorMetadataRepository();
  const onboardingCaseRepository = new InMemoryOnboardingCaseRepository();
  const escrowRepository = new InMemoryEscrowRepository(options?.seedEscrow ? [fundedEscrow()] : []);
  const gateway = options?.gateway ?? new CapturingBlockchainAnchorGateway({
    now: () => '2026-05-31T09:20:00.000Z',
  });

  await createSession(sessionRepository, {
    token: 'buyer-token',
    actorUserId: 'buyer-user',
    actorOrganizationId: 'buyer-org',
    actorRoleCodes: ['buyer'],
  });
  await createSession(sessionRepository, {
    token: 'supplier-token',
    actorUserId: 'supplier-user',
    actorOrganizationId: 'supplier-org',
    actorRoleCodes: ['supplier'],
  });
  await createSession(sessionRepository, {
    token: 'auditor-token',
    actorUserId: 'auditor-user',
    actorOrganizationId: 'audit-org',
    actorRoleCodes: ['auditor'],
  });

  await onboardingCaseRepository.save(approvedCase('buyer-org'));
  await onboardingCaseRepository.save(approvedCase('supplier-org'));
  await orderRepository.save(acceptedOrder());
  if (options?.seedDeliveryEvidence) {
    await deliveryEvidenceRepository.save(seededDeliveryEvidence());
  }

  const server = createTestableServer({
    sessionRepository,
    procurementOrderRepository: orderRepository,
    deliveryEvidenceRepository,
    procureToPayLifecycleEventRepository: lifecycleEventRepository,
    blockchainAnchorGateway: gateway,
    blockchainAnchorMetadataRepository: anchorMetadataRepository,
    escrowRepository,
    onboardingCaseRepository,
    enforceBearerAuthForLegacyActorRoutes: true,
  });
  await server.ready();

  return {
    server,
    gateway,
    anchorMetadataRepository,
    lifecycleEventRepository,
    deliveryEvidenceRepository,
    escrowRepository,
  };
}

async function assertProofRoundTrip(input: {
  server: Awaited<ReturnType<typeof createCoverageContext>>['server'];
  eventId: string;
  expectedPayloadHash: string;
}) {
  const lookupResponse = await input.server.inject({
    method: 'GET',
    url: `/api/v1/blockchain/anchors/${input.eventId}`,
    headers: {
      authorization: 'Bearer auditor-token',
    },
  });
  assert.strictEqual(lookupResponse.statusCode, 200);
  const lookupBody = lookupResponse.json();
  assert.strictEqual(lookupBody.data.anchorStatus, 'anchored');
  assert.strictEqual(lookupBody.data.payloadHash, input.expectedPayloadHash);

  const verifyResponse = await input.server.inject({
    method: 'POST',
    url: `/api/v1/blockchain/anchors/${input.eventId}/verify`,
    headers: {
      authorization: 'Bearer auditor-token',
    },
    payload: {
      payloadHash: input.expectedPayloadHash,
    },
  });
  assert.strictEqual(verifyResponse.statusCode, 200);
  const verifyBody = verifyResponse.json();
  assert.strictEqual(verifyBody.data.verificationStatus, 'verified');
  assert.strictEqual(verifyBody.data.anchoredPayloadHash, input.expectedPayloadHash);

  const mismatchResponse = await input.server.inject({
    method: 'POST',
    url: `/api/v1/blockchain/anchors/${input.eventId}/verify`,
    headers: {
      authorization: 'Bearer auditor-token',
    },
    payload: {
      payloadHash: changedPayloadHash,
    },
  });
  assert.strictEqual(mismatchResponse.statusCode, 200);
  assert.strictEqual(mismatchResponse.json().data.verificationStatus, 'mismatch');

  const notFoundResponse = await input.server.inject({
    method: 'POST',
    url: `/api/v1/blockchain/anchors/missing-${input.eventId}/verify`,
    headers: {
      authorization: 'Bearer auditor-token',
    },
    payload: {
      payloadHash: input.expectedPayloadHash,
    },
  });
  assert.strictEqual(notFoundResponse.statusCode, 200);
  assert.strictEqual(notFoundResponse.json().data.verificationStatus, 'notFound');
}

function assertGatewayInputIsProofOnly(input: AnchorEventInput, expectedEventType: string) {
  assert.strictEqual(input.eventType, expectedEventType);
  assert.match(input.payloadHash, /^sha256:[a-f0-9]{64}$/);
  assert.match(input.caseIdHash, /^sha256:[a-f0-9]{64}$/);
  assert.strictEqual(input.canonicalization, 'json-canonical-v1');
  assert.strictEqual('caseId' in input, false);

  const serialized = JSON.stringify(input);
  assert.doesNotMatch(serialized, /delivery-ref:/);
  assert.doesNotMatch(serialized, /Safe delivery evidence metadata/);
  assert.doesNotMatch(serialized, /accepted-order-app-owned-expansion-1/);
}

describe('app-owned blockchain anchor coverage expansion', () => {
  it('anchors and verifies deliveryEvidenceSubmitted from the app-created delivery evidence route', async () => {
    const { server, gateway, anchorMetadataRepository, lifecycleEventRepository } = await createCoverageContext();

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/order-app-owned-expansion-1/delivery-evidence',
      headers: {
        authorization: 'Bearer supplier-token',
      },
      payload: {
        evidenceType: 'deliveryNote',
        evidenceReference: 'delivery-ref:app-owned-proof-expansion',
        notes: 'Safe delivery evidence metadata for app-owned proof expansion.',
      },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = response.json();
    assert.strictEqual(body.data.blockchainAnchor.anchorStatus, 'anchored');
    assert.strictEqual(body.data.rawDocument, undefined);

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].eventType, 'deliveryEvidenceSubmitted');
    assert.strictEqual(lifecycleEvents[0].eventId, body.data.lifecycleEventId);

    const metadata = await anchorMetadataRepository.findByEventId(body.data.lifecycleEventId);
    assert.strictEqual(metadata?.anchorStatus, 'anchored');
    assert.strictEqual(metadata?.payloadHash, toGatewayPayloadHash(lifecycleEvents[0].immutableReference.payloadHash));

    assert.strictEqual(gateway.anchorInputs.length, 1);
    assertGatewayInputIsProofOnly(gateway.anchorInputs[0], 'deliveryEvidenceSubmitted');

    await assertProofRoundTrip({
      server,
      eventId: body.data.lifecycleEventId,
      expectedPayloadHash: metadata?.payloadHash ?? '',
    });
  });

  it('keeps delivery evidence and lifecycle event persisted when delivery anchoring fails', async () => {
    const { server, anchorMetadataRepository, lifecycleEventRepository, deliveryEvidenceRepository } =
      await createCoverageContext({
        gateway: new CapturingBlockchainAnchorGateway({ unavailable: true }),
      });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/orders/order-app-owned-expansion-1/delivery-evidence',
      headers: {
        authorization: 'Bearer supplier-token',
      },
      payload: {
        evidenceType: 'deliveryNote',
        evidenceReference: 'delivery-ref:app-owned-proof-failure',
      },
    });

    assert.strictEqual(response.statusCode, 201);
    const body = response.json();
    assert.strictEqual(body.data.blockchainAnchor.anchorStatus, 'failed');
    assert.strictEqual(body.data.blockchainAnchor.failureReason, 'blockchain_unavailable');

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].eventType, 'deliveryEvidenceSubmitted');

    const storedEvidence = await deliveryEvidenceRepository.listByOrderId('order-app-owned-expansion-1');
    assert.strictEqual(storedEvidence.length, 1);
    assert.strictEqual(storedEvidence[0].evidenceId, body.data.evidenceId);

    const metadata = await anchorMetadataRepository.findByEventId(body.data.lifecycleEventId);
    assert.strictEqual(metadata?.anchorStatus, 'failed');
    assert.strictEqual(metadata?.failureReason, 'blockchain_unavailable');
  });

  it('anchors and verifies escrowReleaseRequested from the app-created escrow transition route', async () => {
    const { server, gateway, anchorMetadataRepository, lifecycleEventRepository } = await createCoverageContext({
      seedEscrow: true,
      seedDeliveryEvidence: true,
    });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/escrow/escrow-app-owned-release-1/request-release',
      headers: {
        authorization: 'Bearer supplier-token',
      },
      payload: {
        reason: 'Supplier requests release after delivery metadata review.',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = response.json();
    assert.strictEqual(body.data.escrow.status, 'releaseRequested');
    assert.strictEqual(body.data.escrow.blockchainAnchor.anchorStatus, 'anchored');

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].eventType, 'escrowReleaseRequested');
    assert.strictEqual(lifecycleEvents[0].eventId, body.data.escrow.lifecycleEventId);

    const metadata = await anchorMetadataRepository.findByEventId(body.data.escrow.lifecycleEventId);
    assert.strictEqual(metadata?.anchorStatus, 'anchored');
    assert.strictEqual(metadata?.payloadHash, toGatewayPayloadHash(lifecycleEvents[0].immutableReference.payloadHash));

    assert.strictEqual(gateway.anchorInputs.length, 1);
    assertGatewayInputIsProofOnly(gateway.anchorInputs[0], 'escrowReleaseRequested');

    await assertProofRoundTrip({
      server,
      eventId: body.data.escrow.lifecycleEventId,
      expectedPayloadHash: metadata?.payloadHash ?? '',
    });
  });

  it('keeps escrow release transition and lifecycle event persisted when release anchoring fails', async () => {
    const { server, anchorMetadataRepository, lifecycleEventRepository, escrowRepository } =
      await createCoverageContext({
        gateway: new CapturingBlockchainAnchorGateway({ unavailable: true }),
        seedEscrow: true,
        seedDeliveryEvidence: true,
      });

    const response = await server.inject({
      method: 'POST',
      url: '/api/v1/escrow/escrow-app-owned-release-1/request-release',
      headers: {
        authorization: 'Bearer supplier-token',
      },
      payload: {
        reason: 'Supplier requests release while proof gateway is unavailable.',
      },
    });

    assert.strictEqual(response.statusCode, 200);
    const body = response.json();
    assert.strictEqual(body.data.escrow.status, 'releaseRequested');
    assert.strictEqual(body.data.escrow.blockchainAnchor.anchorStatus, 'failed');
    assert.strictEqual(body.data.escrow.blockchainAnchor.failureReason, 'blockchain_unavailable');

    const lifecycleEvents = await lifecycleEventRepository.list();
    assert.strictEqual(lifecycleEvents.length, 1);
    assert.strictEqual(lifecycleEvents[0].eventType, 'escrowReleaseRequested');

    const storedEscrow = await escrowRepository.findById('escrow-app-owned-release-1');
    assert.strictEqual(storedEscrow?.status, 'releaseRequested');

    const metadata = await anchorMetadataRepository.findByEventId(body.data.escrow.lifecycleEventId);
    assert.strictEqual(metadata?.anchorStatus, 'failed');
    assert.strictEqual(metadata?.failureReason, 'blockchain_unavailable');
  });
});
