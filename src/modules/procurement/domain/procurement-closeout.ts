export type ProcurementCloseoutStatus = 'open' | 'closed';

export type SupplierPerformanceSummary = {
  supplierOrganizationId: string;
  orderCount: number;
  deliveryEvidenceCount: number;
  invoiceCount: number;
  invoiceExceptionCount: number;
  proofCoveragePercent: number;
  closeoutCount: number;
  score: number;
  lastUpdatedAt?: string;
};

export type ProcurementCaseCloseout = {
  closeoutId: string;
  caseId: string;
  orderId: string;
  buyerOrganizationId: string;
  supplierOrganizationId: string;
  closedByUserId: string;
  closedAt: string;
  status: ProcurementCloseoutStatus;
  notes?: string;
  metrics: SupplierPerformanceSummary;
};

export type ProcurementCaseSummary = {
  caseId: string;
  orderId?: string;
  sourceToAwardCaseId?: string;
  buyerOrganizationId?: string;
  supplierOrganizationId?: string;
  deliveryEvidenceCount: number;
  invoiceCount: number;
  invoiceExceptionCount: number;
  proofCoveragePercent: number;
  closeout?: ProcurementCaseCloseout;
};
