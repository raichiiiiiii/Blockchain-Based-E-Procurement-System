import { BackendApiError } from '../api/errors';
import { requestJson } from '../api/http-client';
import { getLocalOrganizationEligibility } from '../api/compliance-cases';
import type { ProcurementOrderResponse } from '../types/procurement-order';
import type { BlockchainAnchorStatus, BlockchainProofRecord } from './blockchain-proof-client';
import type { AuthenticatedFrontendSession } from './session-state';

export type EscrowStatus =
  | 'accepted'
  | 'escrowCreated'
  | 'releasePending'
  | 'releaseReady'
  | 'released'
  | 'cancelled'
  | 'disputed';

export type EscrowBlockchainAnchor = {
  eventId?: string;
  payloadHash?: string;
  anchorStatus: BlockchainAnchorStatus;
  blockchainNetwork?: 'fabric-local' | 'fabric';
  transactionId?: string;
  blockNumber?: string;
  channelName?: string;
  chaincodeName?: string;
  anchoredAt?: string;
  failureReason?: string;
};

export type EscrowRecord = {
  escrowId: string;
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId?: string;
  termsHash: string;
  status: EscrowStatus;
  acceptedOrderReference?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lifecycleEventId?: string;
  lifecycleEventHash?: string;
  blockchainAnchor?: EscrowBlockchainAnchor;
  source?: 'backend' | 'localDemoAdapter';
};

export type CreateEscrowRequest = {
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId?: string;
  termsHash: string;
  acceptedOrderReference?: string;
};

const demoLifecycleHash = 'sha256:60bbd179b6c8d614109f6ba4fd161b97589f8e6e54c4abec2ce9e07a6f49160b';
const demoTermsHash = 'sha256:6af82d20c8da9af0c3f9bb73d7e5f3f7f5dbd92bb326f62f078602d6deed671c';

export const demoAcceptedOrder = {
  orderId: 'demo-order-001',
  supplierOrganizationId: 'demo-supplier-org',
  financierOrganizationId: 'demo-financier-org',
  termsHash: demoTermsHash,
  acceptedOrderReference: 'accepted-order-demo-001',
};

function createLocalDemoEscrow(
  request: CreateEscrowRequest,
  session?: AuthenticatedFrontendSession,
): EscrowRecord {
  const now = new Date().toISOString();

  return {
    escrowId: 'demo-escrow-001',
    orderId: request.orderId,
    buyerOrganizationId: request.buyerOrganizationId,
    supplierOrganizationId: request.supplierOrganizationId,
    financierOrganizationId: request.financierOrganizationId,
    termsHash: request.termsHash,
    status: 'escrowCreated',
    acceptedOrderReference: request.acceptedOrderReference,
    createdBy: session?.actor.actorUserId ?? 'demo-buyer-user',
    createdAt: now,
    updatedAt: now,
    lifecycleEventId: 'escrow-created-pending',
    lifecycleEventHash: demoLifecycleHash,
    blockchainAnchor: {
      eventId: 'escrow-created-pending',
      payloadHash: demoLifecycleHash,
      anchorStatus: 'pending',
      blockchainNetwork: 'fabric-local',
      channelName: 'procurement-channel',
      chaincodeName: 'audit-anchor',
    },
    source: 'localDemoAdapter',
  };
}

function assertLocalEscrowCanBeCreated(request: CreateEscrowRequest) {
  if (!request.acceptedOrderReference) {
    throw new BackendApiError('VALIDATION_ERROR', 'An accepted order is required before escrow can be created');
  }

  const buyerEligibility = getLocalOrganizationEligibility(request.buyerOrganizationId);
  if (buyerEligibility.eligibility !== 'eligible') {
    throw new BackendApiError(
      'FORBIDDEN',
      `Buyer organization eligibility is ${buyerEligibility.eligibility}; escrow action is blocked`,
    );
  }

  const supplierEligibility = getLocalOrganizationEligibility(request.supplierOrganizationId);
  if (supplierEligibility.eligibility !== 'eligible') {
    throw new BackendApiError(
      'FORBIDDEN',
      `Supplier organization eligibility is ${supplierEligibility.eligibility}; escrow action is blocked`,
    );
  }
}

