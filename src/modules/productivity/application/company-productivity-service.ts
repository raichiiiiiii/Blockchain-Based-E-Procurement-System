import { createHash, randomUUID } from 'node:crypto';
import type { OrganizationNetworkRepository } from '../../organization-network/application/organization-network-repository.js';
import type { CompanyDealProjection } from '../../organization-network/domain/organization-network.js';
import type { ProductivityStateRepository } from './productivity-state-repository.js';
import type {
  ActionInboxItem,
  CompanyLedgerExportManifest,
  CompanyProductivitySummary,
  EvidenceChecklistItem,
  MoneyTrackerSummary,
  NotificationCenterItem,
  ProcurementPipelineItem,
  SavedWorkspaceView,
  SupplierScorecard,
} from '../domain/productivity.js';

export type ProductivityActor = {
  actorUserId: string;
  actorOrganizationId: string;
  actorRoleCodes: string[];
};

function decimal(value: number): string {
  return value.toFixed(2);
}

function parseAmount(value?: string): number {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function hashManifest(value: unknown): string {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function buildPipeline(deals: CompanyDealProjection[]): ProcurementPipelineItem[] {
  const stages: ProcurementPipelineItem[] = [];

  for (const deal of deals) {
    stages.push({
      stage: 'orderCreated',
      label: `${deal.title}: order created`,
      state: deal.orderStatus === 'notStarted' ? 'notStarted' : 'complete',
      relatedDealId: deal.dealId,
      relatedRecordId: deal.orderId,
      updatedAt: deal.updatedAt,
    });
    stages.push({
      stage: 'supplierAccepted',
      label: `${deal.title}: supplier accepted`,
      state: deal.orderStatus === 'accepted' ? 'complete' : 'pending',
      relatedDealId: deal.dealId,
      relatedRecordId: deal.orderId,
      updatedAt: deal.updatedAt,
    });
    stages.push({
      stage: 'deliveryEvidenceSubmitted',
      label: `${deal.title}: delivery evidence`,
      state: deal.deliveryEvidenceStatus === 'metadataRecorded' ? 'complete' : 'pending',
      relatedDealId: deal.dealId,
      relatedRecordId: deal.proofEventId,
      updatedAt: deal.updatedAt,
    });
    stages.push({
      stage: 'escrowCreated',
      label: `${deal.title}: escrow created`,
      state: deal.escrowId ? 'complete' : 'pending',
      relatedDealId: deal.dealId,
      relatedRecordId: deal.escrowId,
      updatedAt: deal.updatedAt,
    });
    stages.push({
      stage: 'financingReview',
      label: `${deal.title}: financing and Shariah state`,
      state: ['approvedForActivation', 'activeSimulation', 'noFinancing'].includes(deal.financingStatus)
        ? 'complete'
        : deal.financingStatus === 'blocked' || deal.financingStatus === 'rejected'
          ? 'blocked'
          : 'pending',
      relatedDealId: deal.dealId,
      updatedAt: deal.updatedAt,
    });
  }

  return stages;
}

function buildMoneyTracker(deals: CompanyDealProjection[]): MoneyTrackerSummary {
  const committed = deals.reduce((total, deal) => total + (deal.orderStatus === 'accepted' ? 68000 : 42000), 0);
  const delivered = deals.reduce((total, deal) => total + (deal.deliveryEvidenceStatus === 'metadataRecorded' ? 68000 : 0), 0);
  const escrow = deals.reduce((total, deal) => total + (deal.escrowId ? 68000 : 0), 0);
  const financing = deals.reduce((total, deal) => total + (deal.financingStatus === 'approvedForActivation' ? 68000 : 0), 0);
  const budgetLimit = Math.max(250000, committed + 50000);
  const budgetRemaining = Math.max(0, budgetLimit - committed);

  return {
    currency: 'MYR',
    committedPurchaseOrderValue: decimal(committed),
    expectedDeliveryValue: decimal(delivered),
    escrowAmount: decimal(escrow),
    financingCapitalAmount: decimal(financing),
    outgoingPaymentInstructionStatus: escrow > 0 ? 'settlementInstructionReady' : 'notStarted',
    incomingReceivableStatus: delivered > 0 ? 'metadataReady' : 'pending',
    budgetLimit: decimal(budgetLimit),
    budgetConsumed: decimal(committed),
    budgetRemaining: decimal(budgetRemaining),
    safeAmountLabel: 'Amounts are supervisor-demo planning figures only; no payment execution is implied.',
  };
}

function taskIdFor(deal: CompanyDealProjection, suffix: string): string {
  return `task-${deal.dealId}-${suffix}`;
}

function buildActionInbox(
  deals: CompanyDealProjection[],
  completedTaskIds: readonly string[],
): ActionInboxItem[] {
  const completed = new Set(completedTaskIds);
  const items: ActionInboxItem[] = [];

  for (const deal of deals) {
    if (deal.deliveryEvidenceStatus !== 'metadataRecorded') {
      items.push({
        taskId: taskIdFor(deal, 'delivery-evidence'),
        title: 'Request delivery evidence',
        description: `${deal.counterpartDisplayName} has not submitted delivery evidence metadata for ${deal.title}.`,
        priority: 'medium',
        status: completed.has(taskIdFor(deal, 'delivery-evidence')) ? 'completed' : 'open',
        actionType: 'reviewDelivery',
        relatedRecordId: deal.orderId,
        dueLabel: 'Before escrow release readiness',
      });
    }

    if (['failed', 'mismatch', 'notFound', 'unavailable'].includes(deal.proofStatus)) {
      items.push({
        taskId: taskIdFor(deal, 'proof-exception'),
        title: 'Review proof exception',
        description: `${deal.title} has proof state ${deal.proofStatus}.`,
        priority: 'high',
        status: completed.has(taskIdFor(deal, 'proof-exception')) ? 'completed' : 'open',
        actionType: 'monitorException',
        relatedRecordId: deal.proofEventId,
      });
    }

    if (deal.financingStatus === 'pendingShariahReview') {
      items.push({
        taskId: taskIdFor(deal, 'financing-review'),
        title: 'Review financing readiness',
        description: `${deal.title} is waiting on financing or Shariah review state.`,
        priority: 'medium',
        status: completed.has(taskIdFor(deal, 'financing-review')) ? 'completed' : 'open',
        actionType: 'reviewFinancing',
        relatedRecordId: deal.orderId,
      });
    }
  }

  if (items.length === 0) {
    items.push({
      taskId: 'task-company-ledger-export',
      title: 'Prepare evidence export summary',
      description: 'Generate a lightweight company ledger manifest before supervisor review.',
      priority: 'low',
      status: completed.has('task-company-ledger-export') ? 'completed' : 'open',
      actionType: 'reviewExport',
      dueLabel: 'Before review meeting',
    });
  }

  return items;
}

function buildSupplierScorecards(deals: CompanyDealProjection[]): SupplierScorecard[] {
  const grouped = new Map<string, SupplierScorecard>();

  for (const deal of deals) {
    const current = grouped.get(deal.counterpartOrganizationId);
    const exception = ['failed', 'mismatch', 'notFound', 'unavailable'].includes(deal.proofStatus) ? 1 : 0;
    const next: SupplierScorecard = current
      ? {
          ...current,
          activeDealCount: current.activeDealCount + 1,
          deliveryEvidenceStatus: current.deliveryEvidenceStatus === deal.deliveryEvidenceStatus
            ? current.deliveryEvidenceStatus
            : 'mixed',
          exceptionCount: current.exceptionCount + exception,
          lastInteractionAt: deal.updatedAt ?? current.lastInteractionAt,
        }
      : {
          supplierOrganizationId: deal.counterpartOrganizationId,
          supplierDisplayName: deal.counterpartDisplayName,
          activeDealCount: 1,
          deliveryEvidenceStatus: deal.deliveryEvidenceStatus,
          proofReliabilityState: deal.proofStatus,
          exceptionCount: exception,
          lastInteractionAt: deal.updatedAt,
        };
    grouped.set(deal.counterpartOrganizationId, next);
  }

  return [...grouped.values()];
}

function buildEvidenceChecklist(deals: CompanyDealProjection[]): EvidenceChecklistItem[] {
  const items: EvidenceChecklistItem[] = [];

  for (const deal of deals) {
    items.push({
      checklistId: `check-order-${deal.dealId}`,
      label: `${deal.title}: order proof`,
      state: deal.orderStatus === 'notStarted' ? 'missing' : 'complete',
      relatedDealId: deal.dealId,
      proofStatus: deal.proofStatus,
    });
    items.push({
      checklistId: `check-delivery-${deal.dealId}`,
      label: `${deal.title}: delivery proof`,
      state: deal.deliveryEvidenceStatus === 'metadataRecorded' ? 'complete' : 'missing',
      relatedDealId: deal.dealId,
      proofStatus: deal.proofStatus,
    });
    items.push({
      checklistId: `check-escrow-${deal.dealId}`,
      label: `${deal.title}: escrow proof`,
      state: deal.escrowId ? 'complete' : 'pending',
      relatedDealId: deal.dealId,
      proofStatus: deal.proofStatus,
    });
    items.push({
      checklistId: `check-financing-${deal.dealId}`,
      label: `${deal.title}: Shariah or financing artifact`,
      state: deal.financingStatus === 'noFinancing' ? 'notApplicable' : 'complete',
      relatedDealId: deal.dealId,
      proofStatus: deal.proofStatus,
    });
  }

  return items;
}

export class CompanyProductivityService {
  constructor(
    private readonly organizationNetworkRepository: OrganizationNetworkRepository,
    private readonly stateRepository: ProductivityStateRepository,
  ) {}

  async getSummary(actor: ProductivityActor): Promise<CompanyProductivitySummary> {
    const deals = await this.organizationNetworkRepository.listCompanyDealProjections(actor.actorOrganizationId);
    const completedTaskIds = await this.stateRepository.listCompletedTaskIds(actor.actorOrganizationId);
    return {
      moneyTracker: buildMoneyTracker(deals),
      pipeline: buildPipeline(deals),
      actionInbox: buildActionInbox(deals, completedTaskIds),
      supplierScorecards: buildSupplierScorecards(deals),
      evidenceChecklist: buildEvidenceChecklist(deals),
    };
  }

  async getMoneyTracker(actor: ProductivityActor): Promise<MoneyTrackerSummary> {
    return (await this.getSummary(actor)).moneyTracker;
  }

  async getPipeline(actor: ProductivityActor): Promise<ProcurementPipelineItem[]> {
    return (await this.getSummary(actor)).pipeline;
  }

  async getActionInbox(actor: ProductivityActor): Promise<ActionInboxItem[]> {
    return (await this.getSummary(actor)).actionInbox;
  }

  async completeTask(actor: ProductivityActor, taskId: string): Promise<ActionInboxItem | null> {
    await this.stateRepository.markTaskCompleted(actor.actorOrganizationId, taskId);
    const task = (await this.getActionInbox(actor)).find(candidate => candidate.taskId === taskId);
    return task ?? {
      taskId,
      title: 'Task completed',
      description: 'The task was marked completed for this company workspace.',
      priority: 'low',
      status: 'completed',
      actionType: 'reviewExport',
    };
  }

  async getSupplierScorecards(actor: ProductivityActor): Promise<SupplierScorecard[]> {
    return (await this.getSummary(actor)).supplierScorecards;
  }

  async getEvidenceChecklist(actor: ProductivityActor): Promise<EvidenceChecklistItem[]> {
    return (await this.getSummary(actor)).evidenceChecklist;
  }

  async listSavedViews(actor: ProductivityActor): Promise<SavedWorkspaceView[]> {
    return this.stateRepository.listSavedViews(actor.actorOrganizationId);
  }

  async createSavedView(
    actor: ProductivityActor,
    input: { name?: unknown; filter?: unknown },
  ): Promise<SavedWorkspaceView> {
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const filter = typeof input.filter === 'string' ? input.filter.trim() : '';

    if (!name) {
      throw new Error('Saved view name is required');
    }

    const view: SavedWorkspaceView = {
      viewId: `view_${randomUUID()}`,
      organizationId: actor.actorOrganizationId,
      name,
      filter: filter || 'all',
      createdByUserId: actor.actorUserId,
      createdAt: new Date().toISOString(),
    };

    return this.stateRepository.saveView(view);
  }

  async createCompanyLedgerExport(actor: ProductivityActor): Promise<CompanyLedgerExportManifest> {
    const deals = await this.organizationNetworkRepository.listCompanyDealProjections(actor.actorOrganizationId);
    const exportId = `ledger_export_${randomUUID()}`;
    const generatedAt = new Date().toISOString();
    const manifestBasis = {
      exportId,
      organizationId: actor.actorOrganizationId,
      generatedByUserId: actor.actorUserId,
      generatedAt,
      dealIds: deals.map(deal => deal.dealId).sort(),
      totalCommittedValue: decimal(deals.reduce((total, deal) => total + parseAmount(deal.orderStatus === 'accepted' ? '68000' : '42000'), 0)),
    };
    const manifest: CompanyLedgerExportManifest = {
      exportId,
      organizationId: actor.actorOrganizationId,
      generatedByUserId: actor.actorUserId,
      generatedAt,
      itemCount: deals.length,
      manifestHash: hashManifest(manifestBasis),
      proofScope: 'companyLedgerSummary',
      status: 'ready',
      safeSummary: 'Lightweight company ledger manifest only. It does not include raw documents, private terms, or payment credentials.',
    };

    return this.stateRepository.saveExport(manifest);
  }

  async listNotifications(actor: ProductivityActor): Promise<NotificationCenterItem[]> {
    const emailRecords = await this.organizationNetworkRepository.listEmailNotificationsForOrganization(
      actor.actorOrganizationId,
      { includeGovernanceView: actor.actorRoleCodes.some(role => ['administrator', 'auditor', 'regulator', 'securityOperator'].includes(role)) },
    );

    return emailRecords.map(record => ({
      notificationId: record.notificationId,
      title: record.subject,
      message: record.safeBody,
      status: record.status,
      relatedEntityType: record.relatedEntityType,
      relatedEntityId: record.relatedEntityId,
      occurredAt: record.createdAt,
    }));
  }
}
