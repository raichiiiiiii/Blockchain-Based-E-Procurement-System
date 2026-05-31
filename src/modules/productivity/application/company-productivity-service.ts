import { createHash, randomUUID } from 'node:crypto';
import type { OrganizationNetworkRepository } from '../../organization-network/application/organization-network-repository.js';
import type { CompanyDealProjection } from '../../organization-network/domain/organization-network.js';
import type { DeliveryEvidenceRepository } from '../../procurement/application/delivery-evidence-repository.js';
import type { ProcurementInvoiceRepository } from '../../procurement/application/invoice-repository.js';
import type { ProcurementOrderRepository } from '../../procurement/application/procurement-order-repository.js';
import type { ProcurementCloseoutRepository } from '../../procurement/application/procurement-closeout-repository.js';
import type { DeliveryEvidenceRecord } from '../../procurement/domain/delivery-evidence.js';
import type { ProcurementInvoice } from '../../procurement/domain/invoice.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';
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

export type ProductivityRecordDependencies = {
  orderRepository?: ProcurementOrderRepository;
  deliveryEvidenceRepository?: DeliveryEvidenceRepository;
  invoiceRepository?: ProcurementInvoiceRepository;
  closeoutRepository?: ProcurementCloseoutRepository;
};

type ProductivityRecords = {
  orders: ProcurementOrder[];
  evidence: DeliveryEvidenceRecord[];
  invoices: ProcurementInvoice[];
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

function buildMoneyTrackerFromRecords(records: ProductivityRecords, fallback: MoneyTrackerSummary): MoneyTrackerSummary {
  if (records.orders.length === 0) {
    return fallback;
  }

  const committed = records.orders.reduce((total, order) => total + parseAmount(order.amount), 0);
  const deliveredOrderIds = new Set(records.evidence.map(record => record.orderId));
  const delivered = records.orders
    .filter(order => deliveredOrderIds.has(order.orderId))
    .reduce((total, order) => total + parseAmount(order.amount), 0);
  const paymentReady = records.invoices.some(invoice => invoice.status === 'paymentApproved');
  const invoiceException = records.invoices.some(invoice => invoice.status === 'matchFailed');
  const budgetLimit = Math.max(parseAmount(fallback.budgetLimit), committed + 50000);

  return {
    ...fallback,
    committedPurchaseOrderValue: decimal(committed),
    expectedDeliveryValue: decimal(delivered),
    incomingReceivableStatus: invoiceException ? 'failed' : records.invoices.length > 0 ? 'metadataReady' : 'pending',
    outgoingPaymentInstructionStatus: paymentReady ? 'settlementInstructionReady' : fallback.outgoingPaymentInstructionStatus,
    budgetLimit: decimal(budgetLimit),
    budgetConsumed: decimal(committed),
    budgetRemaining: decimal(Math.max(0, budgetLimit - committed)),
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

function appendRecordDrivenTasks(
  items: ActionInboxItem[],
  records: ProductivityRecords,
  completedTaskIds: readonly string[],
): ActionInboxItem[] {
  const completed = new Set(completedTaskIds);
  const invoiceException = records.invoices.find(invoice => invoice.status === 'matchFailed');
  if (invoiceException) {
    items.push({
      taskId: `task-invoice-exception-${invoiceException.invoiceId}`,
      title: 'Review invoice exception',
      description: `Invoice ${invoiceException.invoiceId} failed matching and needs review before payment readiness.`,
      priority: 'high',
      status: completed.has(`task-invoice-exception-${invoiceException.invoiceId}`) ? 'completed' : 'open',
      actionType: 'monitorException',
      relatedRecordId: invoiceException.invoiceId,
    });
  }

  for (const order of records.orders) {
    if (order.status === 'accepted' && !records.invoices.some(invoice => invoice.orderId === order.orderId)) {
      items.push({
        taskId: `task-invoice-needed-${order.orderId}`,
        title: 'Prepare invoice match',
        description: `${order.title} has an accepted order and should be matched before payment readiness.`,
        priority: 'medium',
        status: completed.has(`task-invoice-needed-${order.orderId}`) ? 'completed' : 'open',
        actionType: 'reviewDelivery',
        relatedRecordId: order.orderId,
      });
    }
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

function buildSupplierScorecardsFromRecords(records: ProductivityRecords): SupplierScorecard[] {
  const grouped = new Map<string, {
    orders: ProcurementOrder[];
    evidence: DeliveryEvidenceRecord[];
    invoices: ProcurementInvoice[];
  }>();

  for (const order of records.orders) {
    const current = grouped.get(order.supplierOrganizationId) ?? { orders: [], evidence: [], invoices: [] };
    current.orders.push(order);
    grouped.set(order.supplierOrganizationId, current);
  }

  for (const evidence of records.evidence) {
    const current = grouped.get(evidence.supplierOrganizationId) ?? { orders: [], evidence: [], invoices: [] };
    current.evidence.push(evidence);
    grouped.set(evidence.supplierOrganizationId, current);
  }

  for (const invoice of records.invoices) {
    const current = grouped.get(invoice.supplierOrganizationId) ?? { orders: [], evidence: [], invoices: [] };
    current.invoices.push(invoice);
    grouped.set(invoice.supplierOrganizationId, current);
  }

  return [...grouped.entries()].map(([supplierOrganizationId, group]) => {
    const exceptionCount = group.invoices.filter(invoice => invoice.status === 'matchFailed').length;
    const evidenceStatus = group.evidence.length === 0
      ? 'notSubmitted'
      : group.evidence.length >= group.orders.length
        ? 'metadataRecorded'
        : 'mixed';
    return {
      supplierOrganizationId,
      supplierDisplayName: supplierOrganizationId,
      activeDealCount: group.orders.length,
      deliveryEvidenceStatus: evidenceStatus,
      proofReliabilityState: exceptionCount > 0 ? 'mismatch' : group.evidence.length > 0 ? 'anchored' : 'pending',
      exceptionCount,
      lastInteractionAt: [
        ...group.orders.map(order => order.updatedAt),
        ...group.evidence.map(evidence => evidence.submittedAt),
        ...group.invoices.map(invoice => invoice.updatedAt),
      ].sort().pop(),
    };
  });
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

function buildRecordPipeline(records: ProductivityRecords): ProcurementPipelineItem[] {
  return records.orders.flatMap(order => {
    const orderEvidence = records.evidence.filter(record => record.orderId === order.orderId);
    const orderInvoices = records.invoices.filter(invoice => invoice.orderId === order.orderId);
    const matchedInvoice = orderInvoices.find(invoice => invoice.status === 'matchPassed' || invoice.status === 'paymentApproved');

    return [
      {
        stage: 'orderCreated',
        label: `${order.title}: order created`,
        state: 'complete' as const,
        relatedDealId: order.orderId,
        relatedRecordId: order.orderId,
        updatedAt: order.updatedAt,
      },
      {
        stage: 'supplierAccepted',
        label: `${order.title}: supplier accepted`,
        state: order.status === 'accepted' ? 'complete' as const : 'pending' as const,
        relatedDealId: order.orderId,
        relatedRecordId: order.orderId,
        updatedAt: order.updatedAt,
      },
      {
        stage: 'deliveryEvidenceSubmitted',
        label: `${order.title}: delivery evidence`,
        state: orderEvidence.length > 0 ? 'complete' as const : 'pending' as const,
        relatedDealId: order.orderId,
        relatedRecordId: orderEvidence[0]?.evidenceId,
        updatedAt: orderEvidence[0]?.submittedAt ?? order.updatedAt,
      },
      {
        stage: 'buyerVerified',
        label: `${order.title}: invoice match`,
        state: matchedInvoice ? 'complete' as const : orderInvoices.some(invoice => invoice.status === 'matchFailed') ? 'blocked' as const : 'pending' as const,
        relatedDealId: order.orderId,
        relatedRecordId: matchedInvoice?.invoiceId ?? orderInvoices[0]?.invoiceId,
        updatedAt: matchedInvoice?.updatedAt ?? orderInvoices[0]?.updatedAt ?? order.updatedAt,
      },
    ];
  });
}

function buildEvidenceChecklistFromRecords(records: ProductivityRecords): EvidenceChecklistItem[] {
  return records.orders.flatMap(order => {
    const orderEvidence = records.evidence.filter(record => record.orderId === order.orderId);
    const orderInvoices = records.invoices.filter(invoice => invoice.orderId === order.orderId);
    const invoiceOk = orderInvoices.some(invoice => invoice.status === 'matchPassed' || invoice.status === 'paymentApproved');
    return [
      {
        checklistId: `record-order-${order.orderId}`,
        label: `${order.title}: order record`,
        state: 'complete' as const,
        relatedDealId: order.orderId,
        proofStatus: 'anchored' as const,
      },
      {
        checklistId: `record-delivery-${order.orderId}`,
        label: `${order.title}: delivery evidence`,
        state: orderEvidence.length > 0 ? 'complete' as const : 'missing' as const,
        relatedDealId: order.orderId,
        proofStatus: orderEvidence.length > 0 ? 'anchored' as const : 'pending' as const,
      },
      {
        checklistId: `record-invoice-${order.orderId}`,
        label: `${order.title}: invoice match`,
        state: invoiceOk ? 'complete' as const : orderInvoices.length > 0 ? 'pending' as const : 'missing' as const,
        relatedDealId: order.orderId,
        proofStatus: orderInvoices.some(invoice => invoice.status === 'matchFailed') ? 'mismatch' as const : 'pending' as const,
      },
    ];
  });
}

export class CompanyProductivityService {
  constructor(
    private readonly organizationNetworkRepository: OrganizationNetworkRepository,
    private readonly stateRepository: ProductivityStateRepository,
    private readonly recordDependencies: ProductivityRecordDependencies = {},
  ) {}

  private async getRecords(actor: ProductivityActor): Promise<ProductivityRecords> {
    if (!this.recordDependencies.orderRepository) {
      return { orders: [], evidence: [], invoices: [] };
    }

    const roles = actor.actorRoleCodes;
    const orders = roles.includes('buyer')
      ? await this.recordDependencies.orderRepository.listByBuyerOrganization(actor.actorOrganizationId)
      : roles.includes('supplier')
        ? await this.recordDependencies.orderRepository.listBySupplierOrganization(actor.actorOrganizationId)
        : roles.some(role => ['administrator', 'auditor', 'regulator', 'securityOperator'].includes(role))
          ? await this.recordDependencies.orderRepository.listAll()
          : [];

    const evidence = this.recordDependencies.deliveryEvidenceRepository
      ? (await Promise.all(orders.map(order => this.recordDependencies.deliveryEvidenceRepository?.listByOrderId(order.orderId) ?? []))).flat()
      : [];
    const invoices = this.recordDependencies.invoiceRepository
      ? (await Promise.all(orders.map(order => this.recordDependencies.invoiceRepository?.listByOrderId(order.orderId) ?? []))).flat()
      : [];

    return { orders, evidence, invoices };
  }

  async getSummary(actor: ProductivityActor): Promise<CompanyProductivitySummary> {
    const deals = await this.organizationNetworkRepository.listCompanyDealProjections(actor.actorOrganizationId);
    const completedTaskIds = await this.stateRepository.listCompletedTaskIds(actor.actorOrganizationId);
    const records = await this.getRecords(actor);
    const dealSummary = {
      moneyTracker: buildMoneyTracker(deals),
      pipeline: buildPipeline(deals),
      actionInbox: buildActionInbox(deals, completedTaskIds),
      supplierScorecards: buildSupplierScorecards(deals),
      evidenceChecklist: buildEvidenceChecklist(deals),
    };

    if (records.orders.length === 0) {
      return dealSummary;
    }

    return {
      moneyTracker: buildMoneyTrackerFromRecords(records, dealSummary.moneyTracker),
      pipeline: [...buildRecordPipeline(records), ...dealSummary.pipeline],
      actionInbox: appendRecordDrivenTasks([...dealSummary.actionInbox], records, completedTaskIds),
      supplierScorecards: [
        ...buildSupplierScorecardsFromRecords(records),
        ...dealSummary.supplierScorecards,
      ],
      evidenceChecklist: [
        ...buildEvidenceChecklistFromRecords(records),
        ...dealSummary.evidenceChecklist,
      ],
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
