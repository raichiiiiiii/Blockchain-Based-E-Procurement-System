export type PaymentInstructionStatus =
  | 'pending'
  | 'accepted'
  | 'failed'
  | 'settled'
  | 'cancelled';

export type PaymentAdapterName = 'manualSettlement' | 'localSandbox';

export type PaymentInstruction = {
  paymentInstructionId: string;
  escrowId: string;
  amount: string;
  currency: string;
  debtorOrganizationId: string;
  creditorOrganizationId: string;
  status: PaymentInstructionStatus;
  paymentReference: string;
  adapterName: PaymentAdapterName;
  adapterReference?: string;
  failureReason?: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  lifecycleEventIds: string[];
};
