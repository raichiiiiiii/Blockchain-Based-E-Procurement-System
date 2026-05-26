import { createSessionHeaders } from './auth-headers';
import { BackendApiError } from './errors';
import { requestJson } from './http-client';
import { createLocalDemoFallbackDisabledError, isLocalDemoFallbackEnabled } from '../lib/runtime-config';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import { listProcurementOrders } from './procurement-orders';
import type {
  DeliveryEvidenceRecord,
  SubmitDeliveryEvidenceRequest,
} from '../types/delivery-evidence';
import type { ProcurementOrderResponse } from '../types/procurement-order';

const STORAGE_KEY = 'eprocurement.procurement.deliveryEvidence.v1';

const seedDeliveryEvidence: DeliveryEvidenceRecord[] = [
  {
    evidenceId: 'delivery-local-1002-1',
    orderId: 'po-local-1002',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    submittedByUserId: 'demo-supplier-user',
    evidenceType: 'deliveryNote',
    evidenceReference: 'delivery-ref:barakah:dn-1002',
    evidenceHash: 'sha256:9679f4ed0ca3e8e6e6f52c291628a5f05913f24027df0ea51de57f7de425cf42',
    notes: 'Supplier dispatch desk recorded sealed carton count and dispatch timestamp.',
    submittedAt: '2026-05-23T09:10:00.000Z',
    verificationStatus: 'metadataRecorded',
    lifecycleEventId: 'delivery-local-1002-event',
    lifecycleEventHash: 'sha256:ed0f80ce6bdf7229a1f1c9b316c603bca6cbf5f564c4d314bd6e98fd5f12c3ad',
    blockchainAnchor: {
      eventId: 'delivery-local-1002-event',
      payloadHash: 'sha256:ed0f80ce6bdf7229a1f1c9b316c603bca6cbf5f564c4d314bd6e98fd5f12c3ad',
      anchorStatus: 'failed',
      failureReason: 'Local demo proof service is unavailable for this delivery event. The off-chain evidence remains recorded.',
    },
  },
];

function isLocalSession(session?: AuthenticatedFrontendSession): boolean {
  return session?.source !== 'backend';
}

function assertLocalFallbackEnabled(feature: string): void {
  if (!isLocalDemoFallbackEnabled()) {
    throw createLocalDemoFallbackDisabledError(feature);
  }
}

function actorRoles(session?: AuthenticatedFrontendSession): string[] {
  return session?.actor.actorRoleCodes ?? [];
}

function actorOrganizationId(session?: AuthenticatedFrontendSession): string | undefined {
  return session?.actor.actorOrganizationId;
}

function actorUserId(session?: AuthenticatedFrontendSession): string | undefined {
  return session?.actor.actorUserId;
}

function readLocalDeliveryEvidence(): DeliveryEvidenceRecord[] {
  if (typeof window === 'undefined') {
    return seedDeliveryEvidence.map(record => ({ ...record }));
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDeliveryEvidence));
    return seedDeliveryEvidence.map(record => ({ ...record }));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as DeliveryEvidenceRecord[];
    }
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedDeliveryEvidence));
  }

  return seedDeliveryEvidence.map(record => ({ ...record }));
}

