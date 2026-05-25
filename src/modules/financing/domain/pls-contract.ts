export type PlsContractStatus =
  | 'draft'
  | 'pendingShariahReview'
  | 'approvedForActivation'
  | 'active'
  | 'activationBlocked';

export type ShariahApprovalStatus =
  | 'missing'
  | 'approved'
  | 'conditionalApproved'
  | 'rejected';

export type PlsDistributionEventType = 'profit' | 'loss';

export type PlsDistributionPartyRole = 'financier' | 'ventureOperator';

export interface PlsProfitShare {
  financierPercent: number;
  ventureOperatorPercent: number;
}

export interface ShariahApprovalReference {
  reviewId: string;
  status: ShariahApprovalStatus;
  decidedAt?: string;
}

export interface PlsContract {
  contractId: string;
  procurementReference: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId: string;
  capitalAmount: string;
  currency: string;
  profitShare: PlsProfitShare;
  lossAllocation: 'capitalProviderBearsFinancialLossExceptMisconduct';
  status: PlsContractStatus;
  shariahApproval?: ShariahApprovalReference;
  activatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlsDistributionAllocation {
  partyRole: PlsDistributionPartyRole;
  organizationId: string;
  amount: string;
  basis: string;
}

export interface PlsDistributionRecord {
  distributionId: string;
  contractId: string;
  eventType: PlsDistributionEventType;
  grossResultAmount: string;
  currency: string;
  calculationBasis: string;
  allocations: PlsDistributionAllocation[];
  createdBy: string;
  createdAt: string;
}
