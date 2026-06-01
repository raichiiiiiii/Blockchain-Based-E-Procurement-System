import type { CompanyProofStatus } from './organization-network';

export type MoneyTrackerSummary = {
  currency: string;
  committedPurchaseOrderValue: string;
  expectedDeliveryValue: string;
  escrowAmount: string;
  financingCapitalAmount: string;
  outgoingPaymentInstructionStatus: string;
  incomingReceivableStatus: string;
  budgetLimit: string;
  budgetConsumed: string;
  budgetRemaining: string;
  safeAmountLabel: string;
};

export type ProcurementPipelineItem = {
  stage: string;
  label: string;
  state: 'complete' | 'pending' | 'blocked' | 'notStarted';
  relatedDealId?: string;
  relatedRecordId?: string;
  updatedAt?: string;
};

export type ActionInboxItem = {
  taskId: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'completed';
  actionType: string;
  relatedRecordId?: string;
  dueLabel?: string;
};

export type SupplierScorecard = {
  supplierOrganizationId: string;
  supplierDisplayName: string;
  activeDealCount: number;
  deliveryEvidenceStatus: 'notSubmitted' | 'metadataRecorded' | 'mixed';
  proofReliabilityState: CompanyProofStatus;
  exceptionCount: number;
  lastInteractionAt?: string;
};

export type EvidenceChecklistItem = {
  checklistId: string;
  label: string;
  state: 'complete' | 'missing' | 'pending' | 'notApplicable';
  relatedDealId?: string;
  proofStatus?: CompanyProofStatus;
};

export type SavedWorkspaceView = {
  viewId: string;
  organizationId: string;
  name: string;
  filter: string;
  createdByUserId: string;
  createdAt: string;
};

export type CompanyLedgerExportManifest = {
  exportId: string;
  organizationId: string;
  generatedByUserId: string;
  generatedAt: string;
  itemCount: number;
  manifestHash: string;
  proofScope: 'companyLedgerSummary';
  status: 'ready';
  safeSummary: string;
};

export type NotificationCenterItem = {
  notificationId: string;
  title: string;
  message: string;
  status: 'queued' | 'sent' | 'failed' | 'skipped' | 'unread';
  relatedEntityType: string;
  relatedEntityId: string;
  occurredAt: string;
};

export type CompanyProductivitySummary = {
  calculationSource: 'recordBacked' | 'projectionFallback';
  moneyTracker: MoneyTrackerSummary;
  pipeline: ProcurementPipelineItem[];
  actionInbox: ActionInboxItem[];
  supplierScorecards: SupplierScorecard[];
  evidenceChecklist: EvidenceChecklistItem[];
};
