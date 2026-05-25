import type { ShariahReviewRepository } from '../../shariah-review/application/shariah-review-repository.js';
import { canPerformProcurementAction, type ProcurementEligibilityGateway, type ProcurementEligibilityResult } from '../../procurement/application/procurement-eligibility-gateway.js';
import type { PlsContract, PlsDistributionEventType, PlsDistributionRecord, ShariahApprovalStatus } from '../domain/pls-contract.js';
import type { PlsContractRepository } from './pls-contract-repository.js';

export type ActivatePlsContractInput = {
  contractId?: string;
  shariahReviewId?: string;
};

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ActivatePlsContractResult =
  | { status: 'activated'; contract: PlsContract }
  | { status: 'invalidInput'; issues: ValidationIssue[] }
  | { status: 'notFound' }
  | { status: 'approvalMissing' }
  | { status: 'activationBlocked'; approvalStatus: ShariahApprovalStatus }
  | { status: 'notEligible'; party: 'buyer' | 'supplier' | 'financier'; eligibility: ProcurementEligibilityResult };

export type CreatePlsDistributionInput = {
  contractId?: string;
  eventType?: PlsDistributionEventType;
  grossResultAmount?: string;
  calculationBasis?: string;
  createdBy?: string;
};

export type CreatePlsDistributionResult =
  | { status: 'created'; distribution: PlsDistributionRecord }
  | { status: 'invalidInput'; issues: ValidationIssue[] }
  | { status: 'notFound' }
  | { status: 'inactiveContract' };

type ActivatePlsContractDependencies = {
  contractRepository: PlsContractRepository;
  shariahReviewRepository: ShariahReviewRepository;
  eligibilityGateway?: ProcurementEligibilityGateway;
  now?: () => string;
};

type CreatePlsDistributionDependencies = {
  contractRepository: PlsContractRepository;
  idGenerator?: () => string;
  now?: () => string;
};

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function trimmed(value: string | undefined): string {
  return value?.trim() ?? '';
}

function reviewStatusToApprovalStatus(status: string): ShariahApprovalStatus {
  if (status === 'approved' || status === 'conditionalApproved' || status === 'rejected') {
    return status;
  }

  return 'missing';
}

function validateContractId(contractId: string | undefined): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!trimmed(contractId)) {
    issues.push(issue('contractId', 'contractId is required'));
  }

  return issues;
}

function validateDistributionInput(input: CreatePlsDistributionInput): ValidationIssue[] {
  const issues = validateContractId(input.contractId);

  if (input.eventType !== 'profit' && input.eventType !== 'loss') {
    issues.push(issue('eventType', 'eventType must be profit or loss'));
  }

  if (!trimmed(input.grossResultAmount)) {
    issues.push(issue('grossResultAmount', 'grossResultAmount is required'));
  } else {
    try {
      parseMoneyToMinorUnits(trimmed(input.grossResultAmount));
    } catch {
      issues.push(issue('grossResultAmount', 'grossResultAmount must be a decimal money value'));
    }
  }

  if (!trimmed(input.calculationBasis)) {
    issues.push(issue('calculationBasis', 'calculationBasis is required'));
  }

  return issues;
}

function parseMoneyToMinorUnits(value: string): bigint {
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(value.trim());
  if (!match) {
    throw new Error('invalid money value');
  }

  const sign = match[1] === '-' ? -1n : 1n;
  const whole = BigInt(match[2]);
  const fraction = BigInt((match[3] ?? '').padEnd(2, '0'));

  return sign * ((whole * 100n) + fraction);
}

function formatMinorUnits(value: bigint): string {
  const sign = value < 0n ? '-' : '';
  const absolute = value < 0n ? -value : value;
  const whole = absolute / 100n;
  const fraction = absolute % 100n;

  return `${sign}${whole.toString()}.${fraction.toString().padStart(2, '0')}`;
}

