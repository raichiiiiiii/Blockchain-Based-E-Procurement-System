import type { PaymentInstruction, PaymentInstructionStatus } from '../domain/payment-instruction.js';

export type Iso20022ValidationIssue = {
  path: string;
  message: string;
};

export type Iso20022MappingResult<T> =
  | { status: 'mapped'; data: T }
  | { status: 'invalidInput'; issues: Iso20022ValidationIssue[] };

export type Iso20022PaymentInitiation = {
  standard: 'ISO20022-like';
  syntax: 'json';
  messageDefinition: 'pain.001.001.13';
  messageName: 'CustomerCreditTransferInitiationV13';
  generatedAt: string;
  groupHeader: {
    messageId: string;
    creationDateTime: string;
    numberOfTransactions: number;
    controlSum: string;
    initiatingParty: {
      organizationId: string;
    };
  };
  paymentInformation: {
    paymentInformationId: string;
    paymentMethod: 'TRF';
    requestedExecutionDate: string;
    debtor: {
      organizationId: string;
    };
    creditor: {
      organizationId: string;
    };
    creditTransferTransactionInformation: {
      paymentId: {
        instructionId: string;
        endToEndId: string;
      };
      instructedAmount: {
        currency: string;
        value: string;
      };
      remittanceInformation: {
        unstructured: string;
      };
      relatedEscrowId: string;
    };
  };
  claimBoundary: 'mappingOnlyNoBankExecution';
};

export type Iso20022PaymentStatusReport = {
  standard: 'ISO20022-like';
  syntax: 'json';
  messageDefinition: 'pain.002.001.15';
  messageName: 'CustomerPaymentStatusReportV15';
  generatedAt: string;
  groupHeader: {
    messageId: string;
    creationDateTime: string;
    initiatingParty: {
      organizationId: string;
    };
  };
  originalGroupInformationAndStatus: {
    originalMessageId: string;
    originalMessageNameId: 'pain.001.001.13';
    groupStatus: Iso20022StatusCode;
  };
  transactionInformationAndStatus: {
    originalInstructionId: string;
    originalEndToEndId: string;
    transactionStatus: Iso20022StatusCode;
    statusReasonInformation?: {
      reason: string;
      additionalInformation?: string;
    };
  };
  claimBoundary: 'mappingOnlyNoBankExecution';
};

export type Iso20022PaymentArtifacts = {
  paymentInitiation: Iso20022PaymentInitiation;
  paymentStatusReport: Iso20022PaymentStatusReport;
};

export type Iso20022MapperOptions = {
  requestedExecutionDate?: string;
  generatedAt?: string;
};

export type Iso20022StatusCode = 'PDNG' | 'ACCP' | 'ACSC' | 'RJCT' | 'CANC';

