import type { PaymentInstruction } from '../../payments/domain/payment-instruction.js';
import type { ProcurementContract } from '../../contracts/domain/procurement-contract.js';
import type { ProcurementOrder } from '../../procurement/domain/procurement-order.js';
import type { ErpIntegrationJob, ErpProfileType } from '../domain/erp-accounting.js';

export type ErpExportContext = {
  actorUserId: string;
  idempotencyKey?: string;
};

export type ErpImportContext = ErpExportContext;

export interface ErpAccountingPort {
  exportPurchaseOrder(order: ProcurementOrder, context: ErpExportContext): Promise<ErpIntegrationJob>;
  importPurchaseOrder(payload: Record<string, unknown>, context: ErpImportContext): Promise<ErpIntegrationJob>;
  exportInvoice(order: ProcurementOrder, context: ErpExportContext): Promise<ErpIntegrationJob>;
  importInvoice(payload: Record<string, unknown>, context: ErpImportContext): Promise<ErpIntegrationJob>;
  exportDespatchAdvice(order: ProcurementOrder, context: ErpExportContext): Promise<ErpIntegrationJob>;
  exportPaymentStatus(instruction: PaymentInstruction, context: ErpExportContext): Promise<ErpIntegrationJob>;
  exportJournalEvent(instruction: PaymentInstruction, context: ErpExportContext): Promise<ErpIntegrationJob>;
  exportContractReleasePackage(contract: ProcurementContract, context: ErpExportContext): Promise<ErpIntegrationJob>;
  getJob(jobId: string): Promise<ErpIntegrationJob | null>;
  getJobByIdempotencyKey(profileType: ErpProfileType, idempotencyKey: string): Promise<ErpIntegrationJob | null>;
}
