import type { EscrowRecord } from '../domain/escrow.js';

export interface EscrowRepository {
  create(escrow: EscrowRecord): Promise<EscrowRecord>;
  update(escrow: EscrowRecord): Promise<EscrowRecord>;
  findById(escrowId: string): Promise<EscrowRecord | null>;
  findActiveByOrderId(orderId: string): Promise<EscrowRecord | null>;
}
