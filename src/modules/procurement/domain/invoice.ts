export type InvoiceStatus =
  | 'submitted'
  | 'matchPassed'
  | 'matchFailed'
  | 'paymentApproved'
  | 'rejected';

export type InvoiceMatchResult = {
  status: 'notChecked' | 'passed' | 'failed';
  checkedAt?: string;
  checkedByUserId?: string;
  issues: string[];
  orderAmount?: string;
  invoiceAmount?: string;
  deliveryEvidenceId?: string;
};

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
  status: InvoiceStatus;
  matchResult: InvoiceMatchResult;
  submittedAt: string;
  updatedAt: string;
  paymentApprovedByUserId?: string;
  paymentApprovedAt?: string;
  lifecycleEventIds: string[];
  latestLifecyclePayloadHash?: string;
};
