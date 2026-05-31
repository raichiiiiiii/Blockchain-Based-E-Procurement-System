import type { ProcurementInvoiceRepository } from '../application/invoice-repository.js';
import type { ProcurementInvoice } from '../domain/invoice.js';

function cloneInvoice(invoice: ProcurementInvoice): ProcurementInvoice {
  return JSON.parse(JSON.stringify(invoice));
}

export class InMemoryProcurementInvoiceRepository implements ProcurementInvoiceRepository {
  private readonly invoices = new Map<string, ProcurementInvoice>();

  async save(invoice: ProcurementInvoice): Promise<ProcurementInvoice> {
    this.invoices.set(invoice.invoiceId, cloneInvoice(invoice));
    return cloneInvoice(invoice);
  }

  async findById(invoiceId: string): Promise<ProcurementInvoice | null> {
    const invoice = this.invoices.get(invoiceId);
    return invoice ? cloneInvoice(invoice) : null;
  }

  async findByInvoiceHash(invoiceHash: string): Promise<ProcurementInvoice | null> {
    const invoice = [...this.invoices.values()].find(candidate => candidate.invoiceHash === invoiceHash);
    return invoice ? cloneInvoice(invoice) : null;
  }

  async listByOrderId(orderId: string): Promise<ProcurementInvoice[]> {
    return [...this.invoices.values()]
      .filter(invoice => invoice.orderId === orderId)
      .map(cloneInvoice);
  }

  async listByBuyerOrganization(buyerOrganizationId: string): Promise<ProcurementInvoice[]> {
    return [...this.invoices.values()]
      .filter(invoice => invoice.buyerOrganizationId === buyerOrganizationId)
      .map(cloneInvoice);
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementInvoice[]> {
    return [...this.invoices.values()]
      .filter(invoice => invoice.supplierOrganizationId === supplierOrganizationId)
      .map(cloneInvoice);
  }

  async listAll(): Promise<ProcurementInvoice[]> {
    return [...this.invoices.values()].map(cloneInvoice);
  }
}
