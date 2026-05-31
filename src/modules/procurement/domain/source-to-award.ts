export type SourceToAwardStatus =
  | 'requisitionPendingApproval'
  | 'requisitionApproved'
  | 'rfqIssued'
  | 'quotationReceived'
  | 'awarded'
  | 'purchaseOrderGenerated';

export type SourceToAwardRequisition = {
  requisitionId: string;
  title: string;
  description?: string;
  estimatedAmount: string;
  currency: string;
  requestedByUserId: string;
  createdAt: string;
  approvedByUserId?: string;
  approvedAt?: string;
};

export type SourceToAwardRfq = {
  rfqId: string;
  requisitionId: string;
  supplierOrganizationIds: string[];
  issuedByUserId: string;
  issuedAt: string;
  responseDeadline?: string;
};

export type SourceToAwardQuotation = {
  quotationId: string;
  rfqId: string;
  supplierOrganizationId: string;
  submittedByUserId: string;
  amount: string;
  currency: string;
  deliveryDays?: number;
  notes?: string;
  submittedAt: string;
};

export type SourceToAwardAward = {
  awardId: string;
  rfqId: string;
  quotationId: string;
  supplierOrganizationId: string;
  selectedByUserId: string;
  selectedAt: string;
  rationale?: string;
  generatedOrderId?: string;
};

export type SourceToAwardCase = {
  caseId: string;
  buyerOrganizationId: string;
  status: SourceToAwardStatus;
  requisition: SourceToAwardRequisition;
  rfq?: SourceToAwardRfq;
  quotations: SourceToAwardQuotation[];
  award?: SourceToAwardAward;
  generatedOrderId?: string;
  lifecycleEventIds: string[];
  latestLifecyclePayloadHash?: string;
  createdAt: string;
  updatedAt: string;
};
