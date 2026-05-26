import { createSessionHeaders } from './auth-headers';
import { getLocalOrganizationEligibility } from './compliance-cases';
import { BackendApiError } from './errors';
import { requestJson } from './http-client';
import { createLocalDemoFallbackDisabledError, isLocalDemoFallbackEnabled } from '../lib/runtime-config';
import type { AuthenticatedFrontendSession } from '../lib/session-state';

export type PlsContractStatus =
  | 'draft'
  | 'pendingShariahReview'
  | 'approvedForActivation'
  | 'active'
  | 'activationBlocked';

export type ShariahApprovalStatus = 'missing' | 'approved' | 'conditionalApproved' | 'rejected';
export type PlsDistributionEventType = 'profit' | 'loss';

export type PlsContract = {
  contractId: string;
  procurementReference: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId: string;
  capitalAmount: string;
  currency: string;
  profitShare: {
    financierPercent: number;
    ventureOperatorPercent: number;
  };
  lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct';
  status: PlsContractStatus;
  shariahApproval?: {
    reviewId: string;
    status: ShariahApprovalStatus;
    decidedAt?: string;
  };
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type PlsDistributionRecord = {
  distributionId: string;
  contractId: string;
  eventType: PlsDistributionEventType;
  grossResultAmount: string;
  currency: string;
  calculationBasis: string;
  allocations: {
    partyRole: 'financier' | 'ventureOperator';
    organizationId: string;
    amount: string;
    basis: string;
  }[];
  createdBy: string;
  createdAt: string;
};

export type ShariahDecisionOutcome = 'approved' | 'conditionalApproved' | 'rejected';

const CONTRACT_STORAGE_KEY = 'eprocurement.pls.contracts.v1';
const DISTRIBUTION_STORAGE_KEY = 'eprocurement.pls.distributions.v1';

const seedContracts: PlsContract[] = [
  {
    contractId: 'pls-local-halal-packaging',
    procurementReference: 'po-local-1002',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    capitalAmount: '68000.00',
    currency: 'MYR',
    profitShare: {
      financierPercent: 60,
      ventureOperatorPercent: 40,
    },
    lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
    status: 'approvedForActivation',
    shariahApproval: {
      reviewId: 'shariah-local-approved-1002',
      status: 'approved',
      decidedAt: '2026-05-24T08:20:00.000Z',
    },
    createdAt: '2026-05-23T10:00:00.000Z',
    updatedAt: '2026-05-24T08:20:00.000Z',
  },
  {
    contractId: 'pls-local-cold-chain',
    procurementReference: 'po-local-1001',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    capitalAmount: '24500.00',
    currency: 'MYR',
    profitShare: {
      financierPercent: 55,
      ventureOperatorPercent: 45,
    },
    lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
    status: 'pendingShariahReview',
    createdAt: '2026-05-23T11:15:00.000Z',
    updatedAt: '2026-05-23T11:15:00.000Z',
  },
  {
    contractId: 'pls-local-conditional',
    procurementReference: 'po-local-1003',
    buyerOrganizationId: 'demo-buyer-org',
    supplierOrganizationId: 'demo-supplier-org',
    financierOrganizationId: 'demo-financier-org',
    capitalAmount: '42000.00',
    currency: 'MYR',
    profitShare: {
      financierPercent: 58,
      ventureOperatorPercent: 42,
    },
    lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct',
    status: 'activationBlocked',
    shariahApproval: {
      reviewId: 'shariah-local-conditional-1003',
      status: 'conditionalApproved',
      decidedAt: '2026-05-24T09:35:00.000Z',
    },
    createdAt: '2026-05-23T12:00:00.000Z',
    updatedAt: '2026-05-24T09:35:00.000Z',
  },
];

const seedDistributions: PlsDistributionRecord[] = [
  {
    distributionId: 'pls-distribution-profit-preview',
    contractId: 'pls-local-halal-packaging',
    eventType: 'profit',
    grossResultAmount: '10000.00',
    currency: 'MYR',
    calculationBasis: 'Accepted order margin scenario after allowed operating costs.',
    allocations: [
      {
        partyRole: 'financier',
        organizationId: 'demo-financier-org',
        amount: '6000.00',
        basis: '60% agreed profit share',
      },
      {
        partyRole: 'ventureOperator',
        organizationId: 'demo-supplier-org',
        amount: '4000.00',
        basis: '40% agreed profit share',
      },
    ],
    createdBy: 'demo-financier-user',
    createdAt: '2026-05-24T10:00:00.000Z',
  },
  {
    distributionId: 'pls-distribution-loss-preview',
    contractId: 'pls-local-halal-packaging',
    eventType: 'loss',
    grossResultAmount: '-5000.00',
    currency: 'MYR',
    calculationBasis: 'Loss scenario; no guarantee of principal or profit is implied.',
    allocations: [
      {
        partyRole: 'financier',
        organizationId: 'demo-financier-org',
        amount: '-5000.00',
        basis: 'Capital provider bears financial loss unless misconduct is established',
      },
      {
        partyRole: 'ventureOperator',
        organizationId: 'demo-supplier-org',
        amount: '0.00',
        basis: 'Venture operator allocation remains zero in the loss scenario',
      },
    ],
    createdBy: 'demo-financier-user',
    createdAt: '2026-05-24T10:15:00.000Z',
  },
];

function roles(session?: AuthenticatedFrontendSession): string[] {
  return session?.actor.actorRoleCodes ?? [];
}

function isBackendSession(session?: AuthenticatedFrontendSession): boolean {
  return session?.source === 'backend';
}

function assertLocalFallbackEnabled(feature: string): void {
  if (!isLocalDemoFallbackEnabled()) {
    throw createLocalDemoFallbackDisabledError(feature);
  }
}

function readContracts(): PlsContract[] {
  if (typeof window === 'undefined') {
    return seedContracts.map(contract => ({ ...contract }));
  }

  const stored = window.localStorage.getItem(CONTRACT_STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(seedContracts));
    return seedContracts.map(contract => ({ ...contract }));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as PlsContract[];
    }
  } catch {
    window.localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(seedContracts));
  }

  return seedContracts.map(contract => ({ ...contract }));
}

