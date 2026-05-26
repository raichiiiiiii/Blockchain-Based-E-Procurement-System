import type { PaymentInstruction } from '../domain/payment-instruction.js';

export interface PaymentInstructionRepository {
  save(instruction: PaymentInstruction): Promise<PaymentInstruction>;
  update(instruction: PaymentInstruction): Promise<PaymentInstruction>;
  findById(paymentInstructionId: string): Promise<PaymentInstruction | null>;
  findActiveByEscrowId(escrowId: string): Promise<PaymentInstruction | null>;
}
