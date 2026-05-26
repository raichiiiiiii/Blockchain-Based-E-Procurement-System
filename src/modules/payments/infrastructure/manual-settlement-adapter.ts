import type {
  PaymentAdapterCreateInput,
  PaymentAdapterResult,
  PaymentPort,
} from '../application/payment-port.js';
import type { PaymentInstruction, PaymentInstructionStatus } from '../domain/payment-instruction.js';

export class ManualSettlementAdapter implements PaymentPort {
  readonly adapterName = 'manualSettlement' as const;

  async createPaymentInstruction(input: PaymentAdapterCreateInput): Promise<PaymentAdapterResult> {
    return {
      status: input.requestedStatus ?? 'pending',
      adapterReference: `manual-settlement:${input.paymentInstructionId}`,
    };
  }

  async getPaymentStatus(instruction: PaymentInstruction): Promise<PaymentAdapterResult> {
    return {
      status: instruction.status,
      adapterReference: instruction.adapterReference,
      failureReason: instruction.failureReason,
    };
  }

  async cancelPaymentInstruction(instruction: PaymentInstruction): Promise<PaymentAdapterResult> {
    return {
      status: 'cancelled',
      adapterReference: instruction.adapterReference,
    };
  }

  async reconcilePaymentStatus(
    instruction: PaymentInstruction,
    requestedStatus?: PaymentInstructionStatus,
  ): Promise<PaymentAdapterResult> {
    return {
      status: requestedStatus ?? instruction.status,
      adapterReference: instruction.adapterReference,
      failureReason: requestedStatus === 'failed' ? 'Manual reconciliation marked the instruction failed' : undefined,
    };
  }
}
