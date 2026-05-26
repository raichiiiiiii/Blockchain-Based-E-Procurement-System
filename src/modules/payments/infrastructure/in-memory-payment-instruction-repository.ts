import type { PaymentInstructionRepository } from '../application/payment-instruction-repository.js';
import type { PaymentInstruction } from '../domain/payment-instruction.js';

const activeStatuses = new Set(['pending', 'accepted', 'settled']);

export class InMemoryPaymentInstructionRepository implements PaymentInstructionRepository {
  private readonly instructions = new Map<string, PaymentInstruction>();

  async save(instruction: PaymentInstruction): Promise<PaymentInstruction> {
    if (this.instructions.has(instruction.paymentInstructionId)) {
      throw new Error(`Payment instruction already exists: ${instruction.paymentInstructionId}`);
    }

    this.instructions.set(instruction.paymentInstructionId, this.clone(instruction));
    return this.clone(instruction);
  }

  async update(instruction: PaymentInstruction): Promise<PaymentInstruction> {
    if (!this.instructions.has(instruction.paymentInstructionId)) {
      throw new Error(`Payment instruction does not exist: ${instruction.paymentInstructionId}`);
    }

    this.instructions.set(instruction.paymentInstructionId, this.clone(instruction));
    return this.clone(instruction);
  }

  async findById(paymentInstructionId: string): Promise<PaymentInstruction | null> {
    const instruction = this.instructions.get(paymentInstructionId);
    return instruction ? this.clone(instruction) : null;
  }

  async findActiveByEscrowId(escrowId: string): Promise<PaymentInstruction | null> {
    for (const instruction of this.instructions.values()) {
      if (instruction.escrowId === escrowId && activeStatuses.has(instruction.status)) {
        return this.clone(instruction);
      }
    }

    return null;
  }

  private clone(instruction: PaymentInstruction): PaymentInstruction {
    return {
      ...instruction,
      lifecycleEventIds: [...instruction.lifecycleEventIds],
    };
  }
}
