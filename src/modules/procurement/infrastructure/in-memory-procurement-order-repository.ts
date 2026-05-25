import type { ProcurementOrderRepository } from '../application/procurement-order-repository.js';
import type { ProcurementOrder } from '../domain/procurement-order.js';

function cloneOrder(order: ProcurementOrder): ProcurementOrder {
  return JSON.parse(JSON.stringify(order));
}

export class InMemoryProcurementOrderRepository implements ProcurementOrderRepository {
  private readonly orders = new Map<string, ProcurementOrder>();

  async save(order: ProcurementOrder): Promise<ProcurementOrder> {
    this.orders.set(order.orderId, cloneOrder(order));
    return cloneOrder(order);
  }

  async findById(orderId: string): Promise<ProcurementOrder | null> {
    const order = this.orders.get(orderId);
    return order ? cloneOrder(order) : null;
  }

  async listByBuyerOrganization(buyerOrganizationId: string): Promise<ProcurementOrder[]> {
    return Array.from(this.orders.values())
      .filter(order => order.buyerOrganizationId === buyerOrganizationId)
      .map(cloneOrder);
  }

  async listBySupplierOrganization(supplierOrganizationId: string): Promise<ProcurementOrder[]> {
    return Array.from(this.orders.values())
      .filter(order => order.supplierOrganizationId === supplierOrganizationId)
      .map(cloneOrder);
  }

  async listAll(): Promise<ProcurementOrder[]> {
    return Array.from(this.orders.values()).map(cloneOrder);
  }
}