export function createDemoEscrowRequest(session: AuthenticatedFrontendSession): CreateEscrowRequest {
  return {
    ...demoAcceptedOrder,
    buyerOrganizationId: session.actor.actorOrganizationId ?? 'demo-buyer-org',
  };
}

function termsHashForOrder(order: ProcurementOrderResponse): string {
  const seed = `${order.orderId}-${order.amount}-${order.currency}`;
  const hex = Array.from(seed)
    .map(character => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64);

  return `sha256:${hex}`;
}

export function createEscrowRequestFromOrder(
  order: ProcurementOrderResponse,
  session: AuthenticatedFrontendSession,
): CreateEscrowRequest {
  return {
    orderId: order.orderId,
    buyerOrganizationId: order.buyerOrganizationId || session.actor.actorOrganizationId || 'demo-buyer-org',
    supplierOrganizationId: order.supplierOrganizationId,
    financierOrganizationId: demoAcceptedOrder.financierOrganizationId,
    termsHash: termsHashForOrder(order),
    acceptedOrderReference: order.orderId,
  };
}

export function getLocalDemoEscrowRecord(session?: AuthenticatedFrontendSession): EscrowRecord {
  return createLocalDemoEscrow({
    ...demoAcceptedOrder,
    buyerOrganizationId: session?.actor.actorOrganizationId ?? 'demo-buyer-org',
  }, session);
}

function backendHeaders(session?: AuthenticatedFrontendSession): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (session?.source === 'backend') {
    headers.Authorization = `Bearer ${session.sessionToken}`;
  }

  return headers;
}

function withBackendSource(record: EscrowRecord): EscrowRecord {
  return {
    ...record,
    source: 'backend',
  };
}

export async function createEscrow(
  request: CreateEscrowRequest,
  session?: AuthenticatedFrontendSession,
): Promise<EscrowRecord> {
  if (session?.source !== 'backend') {
    assertLocalEscrowCanBeCreated(request);
    return createLocalDemoEscrow(request, session);
  }

  try {
    return withBackendSource(await requestJson<EscrowRecord>('/api/v1/escrows', {
      method: 'POST',
      headers: backendHeaders(session),
      body: JSON.stringify(request),
    }));
  } catch (error) {
    if (error instanceof TypeError) {
      assertLocalEscrowCanBeCreated(request);
      return createLocalDemoEscrow(request, session);
    }

    throw error;
  }
}

export async function getEscrow(
  escrowId: string,
  session?: AuthenticatedFrontendSession,
): Promise<EscrowRecord> {
  if (session?.source !== 'backend') {
    return getLocalDemoEscrowRecord(session);
  }

  try {
    return withBackendSource(await requestJson<EscrowRecord>(
      `/api/v1/escrows/${encodeURIComponent(escrowId)}`,
      {
        headers: backendHeaders(session),
      },
    ));
  } catch (error) {
    if (error instanceof BackendApiError || error instanceof TypeError) {
      return getLocalDemoEscrowRecord(session);
    }

    throw error;
  }
}

export function escrowToProofRecord(escrow: EscrowRecord): BlockchainProofRecord {
  return {
    eventId: escrow.lifecycleEventId ?? `${escrow.escrowId}-event`,
    anchorStatus: escrow.blockchainAnchor?.anchorStatus ?? 'notAnchored',
    payloadHash: escrow.lifecycleEventHash ?? escrow.blockchainAnchor?.payloadHash,
    blockchainNetwork: escrow.blockchainAnchor?.blockchainNetwork,
    channelName: escrow.blockchainAnchor?.channelName,
    chaincodeName: escrow.blockchainAnchor?.chaincodeName,
    transactionId: escrow.blockchainAnchor?.transactionId,
    blockNumber: escrow.blockchainAnchor?.blockNumber,
    anchoredAt: escrow.blockchainAnchor?.anchoredAt,
    failureReason: escrow.blockchainAnchor?.failureReason,
  };
}
