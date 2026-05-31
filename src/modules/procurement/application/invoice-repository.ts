import type { ProcurementInvoice } from '../domain/invoice.js';

export interface ProcurementInvoiceRepository {
  save(invoice: ProcurementInvoice): Promise<ProcurementInvoice>;
  findById(invoiceId: string): Promise<ProcurementInvoice | null>;
  findByInvoiceHash(invoiceHash: string): Promise<ProcurementInvoice | null>;
  listByOrderId(orderId: string): Promise<ProcurementInvoice[]>;
  listByBuyerOrganization(buyerOrganizationId: string): Promise<ProcurementInvoice[]>;
  listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementInvoice[]>;
  listAll(): Promise<ProcurementInvoice[]>;
}