function defaultDistributionId(): string {
  return `pls_distribution_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

export async function activatePlsContract(
  input: ActivatePlsContractInput,
  dependencies: ActivatePlsContractDependencies,
): Promise<ActivatePlsContractResult> {
  const issues = validateContractId(input.contractId);
  if (!trimmed(input.shariahReviewId)) {
    issues.push(issue('shariahReviewId', 'approved Shariah review reference is required'));
  }

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const contract = await dependencies.contractRepository.findContractById(trimmed(input.contractId));
  if (!contract) {
    return { status: 'notFound' };
  }

  if (dependencies.eligibilityGateway) {
    const eligibilityChecks = [
      { party: 'buyer' as const, organizationId: contract.buyerOrganizationId },
      { party: 'supplier' as const, organizationId: contract.supplierOrganizationId },
      { party: 'financier' as const, organizationId: contract.financierOrganizationId },
    ];

    for (const check of eligibilityChecks) {
      const eligibility = await dependencies.eligibilityGateway.checkOrganizationEligibility(check.organizationId);
      if (!canPerformProcurementAction(eligibility)) {
        return {
          status: 'notEligible',
          party: check.party,
          eligibility,
        };
      }
    }
  }

  const review = await dependencies.shariahReviewRepository.findById(trimmed(input.shariahReviewId));
  if (!review) {
    return { status: 'approvalMissing' };
  }

  if (review.status !== 'approved') {
    return {
      status: 'activationBlocked',
      approvalStatus: reviewStatusToApprovalStatus(review.status),
    };
  }

  const now = dependencies.now?.() ?? new Date().toISOString();
  const activated: PlsContract = {
    ...contract,
    status: 'active',
    shariahApproval: {
      reviewId: review.id,
      status: 'approved',
      decidedAt: review.decidedAt,
    },
    activatedAt: now,
    updatedAt: now,
  };

  return {
    status: 'activated',
    contract: await dependencies.contractRepository.saveContract(activated),
  };
}

export async function createPlsDistribution(
  input: CreatePlsDistributionInput,
  dependencies: CreatePlsDistributionDependencies,
): Promise<CreatePlsDistributionResult> {
  const issues = validateDistributionInput(input);
  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const contract = await dependencies.contractRepository.findContractById(trimmed(input.contractId));
  if (!contract) {
    return { status: 'notFound' };
  }

  if (contract.status !== 'active') {
    return { status: 'inactiveContract' };
  }

  const grossResultMinorUnits = parseMoneyToMinorUnits(trimmed(input.grossResultAmount));
  const eventType = input.eventType as PlsDistributionEventType;
  const now = dependencies.now?.() ?? new Date().toISOString();

  let financierAmount = 0n;
  let operatorAmount = 0n;

  if (eventType === 'profit') {
    const positiveGross = grossResultMinorUnits < 0n ? -grossResultMinorUnits : grossResultMinorUnits;
    financierAmount = (positiveGross * BigInt(contract.profitShare.financierPercent)) / 100n;
    operatorAmount = positiveGross - financierAmount;
  } else {
    const lossAmount = grossResultMinorUnits > 0n ? -grossResultMinorUnits : grossResultMinorUnits;
    financierAmount = lossAmount;
    operatorAmount = 0n;
  }

  const distribution: PlsDistributionRecord = {
    distributionId: dependencies.idGenerator?.() ?? defaultDistributionId(),
    contractId: contract.contractId,
    eventType,
    grossResultAmount: formatMinorUnits(eventType === 'loss' && grossResultMinorUnits > 0n ? -grossResultMinorUnits : grossResultMinorUnits),
    currency: contract.currency,
    calculationBasis: trimmed(input.calculationBasis),
    allocations: [
      {
        partyRole: 'financier',
        organizationId: contract.financierOrganizationId,
        amount: formatMinorUnits(financierAmount),
        basis: eventType === 'profit'
          ? `${contract.profitShare.financierPercent}% agreed profit share`
          : 'Capital provider bears financial loss unless misconduct is established',
      },
      {
        partyRole: 'ventureOperator',
        organizationId: contract.supplierOrganizationId,
        amount: formatMinorUnits(operatorAmount),
        basis: eventType === 'profit'
          ? `${contract.profitShare.ventureOperatorPercent}% agreed profit share`
          : 'Venture operator allocation remains zero in the MVP loss scenario',
      },
    ],
    createdBy: trimmed(input.createdBy) || 'system',
    createdAt: now,
  };

  return {
    status: 'created',
    distribution: await dependencies.contractRepository.saveDistribution(distribution),
  };
}
