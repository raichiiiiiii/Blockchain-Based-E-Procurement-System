import type { ProcurementContract } from '../../contracts/domain/procurement-contract.js';
import type { PaymentInstruction } from '../../payments/domain/payment-instruction.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';
import type { ErpAccountingPort, ErpExportContext, ErpImportContext } from '../application/erp-accounting-port.js';
import type { ErpIntegrationJob, ErpProfileType } from '../domain/erp-accounting.js';

function dateOnly(timestamp: string): string {
  return timestamp.slice(0, 10);
}

function nextJobId(): string {
  return `erp_job_${Date.now()}_${Math.random().toString(16).slice(2, 10)}`;
}

function cloneJob(job: ErpIntegrationJob): ErpIntegrationJob {
  return JSON.parse(JSON.stringify(job)) as ErpIntegrationJob;
}

export class LocalJsonErpAccountingAdapter implements ErpAccountingPort {
  private readonly jobs = new Map<string, ErpIntegrationJob>();
  private readonly idempotency = new Map<string, string>();

  async exportPurchaseOrder(order: ProcurementOrder, context: ErpExportContext): Promise<ErpIntegrationJob> {
    return this.saveCompletedJob('ublOrder', order.orderId, context, {
      standard: 'UBL-like',
      profile: 'Peppol BIS Ordering 3',
      documentType: 'Order',
      customizationId: 'urn:fdc:peppol.eu:poacc:trns:order:3',
      profileId: 'urn:fdc:peppol.eu:poacc:bis:ordering:3',
      id: order.orderId,
      issueDate: dateOnly(order.createdAt),
      buyerCustomerParty: {
        partyId: order.buyerOrganizationId,
      },
      sellerSupplierParty: {
        partyId: order.supplierOrganizationId,
      },
      orderLine: [{
        id: order.orderId,
        item: {
          name: order.title,
          description: order.description,
        },
        lineExtensionAmount: {
          amount: order.amount,
          currency: order.currency,
        },
      }],
      sourceStatus: order.status,
    });
  }

  async importPurchaseOrder(payload: Record<string, unknown>, context: ErpImportContext): Promise<ErpIntegrationJob> {
    const errors = [
      typeof payload.id === 'string' && payload.id.trim() ? undefined : 'id is required',
      typeof payload.buyerCustomerParty === 'object' && payload.buyerCustomerParty ? undefined : 'buyerCustomerParty is required',
      typeof payload.sellerSupplierParty === 'object' && payload.sellerSupplierParty ? undefined : 'sellerSupplierParty is required',
      Array.isArray(payload.orderLine) && payload.orderLine.length > 0 ? undefined : 'orderLine is required',
    ].filter(Boolean) as string[];

    return this.saveJob({
      direction: 'import',
      profileType: 'ublOrder',
      sourceId: typeof payload.id === 'string' ? payload.id : undefined,
      status: errors.length > 0 ? 'rejected' : 'completed',
      payload,
      mappingErrors: errors,
      idempotencyKey: context.idempotencyKey,
    });
  }

  async exportInvoice(order: ProcurementOrder, context: ErpExportContext): Promise<ErpIntegrationJob> {
    return this.saveCompletedJob('ublInvoice', order.orderId, context, {
      standard: 'UBL-like',
      profile: 'Peppol BIS Billing 3.0',
      documentType: 'Invoice',
      customizationId: 'urn:cen.eu:en16931:2017#compliant#urn:fdc:peppol.eu:2017:poacc:billing:3.0',
      id: `invoice-${order.orderId}`,
      issueDate: dateOnly(order.updatedAt),
      orderReference: order.orderId,
      accountingSupplierParty: {
        partyId: order.supplierOrganizationId,
      },
      accountingCustomerParty: {
        partyId: order.buyerOrganizationId,
      },
      legalMonetaryTotal: {
        payableAmount: order.amount,
        currency: order.currency,
      },
      invoiceLine: [{
        id: order.orderId,
        itemName: order.title,
        lineExtensionAmount: order.amount,
      }],
    });
  }

  async importInvoice(payload: Record<string, unknown>, context: ErpImportContext): Promise<ErpIntegrationJob> {
    const errors = [
      typeof payload.id === 'string' && payload.id.trim() ? undefined : 'id is required',
      typeof payload.accountingSupplierParty === 'object' && payload.accountingSupplierParty ? undefined : 'accountingSupplierParty is required',
      typeof payload.accountingCustomerParty === 'object' && payload.accountingCustomerParty ? undefined : 'accountingCustomerParty is required',
      typeof payload.legalMonetaryTotal === 'object' && payload.legalMonetaryTotal ? undefined : 'legalMonetaryTotal is required',
    ].filter(Boolean) as string[];

    return this.saveJob({
      direction: 'import',
      profileType: 'ublInvoice',
      sourceId: typeof payload.id === 'string' ? payload.id : undefined,
      status: errors.length > 0 ? 'rejected' : 'completed',
      payload,
      mappingErrors: errors,
      idempotencyKey: context.idempotencyKey,
    });
  }