function writeLocalDeliveryEvidence(records: DeliveryEvidenceRecord[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

function toLocalHash(seed: string): string {
  const hex = Array.from(seed)
    .map(character => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64);

  return `sha256:${hex}`;
}

function nextLocalEvidenceId(): string {
  const token = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
  return `delivery-local-${token}`;
}

async function findVisibleOrder(
  orderId: string,
  session?: AuthenticatedFrontendSession,
): Promise<ProcurementOrderResponse> {
  const orders = await listProcurementOrders(session);
  const order = orders.find(candidate => candidate.orderId === orderId);
  if (!order) {
    throw new BackendApiError('FORBIDDEN', 'User is not allowed to access delivery evidence for this order');
  }

  return order;
}

async function listLocalDeliveryEvidenceForOrder(
  orderId: string,
  session?: AuthenticatedFrontendSession,
): Promise<DeliveryEvidenceRecord[]> {
  await findVisibleOrder(orderId, session);

  return readLocalDeliveryEvidence()
    .filter(record => record.orderId === orderId)
    .sort((left, right) => left.submittedAt.localeCompare(right.submittedAt));
}

async function submitLocalDeliveryEvidence(
  orderId: string,
  payload: SubmitDeliveryEvidenceRequest,
  session?: AuthenticatedFrontendSession,
): Promise<DeliveryEvidenceRecord> {
  if (!actorRoles(session).includes('supplier') || !actorOrganizationId(session) || !actorUserId(session)) {
    throw new BackendApiError('FORBIDDEN', 'User must have supplier role to submit delivery evidence');
  }

  const supplierOrganizationId = actorOrganizationId(session) as string;
  const submittedByUserId = actorUserId(session) as string;
  const order = await findVisibleOrder(orderId, session);
  if (order.supplierOrganizationId !== supplierOrganizationId) {
    throw new BackendApiError('FORBIDDEN', 'Supplier organization cannot submit evidence for this order');
  }

  if (order.status !== 'accepted') {
    throw new BackendApiError('CONFLICT', 'Order must be accepted before delivery evidence can be submitted');
  }

  const evidenceReference = payload.evidenceReference?.trim();
  const notes = payload.notes?.trim();
  if (!evidenceReference && !notes) {
    throw new BackendApiError('VALIDATION_ERROR', 'Evidence reference or notes are required');
  }

  const now = new Date().toISOString();
  const evidenceId = nextLocalEvidenceId();
  const lifecycleEventId = `${evidenceId}-event`;
  const lifecycleEventHash = toLocalHash(`${lifecycleEventId}-${now}`);
  const evidenceHash = payload.evidenceHash?.trim() || toLocalHash(`${evidenceId}-${orderId}-${evidenceReference ?? ''}-${notes ?? ''}`);

  const created: DeliveryEvidenceRecord = {
    evidenceId,
    orderId,
    buyerOrganizationId: order.buyerOrganizationId,
    supplierOrganizationId: order.supplierOrganizationId,
    submittedByUserId,
    evidenceType: payload.evidenceType,
    evidenceReference,
    evidenceHash,
    notes,
    submittedAt: now,
    verificationStatus: 'metadataRecorded',
    lifecycleEventId,
    lifecycleEventHash,
    blockchainAnchor: {
      eventId: lifecycleEventId,
      payloadHash: lifecycleEventHash,
      anchorStatus: 'pending',
    },
  };

  const records = readLocalDeliveryEvidence();
  writeLocalDeliveryEvidence([...records, created]);
  return created;
}

export async function listDeliveryEvidenceForOrder(
  orderId: string,
  session?: AuthenticatedFrontendSession,
): Promise<DeliveryEvidenceRecord[]> {
  if (isLocalSession(session)) {
    assertLocalFallbackEnabled('Delivery evidence');
    return listLocalDeliveryEvidenceForOrder(orderId, session);
  }

  const response = await requestJson<{ items: DeliveryEvidenceRecord[] }>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/delivery-evidence`,
    {
      headers: createSessionHeaders(session),
    },
  );

  return response.items;
}

export async function submitDeliveryEvidenceForOrder(
  orderId: string,
  payload: SubmitDeliveryEvidenceRequest,
  session?: AuthenticatedFrontendSession,
): Promise<DeliveryEvidenceRecord> {
  if (isLocalSession(session)) {
    assertLocalFallbackEnabled('Delivery evidence submission');
    return submitLocalDeliveryEvidence(orderId, payload, session);
  }

  return requestJson<DeliveryEvidenceRecord>(
    `/api/v1/orders/${encodeURIComponent(orderId)}/delivery-evidence`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createSessionHeaders(session),
      },
      body: JSON.stringify(payload),
    },
  );
}