function writeContracts(contracts: PlsContract[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(contracts));
}

function readDistributions(): PlsDistributionRecord[] {
  if (typeof window === 'undefined') {
    return seedDistributions.map(distribution => ({ ...distribution }));
  }

  const stored = window.localStorage.getItem(DISTRIBUTION_STORAGE_KEY);
  if (!stored) {
    window.localStorage.setItem(DISTRIBUTION_STORAGE_KEY, JSON.stringify(seedDistributions));
    return seedDistributions.map(distribution => ({ ...distribution }));
  }

  try {
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) {
      return parsed as PlsDistributionRecord[];
    }
  } catch {
    window.localStorage.setItem(DISTRIBUTION_STORAGE_KEY, JSON.stringify(seedDistributions));
  }

  return seedDistributions.map(distribution => ({ ...distribution }));
}

function writeDistributions(distributions: PlsDistributionRecord[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(DISTRIBUTION_STORAGE_KEY, JSON.stringify(distributions));
}

function canReadFinancing(session?: AuthenticatedFrontendSession): boolean {
  return roles(session).some(role => ['financier', 'shariahReviewer', 'auditor'].includes(role));
}

function requireLocalRole(session: AuthenticatedFrontendSession | undefined, role: string, action: string) {
  if (!roles(session).includes(role)) {
    throw new BackendApiError('FORBIDDEN', `User must have ${action} access`);
  }
}

function assertContractPartiesEligible(contract: PlsContract) {
  const parties = [
    { label: 'buyer', organizationId: contract.buyerOrganizationId },
    { label: 'supplier', organizationId: contract.supplierOrganizationId },
    { label: 'financier', organizationId: contract.financierOrganizationId },
  ];

  for (const party of parties) {
    const eligibility = getLocalOrganizationEligibility(party.organizationId);
    if (eligibility.eligibility !== 'eligible') {
      throw new BackendApiError(
        'FORBIDDEN',
        `${party.label} organization eligibility is ${eligibility.eligibility}; PLS activation is blocked`,
      );
    }
  }
}

function sortContracts(contracts: PlsContract[]): PlsContract[] {
  return [...contracts].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
}

function statusFromDecision(outcome: ShariahDecisionOutcome): PlsContractStatus {
  return outcome === 'approved' ? 'approvedForActivation' : 'activationBlocked';
}

function parseMoney(value: string): number {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) {
    throw new BackendApiError('VALIDATION_ERROR', 'Amount must be a decimal value');
  }

  return parsed;
}

function formatMoney(value: number): string {
  return value.toFixed(2);
}

function nextDistributionId(): string {
  const token = globalThis.crypto?.randomUUID?.().slice(0, 8) ?? String(Date.now());
  return `pls-distribution-${token}`;
}

export async function listPlsContracts(session?: AuthenticatedFrontendSession): Promise<PlsContract[]> {
  if (!isBackendSession(session)) {
    assertLocalFallbackEnabled('Financing contracts');
    if (!canReadFinancing(session)) {
      throw new BackendApiError('FORBIDDEN', 'User is not allowed to view PLS contracts');
    }

    return sortContracts(readContracts());
  }

  const response = await requestJson<{ items: PlsContract[] }>('/api/v1/financing/pls-contracts', {
    headers: createSessionHeaders(session),
  });

  return response.items;
}

