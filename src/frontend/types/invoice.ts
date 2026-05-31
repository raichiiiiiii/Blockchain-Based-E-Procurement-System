export type ProcurementInvoice = {
  invoiceId: string;
  orderId: string;
  deliveryEvidenceId?: string;
  supplierOrganizationId: string;
  buyerOrganizationId: string;
  submittedByUserId: string;
  amount: string;
  tax?: string;
  currency: string;
  invoiceReference?: string;
  invoiceHash: string;
  status: 'submitted' | 'matchPassed' | 'matchFailed' | 'paymentApproved' | 'rejected';
  matchResult: {
    status: 'notChecked' | 'passed' | 'failed';
    checkedAt?: string;
    checkedByUserId?: string;
    issues: string[];
    orderAmount?: string;
    invoiceAmount?: string;
    deliveryEvidenceId?: string;
  };
  submittedAt: string;
  updatedAt: string;
  paymentApprovedByUserId?: string;
  paymentApprovedAt?: string;
  lifecycleEventIds: string[];
  latestLifecyclePayloadHash?: string;
};

export type SubmitInvoiceRequest = {
  orderId: string;
  deliveryEvidenceId?: string;
  amount: string;
  tax?: string;
  currency: string;
  invoiceReference?: string;
  invoiceHash?: string;
};