  async exportDespatchAdvice(order: ProcurementOrder, context: ErpExportContext): Promise<ErpIntegrationJob> {
    return this.saveCompletedJob('ublDespatchAdvice', order.orderId, context, {
      standard: 'UBL-like',
      profile: 'Peppol BIS Despatch Advice-style local JSON',
      documentType: 'DespatchAdvice',
      customizationId: 'urn:fdc:peppol.eu:poacc:trns:despatch_advice:3',
      id: `despatch-${order.orderId}`,
      issueDate: dateOnly(order.updatedAt),
      orderReference: order.orderId,
      despatchSupplierParty: {
        partyId: order.supplierOrganizationId,
      },
      deliveryCustomerParty: {
        partyId: order.buyerOrganizationId,
      },
      despatchLine: [{
        id: order.orderId,
        itemName: order.title,
        description: order.description,
        deliveredQuantity: order.status === 'accepted' ? 'accepted-order-quantity' : 'pending-acceptance',
      }],
      sourceStatus: order.status,
    });
  }

  async exportPaymentStatus(instruction: PaymentInstruction, context: ErpExportContext): Promise<ErpIntegrationJob> {
    return this.saveCompletedJob('paymentStatus', instruction.paymentInstructionId, context, {
      standard: 'local-json',
      profile: 'Accounting payment status export',
      paymentInstructionId: instruction.paymentInstructionId,
      escrowId: instruction.escrowId,
      debtorOrganizationId: instruction.debtorOrganizationId,
      creditorOrganizationId: instruction.creditorOrganizationId,
      amount: instruction.amount,
      currency: instruction.currency,
      status: instruction.status,
      paymentReference: instruction.paymentReference,
      adapterName: instruction.adapterName,
      updatedAt: instruction.updatedAt,
    });
  }

  async exportJournalEvent(instruction: PaymentInstruction, context: ErpExportContext): Promise<ErpIntegrationJob> {
    return this.saveCompletedJob('journalEvent', instruction.paymentInstructionId, context, {
      standard: 'local-json',
      profile: 'Accounting journal event export',
      eventType: 'paymentInstructionStatus',
      debitOrganizationId: instruction.debtorOrganizationId,
      creditOrganizationId: instruction.creditorOrganizationId,
      amount: instruction.amount,
      currency: instruction.currency,
      status: instruction.status,
      reference: instruction.paymentReference,
    });
  }

  async exportContractReleasePackage(contract: ProcurementContract, context: ErpExportContext): Promise<ErpIntegrationJob> {
    return this.saveCompletedJob('ocdsReleasePackage', contract.contractId, context, {
      standard: 'OCDS-like',
      format: 'json',
      ocid: `ocds-local-${contract.contractId}`,
      id: contract.contractId,
      date: dateOnly(contract.updatedAt),
      tag: ['contract'],
      parties: [
        { id: contract.buyerOrganizationId, roles: ['buyer'] },
        { id: contract.supplierOrganizationId, roles: ['supplier'] },
        ...(contract.financierOrganizationId ? [{ id: contract.financierOrganizationId, roles: ['funder'] }] : []),
      ],
      contracts: [{
        id: contract.contractId,
        awardID: contract.machineReadableTerms.ocdsMapping?.awardId,
        title: contract.contractNumber,
        status: contract.status,
        period: {
          startDate: contract.effectiveAt,
          endDate: contract.expiresAt,
        },
        value: {
          amount: contract.machineReadableTerms.lineItems.reduce((total, item) => total + Number.parseFloat(item.quantity) * Number.parseFloat(item.unitPrice), 0).toFixed(2),
          currency: contract.machineReadableTerms.lineItems[0]?.currency,
        },
        implementation: {
          milestones: contract.machineReadableTerms.ocdsMapping?.implementationMilestones ?? [],
        },
      }],
    });
  }

  async getJob(jobId: string): Promise<ErpIntegrationJob | null> {
    const job = this.jobs.get(jobId);
    return job ? cloneJob(job) : null;
  }

  async getJobByIdempotencyKey(profileType: ErpProfileType, idempotencyKey: string): Promise<ErpIntegrationJob | null> {
    const jobId = this.idempotency.get(`${profileType}:${idempotencyKey}`);
    if (!jobId) {
      return null;
    }

    return this.getJob(jobId);
  }

  private async saveCompletedJob(
    profileType: ErpProfileType,
    sourceId: string,
    context: ErpExportContext,
    payload: Record<string, unknown>,
  ): Promise<ErpIntegrationJob> {
    return this.saveJob({
      direction: 'export',
      profileType,
      sourceId,
      status: 'completed',
      payload,
      mappingErrors: [],
      idempotencyKey: context.idempotencyKey,
    });
  }

  private saveJob(input: Omit<ErpIntegrationJob, 'jobId' | 'createdAt' | 'claimBoundary'>): ErpIntegrationJob {
    if (input.idempotencyKey) {
      const existing = this.idempotency.get(`${input.profileType}:${input.idempotencyKey}`);
      if (existing) {
        const job = this.jobs.get(existing);
        if (job) {
          return cloneJob(job);
        }
      }
    }

    const job: ErpIntegrationJob = {
      ...input,
      jobId: nextJobId(),
      createdAt: new Date().toISOString(),
      claimBoundary: 'localJsonAdapterOnlyNoProductionErpSync',
    };
    this.jobs.set(job.jobId, cloneJob(job));

    if (input.idempotencyKey) {
      this.idempotency.set(`${input.profileType}:${input.idempotencyKey}`, job.jobId);
    }

    return cloneJob(job);
  }
}
