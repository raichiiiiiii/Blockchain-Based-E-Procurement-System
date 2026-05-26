export type ContractStatus = 'draft' | 'negotiating' | 'accepted' | 'active';

export type ContractOfferStatus = 'submitted' | 'withdrawn' | 'superseded';

export type ContractAcceptanceParty = 'buyer' | 'supplier';

export type ContractLifecycleEventType =
  | 'companyRegistered'
  | 'kycApproved'
  | 'networkMembershipIssued'
  | 'privateNetworkEstablished'
  | 'contractCreated'
  | 'offerSubmitted'
  | 'contractAccepted';

export type ContractLineItem = {
  itemId: string;
  description: string;
  quantity: string;
  unitPrice: string;
  currency: string;
};

export type ContractClauseReference = {
  clauseId: string;
  title: string;
  summary: string;
};

export type MachineReadableTerms = {
  parties: {
    buyerOrganizationId: string;
    supplierOrganizationId: string;
    financierOrganizationId?: string;
    buyerName?: string;
    supplierName?: string;
    financierName?: string;
  };
  lineItems: ContractLineItem[];
  deliveryTerms: string;
  acceptanceCriteria: string[];
  escrowReleaseConditions: string[];
  paymentTerms: string;
  disputeAndArbitrationRules: string;
  plsTerms?: {
    shariahReviewId?: string;
    approvalReference?: string;
    profitSharingRatio?: string;
    lossAllocation?: string;
  };
  documentReferences: string[];
  clauseReferences: ContractClauseReference[];
  ocdsMapping?: {
    tenderId?: string;
    awardId?: string;
    contractId?: string;
    implementationMilestones?: string[];
  };
  ublMapping?: {
    orderReference?: string;
    despatchAdviceReference?: string;
    invoiceReference?: string;
  };
};

export type ContractLifecycleEvent = {
  eventId: string;
  eventType: ContractLifecycleEventType;
  actorUserId: string;
  actorOrganizationId?: string;
  occurredAt: string;
  termsHash?: string;
  metadata?: Record<string, string>;
};

export type ContractOffer = {
  offerId: string;
  contractId: string;
  proposedTerms: MachineReadableTerms;
  proposedTermsHash: string;
  actorUserId: string;
  actorOrganizationId?: string;
  comment?: string;
  status: ContractOfferStatus;
  createdAt: string;
};

export type ContractAcceptance = {
  acceptanceId: string;
  contractId: string;
  acceptedBy: ContractAcceptanceParty;
  actorUserId: string;
  actorOrganizationId?: string;
  acceptedAt: string;
  acceptedVersion: number;
  acceptedTermsHash: string;
};

export type ProcurementContract = {
  contractId: string;
  contractNumber: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  financierOrganizationId?: string;
  status: ContractStatus;
  version: number;
  humanReadableDocumentId?: string;
  machineReadableTerms: MachineReadableTerms;
  termsHash: string;
  signedAt?: string;
  effectiveAt?: string;
  expiresAt?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  offers: ContractOffer[];
  acceptances: ContractAcceptance[];
  lifecycleEvents: ContractLifecycleEvent[];
};
