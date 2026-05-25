import { createSessionHeaders } from './auth-headers';
import { getLocalOrganizationEligibility } from './compliance-cases';
import { BackendApiError } from './errors';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  AcknowledgeProcurementOrderRequest,
  CreateProcurementOrderRequest,
  ProcurementOrderResponse,
} from '../types/procurement-order';

const STORAGE_KEY = 'eprocurement.procurement.orders.v1';

const seedOrders: ProcurementOrderResponse[] = [
  {
    orderId: 'po-local-1001',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    title: 'Cold-chain packaging replenishment',
    description: 'Operational packaging order awaiting supplier acknowledgement.',
    amount: '24500.00',
    currency: 'MYR',
    status: 'created',
    createdBy: 'demo-buyer-user',
    createdAt: '2026-05-22T09:20:00.000Z',
    updatedAt: '2026-05-22T09:20:00.000Z',
    lifecycleEventIds: ['po-local-1001-created'],
    latestLifecyclePayloadHash: 'sha256:7d4c6fbf3bd9f9cbad8f90c1116d79e6b7608af73a0bb0eb951b96f468a45628',
  },
  {
    orderId: 'po-local-1002',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    title: 'Halal packaging lot',
    description: 'Accepted order available for escrow creation and proof review.',
    amount: '68000.00',
    currency: 'MYR',
    status: 'accepted',
    createdBy: 'demo-buyer-user',
    createdAt: '2026-05-21T08:10:00.000Z',
    updatedAt: '2026-05-22T13:45:00.000Z',
    acceptedBy: 'demo-supplier-user',
    acceptedAt: '2026-05-22T13:45:00.000Z',
    lifecycleEventIds: ['po-local-1002-created', 'po-local-1002-accepted'],
    latestLifecyclePayloadHash: 'sha256:882fcf0f7bb8af392c394f4e5f4b49b555f59264d68a77fd93ac441d7a981e5a',
  },
];

function isLocalSession(session?: AuthenticatedFrontendSession): boolean {
  return session?.source !== 'backend';
}

function actorRoles(session?: AuthenticatedFrontendSession): string[] {
  return session?.actor.actorRoleCodes ?? [];
}

function actorOrganizationId(session?: AuthenticatedFrontendSession): string | undefined {
  return session?.actor.actorOrganizationId;
}

function readLocalOrders(): ProcurementOrderResponse[] {
  if (typeof window === 'undefined') {
    return seedOrders.map(order => ({ ...order }));
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedOrders));
    return seedOrders.map(order => ({ ...order }));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as ProcurementOrderResponse[];
    }
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seedOrders));
  }

  return seedOrders.map(order => ({ ...order }));
}