function trim(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function isPositiveAmount(value: string | undefined): boolean {
  if (!value) {
    return false;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0;
}

function isCurrency(value: string | undefined): boolean {
  return Boolean(value && /^[A-Z]{3}$/.test(value));
}

function isIsoDate(value: string | undefined): boolean {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function requestedExecutionDateFor(instruction: PaymentInstruction, options: Iso20022MapperOptions): string | undefined {
  if (options.requestedExecutionDate !== undefined) {
    return trim(options.requestedExecutionDate);
  }

  return trim(instruction.createdAt)?.slice(0, 10);
}

function generatedAtFor(options: Iso20022MapperOptions): string {
  return trim(options.generatedAt) ?? new Date().toISOString();
}

function statusCodeFor(status: PaymentInstructionStatus): Iso20022StatusCode {
  switch (status) {
    case 'pending':
      return 'PDNG';
    case 'accepted':
      return 'ACCP';
    case 'settled':
      return 'ACSC';
    case 'failed':
      return 'RJCT';
    case 'cancelled':
      return 'CANC';
  }
}

function statusReasonFor(instruction: PaymentInstruction): Iso20022PaymentStatusReport['transactionInformationAndStatus']['statusReasonInformation'] | undefined {
  if (instruction.status === 'failed') {
    return {
      reason: 'RJCT',
      additionalInformation: instruction.failureReason ?? 'Sandbox payment instruction was marked failed',
    };
  }

  if (instruction.status === 'cancelled') {
    return {
      reason: 'CANC',
      additionalInformation: 'Sandbox or manual payment instruction was cancelled',
    };
  }

  return undefined;
}

function validateInstruction(instruction: PaymentInstruction, requestedExecutionDate: string | undefined): Iso20022ValidationIssue[] {
  const issues: Iso20022ValidationIssue[] = [];

  if (!trim(instruction.paymentInstructionId)) {
    issues.push({ path: 'paymentInstructionId', message: 'Payment instruction id is required' });
  }
  if (!trim(instruction.escrowId)) {
    issues.push({ path: 'escrowId', message: 'Escrow id is required' });
  }
  if (!isPositiveAmount(trim(instruction.amount))) {
    issues.push({ path: 'amount', message: 'Amount must be greater than zero' });
  }
  if (!isCurrency(trim(instruction.currency))) {
    issues.push({ path: 'currency', message: 'Currency must be a 3-letter uppercase code' });
  }
  if (!trim(instruction.debtorOrganizationId)) {
    issues.push({ path: 'debtorOrganizationId', message: 'Debtor organization id is required' });
  }
  if (!trim(instruction.creditorOrganizationId)) {
    issues.push({ path: 'creditorOrganizationId', message: 'Creditor organization id is required' });
  }
  if (!trim(instruction.paymentReference)) {
    issues.push({ path: 'paymentReference', message: 'Payment reference is required' });
  }
  if (!isIsoDate(requestedExecutionDate)) {
    issues.push({ path: 'requestedExecutionDate', message: 'Requested execution date must use YYYY-MM-DD format' });
  }

  return issues;
}

export function mapPaymentInstructionToIso20022Initiation(
  instruction: PaymentInstruction,
  options: Iso20022MapperOptions = {},
): Iso20022MappingResult<Iso20022PaymentInitiation> {
  const requestedExecutionDate = requestedExecutionDateFor(instruction, options);
  const issues = validateInstruction(instruction, requestedExecutionDate);

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const generatedAt = generatedAtFor(options);
  const amount = trim(instruction.amount) as string;
  const currency = trim(instruction.currency) as string;
  const paymentInstructionId = trim(instruction.paymentInstructionId) as string;
  const paymentReference = trim(instruction.paymentReference) as string;
  const debtorOrganizationId = trim(instruction.debtorOrganizationId) as string;
  const creditorOrganizationId = trim(instruction.creditorOrganizationId) as string;

  return {
    status: 'mapped',
    data: {
      standard: 'ISO20022-like',
      syntax: 'json',
      messageDefinition: 'pain.001.001.13',
      messageName: 'CustomerCreditTransferInitiationV13',
      generatedAt,
      groupHeader: {
        messageId: `msg-${paymentInstructionId}`,
        creationDateTime: generatedAt,
        numberOfTransactions: 1,
        controlSum: amount,
        initiatingParty: {
          organizationId: debtorOrganizationId,
        },
      },
      paymentInformation: {
        paymentInformationId: `pmt-${paymentInstructionId}`,
        paymentMethod: 'TRF',
        requestedExecutionDate: requestedExecutionDate as string,
        debtor: {
          organizationId: debtorOrganizationId,
        },
        creditor: {
          organizationId: creditorOrganizationId,
        },
        creditTransferTransactionInformation: {
          paymentId: {
            instructionId: paymentInstructionId,
            endToEndId: paymentReference,
          },
          instructedAmount: {
            currency,
            value: amount,
          },
          remittanceInformation: {
            unstructured: paymentReference,
          },
          relatedEscrowId: instruction.escrowId,
        },
      },
      claimBoundary: 'mappingOnlyNoBankExecution',
    },
  };
}

export function mapPaymentInstructionToIso20022StatusReport(
  instruction: PaymentInstruction,
  options: Iso20022MapperOptions = {},
): Iso20022MappingResult<Iso20022PaymentStatusReport> {
  const requestedExecutionDate = requestedExecutionDateFor(instruction, options);
  const issues = validateInstruction(instruction, requestedExecutionDate);

  if (issues.length > 0) {
    return { status: 'invalidInput', issues };
  }

  const generatedAt = generatedAtFor(options);
  const paymentInstructionId = trim(instruction.paymentInstructionId) as string;
  const paymentReference = trim(instruction.paymentReference) as string;
  const debtorOrganizationId = trim(instruction.debtorOrganizationId) as string;
  const statusCode = statusCodeFor(instruction.status);

  return {
    status: 'mapped',
    data: {
      standard: 'ISO20022-like',
      syntax: 'json',
      messageDefinition: 'pain.002.001.15',
      messageName: 'CustomerPaymentStatusReportV15',
      generatedAt,
      groupHeader: {
        messageId: `sts-${paymentInstructionId}`,
        creationDateTime: generatedAt,
        initiatingParty: {
          organizationId: debtorOrganizationId,
        },
      },
      originalGroupInformationAndStatus: {
        originalMessageId: `msg-${paymentInstructionId}`,
        originalMessageNameId: 'pain.001.001.13',
        groupStatus: statusCode,
      },
      transactionInformationAndStatus: {
        originalInstructionId: paymentInstructionId,
        originalEndToEndId: paymentReference,
        transactionStatus: statusCode,
        statusReasonInformation: statusReasonFor(instruction),
      },
      claimBoundary: 'mappingOnlyNoBankExecution',
    },
  };
}

export function mapPaymentInstructionToIso20022Artifacts(
  instruction: PaymentInstruction,
  options: Iso20022MapperOptions = {},
): Iso20022MappingResult<Iso20022PaymentArtifacts> {
  const paymentInitiation = mapPaymentInstructionToIso20022Initiation(instruction, options);
  if (paymentInitiation.status === 'invalidInput') {
    return paymentInitiation;
  }

  const paymentStatusReport = mapPaymentInstructionToIso20022StatusReport(instruction, options);
  if (paymentStatusReport.status === 'invalidInput') {
    return paymentStatusReport;
  }

  return {
    status: 'mapped',
    data: {
      paymentInitiation: paymentInitiation.data,
      paymentStatusReport: paymentStatusReport.data,
    },
  };
}
