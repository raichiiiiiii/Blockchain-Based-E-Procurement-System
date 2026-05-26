import type {
  PaymentAdapterCreateInput,
  PaymentAdapterResult,
  PaymentPort,
} from '../application/payment-port.js';
import type { PaymentInstruction, PaymentInstructionStatus } from '../domain/payment-instruction.js';

const allowedSandboxStatuses = new Set<PaymentInstructionStatus>([
  'pending',
  'accepted',
  'failed',
  'settled',
  'cancelled',
]);

export class LocalSandboxPaymentAdapter implements PaymentPort {
  readonly adapterName = 'localSandbox' as const;

  async createPaymentInstruction(input: PaymentAdapterCreateInput): Promise<PaymentAdapterResult> {
    return {
      status: this.normalizeStatus(input.requestedStatus, 'accepted'),
      adapterReference: `sandbox-payment:${input.paymentInstructionId}`,
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
    const status = this.normalizeStatus(requestedStatus, instruction.status === 'accepted' ? 'settled' : instruction.status);
    return {
      status,
      adapterReference: instruction.adapterReference,
      failureReason: status === 'failed' ? 'Sandbox reconciliation marked the instruction failed' : undefined,
    };
  }

  private normalizeStatus(
    status: PaymentInstructionStatus | undefined,
    fallback: PaymentInstructionStatus,
  ): PaymentInstructionStatus {
    return status && allowedSandboxStatuses.has(status) ? status : fallback;
  }
}