function writeLocalOrders(orders: ProcurementOrderResponse[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
}

function sortedOrders(orders: ProcurementOrderResponse[]): ProcurementOrderResponse[] {
  return [...orders].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function filterLocalOrdersForSession(
  orders: ProcurementOrderResponse[],
  session?: AuthenticatedFrontendSession,
): ProcurementOrderResponse[] {
  const roles = actorRoles(session);
  const organizationId = actorOrganizationId(session);

  if (roles.includes('administrator') || roles.includes('auditor')) {
    return sortedOrders(orders);
  }

  if (roles.includes('buyer') && organizationId) {
    return sortedOrders(orders.filter(order => order.buyerOrganizationId === organizationId));
  }

  if (roles.includes('supplier') && organizationId) {
    return sortedOrders(orders.filter(order => order.supplierOrganizationId === organizationId));
  }

  return [];
}

function nextLocalOrderId(): string {
  const token = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
  return `po-local-${token}`;
}

function localLifecycleHash(orderId: string): string {
  const seed = `${orderId}-${Date.now()}`;
  const hex = Array.from(seed)
    .map(character => character.charCodeAt(0).toString(16).padStart(2, '0'))
    .join('')
    .padEnd(64, '0')
    .slice(0, 64);

  return `sha256:${hex}`;
}

async function listLocalProcurementOrders(
  session?: AuthenticatedFrontendSession,
): Promise<ProcurementOrderResponse[]> {
  return filterLocalOrdersForSession(readLocalOrders(), session);
}

async function createLocalProcurementOrder(
  payload: CreateProcurementOrderRequest,
  session?: AuthenticatedFrontendSession,
): Promise<ProcurementOrderResponse> {
  if (!actorRoles(session).includes('buyer') || !actorOrganizationId(session)) {
    throw new BackendApiError('FORBIDDEN', 'User must have buyer role to create orders');
  }

  const eligibility = getLocalOrganizationEligibility(actorOrganizationId(session) as string);
  if (eligibility.eligibility !== 'eligible') {
    throw new BackendApiError(
      'FORBIDDEN',
      `Organization eligibility is ${eligibility.eligibility}; procurement action is blocked`,
    );
  }

  const now = new Date().toISOString();
  const orderId = nextLocalOrderId();
  const created: ProcurementOrderResponse = {
    orderId,
    buyerOrganizationId: actorOrganizationId(session) as string,
    supplierOrganizationId: payload.supplierOrganizationId,
    title: payload.title,
    description: payload.description,
    amount: payload.amount,
    currency: payload.currency,
    status: 'created',
    createdBy: session?.actor.actorUserId ?? 'local-buyer-user',
    createdAt: now,
    updatedAt: now,
    lifecycleEventIds: [`${orderId}-created`],
    latestLifecyclePayloadHash: localLifecycleHash(orderId),
  };

  const orders = readLocalOrders();
  writeLocalOrders([created, ...orders]);
  return created;
}

async function acknowledgeLocalProcurementOrder(
  orderId: string,
  payload: AcknowledgeProcurementOrderRequest,
  session?: AuthenticatedFrontendSession,
): Promise<ProcurementOrderResponse> {
  if (!actorRoles(session).includes('supplier') || !actorOrganizationId(session)) {
    throw new BackendApiError('FORBIDDEN', 'User must have supplier role to acknowledge orders');
  }

  const orders = readLocalOrders();
  const orderIndex = orders.findIndex(order => order.orderId === orderId);
  if (orderIndex < 0) {
    throw new BackendApiError('NOT_FOUND', 'Order was not found');
  }

  const order = orders[orderIndex];
  if (order.supplierOrganizationId !== actorOrganizationId(session)) {
    throw new BackendApiError('FORBIDDEN', 'Supplier organization cannot acknowledge this order');
  }

  if (order.status !== 'created') {
    throw new BackendApiError('CONFLICT', 'Order has already been acknowledged');
  }

  const now = new Date().toISOString();
  const acknowledged: ProcurementOrderResponse = {
    ...order,
    status: payload.decision === 'accept' ? 'accepted' : 'rejected',
    updatedAt: now,
    acceptedBy: payload.decision === 'accept' ? session?.actor.actorUserId : undefined,
    acceptedAt: payload.decision === 'accept' ? now : undefined,
    lifecycleEventIds: [
      ...order.lifecycleEventIds,
      `${orderId}-${payload.decision === 'accept' ? 'accepted' : 'rejected'}`,
    ],
    latestLifecyclePayloadHash: localLifecycleHash(orderId),
  };

  orders[orderIndex] = acknowledged;
  writeLocalOrders(orders);
  return acknowledged;
}

export async function listProcurementOrders(
  session?: AuthenticatedFrontendSession
): Promise<ProcurementOrderResponse[]> {
  if (isLocalSession(session)) {
    return listLocalProcurementOrders(session);
  }

  const response = await requestJson<{ items: ProcurementOrderResponse[] }>('/api/v1/orders', {
    headers: createSessionHeaders(session)
  });

  return response.items;
}

export async function createProcurementOrder(
  payload: CreateProcurementOrderRequest,
  session?: AuthenticatedFrontendSession
): Promise<ProcurementOrderResponse> {
  if (isLocalSession(session)) {
    return createLocalProcurementOrder(payload, session);
  }

  return requestJson<ProcurementOrderResponse>('/api/v1/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}

export async function acknowledgeProcurementOrder(
  orderId: string,
  payload: AcknowledgeProcurementOrderRequest,
  session?: AuthenticatedFrontendSession
): Promise<ProcurementOrderResponse> {
  if (isLocalSession(session)) {
    return acknowledgeLocalProcurementOrder(orderId, payload, session);
  }

  return requestJson<ProcurementOrderResponse>(`/api/v1/orders/${orderId}/acknowledgement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session)
    },
    body: JSON.stringify(payload)
  });
}
