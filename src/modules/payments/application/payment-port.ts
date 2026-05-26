import type {
  PaymentAdapterName,
  PaymentInstruction,
  PaymentInstructionStatus,
} from '../domain/payment-instruction.js';

export type PaymentAdapterCreateInput = {
  paymentInstructionId: string;
  escrowId: string;
  amount: string;
  currency: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  paymentReference: string;
  requestedStatus?: PaymentInstructionStatus;
};

export type PaymentAdapterResult = {
  status: PaymentInstructionStatus;
  adapterReference?: string;
  failureReason?: string;
};

export interface PaymentPort {
  readonly adapterName: PaymentAdapterName;
  createPaymentInstruction(input: PaymentAdapterCreateInput): Promise<PaymentAdapterResult>;
  getPaymentStatus(instruction: PaymentInstruction): Promise<PaymentAdapterResult>;
  cancelPaymentInstruction(instruction: PaymentInstruction): Promise<PaymentAdapterResult>;
  reconcilePaymentStatus(
    instruction: PaymentInstruction,
    requestedStatus?: PaymentInstructionStatus,
  ): Promise<PaymentAdapterResult>;
}
