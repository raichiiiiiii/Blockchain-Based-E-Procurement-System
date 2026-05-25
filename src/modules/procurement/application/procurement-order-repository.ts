import type { ProcurementOrder } from '../domain/procurement-order.js';

export interface ProcurementOrderRepository {
  save(order: ProcurementOrder): Promise<ProcurementOrder>;
  findById(orderId: string): Promise<ProcurementOrder | null>;
  listByBuyerOrganization(buyerOrganizationId: string): Promise<ProcurementOrder[]>;
  listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementOrder[]>;
  listAll(): Promise<ProcurementOrder[]>;
}
