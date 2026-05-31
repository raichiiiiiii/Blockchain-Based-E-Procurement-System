import type { ProcurementOrderResponse } from './procurement-order';

export type SourceToAwardCase = {
  caseId: string;
  buyerOrganizationId: string;
  status:
    | 'requisitionPendingApproval'
    | 'requisitionApproved'
    | 'rfqIssued'
    | 'quotationReceived'
    | 'awarded'
    | 'purchaseOrderGenerated';
  requisition: {
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
  rfq?: {
    rfqId: string;
    requisitionId: string;
    supplierOrganizationIds: string[];
    issuedByUserId: string;
    issuedAt: string;
    responseDeadline?: string;
  };
  quotations: Array<{
    quotationId: string;
    rfqId: string;
    supplierOrganizationId: string;
    submittedByUserId: string;
    amount: string;
    currency: string;
    deliveryDays?: number;
    notes?: string;
    submittedAt: string;
  }>;
  award?: {
    awardId: string;
    rfqId: string;
    quotationId: string;
    supplierOrganizationId: string;
    selectedByUserId: string;
    selectedAt: string;
    rationale?: string;
    generatedOrderId?: string;
  };
  generatedOrderId?: string;
  lifecycleEventIds: string[];
  latestLifecyclePayloadHash?: string;
  createdAt: string;
  updatedAt: string;
};

export type SourceToAwardResponse = {
  case: SourceToAwardCase;
  order?: ProcurementOrderResponse;
};