export async function listPlsDistributions(
  contractId: string,
  session?: AuthenticatedFrontendSession,
): Promise<PlsDistributionRecord[]> {
  if (!isBackendSession(session)) {
    assertLocalFallbackEnabled('Financing distributions');
    if (!canReadFinancing(session)) {
      throw new BackendApiError('FORBIDDEN', 'User is not allowed to view PLS distributions');
    }

    return readDistributions()
      .filter(distribution => distribution.contractId === contractId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }

  const response = await requestJson<{ items: PlsDistributionRecord[] }>(
    `/api/v1/financing/pls-contracts/${encodeURIComponent(contractId)}/distributions`,
    {
      headers: createSessionHeaders(session),
    },
  );

  return response.items;
}

export async function recordShariahDecisionForContract(
  contractId: string,
  outcome: ShariahDecisionOutcome,
  session?: AuthenticatedFrontendSession,
): Promise<PlsContract> {
  if (isBackendSession(session)) {
    throw new BackendApiError('VALIDATION_ERROR', 'Use the Shariah review decision endpoint for backend sessions');
  }

  assertLocalFallbackEnabled('Shariah review decision');
  requireLocalRole(session, 'shariahReviewer', 'Shariah review');

  const contracts = readContracts();
  const contractIndex = contracts.findIndex(contract => contract.contractId === contractId);
  if (contractIndex < 0) {
    throw new BackendApiError('NOT_FOUND', 'PLS contract was not found');
  }

  const now = new Date().toISOString();
  const updated: PlsContract = {
    ...contracts[contractIndex],
    status: statusFromDecision(outcome),
    shariahApproval: {
      reviewId: `shariah-${contractId}`,
      status: outcome,
      decidedAt: now,
    },
    updatedAt: now,
  };

  contracts[contractIndex] = updated;
  writeContracts(contracts);
  return updated;
}

export async function activatePlsContract(
  contractId: string,
  session?: AuthenticatedFrontendSession,
  shariahReviewId?: string,
): Promise<PlsContract> {
  if (!isBackendSession(session)) {
    assertLocalFallbackEnabled('PLS activation');
    requireLocalRole(session, 'financier', 'financing');

    const contracts = readContracts();
    const contractIndex = contracts.findIndex(contract => contract.contractId === contractId);
    if (contractIndex < 0) {
      throw new BackendApiError('NOT_FOUND', 'PLS contract was not found');
    }

    const contract = contracts[contractIndex];
    assertContractPartiesEligible(contract);

    if (contract.shariahApproval?.status !== 'approved') {
      throw new BackendApiError('CONFLICT', 'PLS activation is blocked until Shariah review is approved');
    }

    const now = new Date().toISOString();
    const updated: PlsContract = {
      ...contract,
      status: 'active',
      activatedAt: now,
      updatedAt: now,
    };

    contracts[contractIndex] = updated;
    writeContracts(contracts);
    return updated;
  }

  return requestJson<PlsContract>(`/api/v1/financing/pls-contracts/${encodeURIComponent(contractId)}/activate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify({
      shariahReviewId,
    }),
  });
}

export async function recordPlsDistributionScenario(
  contractId: string,
  eventType: PlsDistributionEventType,
  grossResultAmount: string,
  calculationBasis: string,
  session?: AuthenticatedFrontendSession,
): Promise<PlsDistributionRecord> {
  if (!isBackendSession(session)) {
    assertLocalFallbackEnabled('PLS distribution scenario');
    requireLocalRole(session, 'financier', 'financing');

    const contract = readContracts().find(candidate => candidate.contractId === contractId);
    if (!contract) {
      throw new BackendApiError('NOT_FOUND', 'PLS contract was not found');
    }

    if (contract.status !== 'active') {
      throw new BackendApiError('CONFLICT', 'PLS contract must be active before distribution can be recorded');
    }

    const amount = parseMoney(grossResultAmount);
    const gross = eventType === 'loss' && amount > 0 ? -amount : amount;
    const financierAmount = eventType === 'profit'
      ? Math.abs(gross) * (contract.profitShare.financierPercent / 100)
      : gross;
    const operatorAmount = eventType === 'profit'
      ? Math.abs(gross) - financierAmount
      : 0;
    const now = new Date().toISOString();
    const distribution: PlsDistributionRecord = {
      distributionId: nextDistributionId(),
      contractId,
      eventType,
      grossResultAmount: formatMoney(gross),
      currency: contract.currency,
      calculationBasis,
      allocations: [
        {
          partyRole: 'financier',
          organizationId: contract.financierOrganizationId,
          amount: formatMoney(financierAmount),
          basis: eventType === 'profit'
            ? `${contract.profitShare.financierPercent}% agreed profit share`
            : 'Capital provider bears financial loss unless misconduct is established',
        },
        {
          partyRole: 'ventureOperator',
          organizationId: contract.supplierOrganizationId,
          amount: formatMoney(operatorAmount),
          basis: eventType === 'profit'
            ? `${contract.profitShare.ventureOperatorPercent}% agreed profit share`
            : 'Venture operator allocation remains zero in the loss scenario',
        },
      ],
      createdBy: session?.actor.actorUserId ?? 'demo-financier-user',
      createdAt: now,
    };

    writeDistributions([distribution, ...readDistributions()]);
    return distribution;
  }

  return requestJson<PlsDistributionRecord>(
    `/api/v1/financing/pls-contracts/${encodeURIComponent(contractId)}/distributions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...createSessionHeaders(session),
      },
      body: JSON.stringify({
        eventType,
        grossResultAmount,
        calculationBasis,
      }),
    },
  );
}
