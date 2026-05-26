import { describe, it } from 'node:test';
import { strict as assert } from 'node:assert';
import type { PaymentInstruction } from '../domain/payment-instruction.js';
import {
  mapPaymentInstructionToIso20022Artifacts,
  mapPaymentInstructionToIso20022Initiation,
  mapPaymentInstructionToIso20022StatusReport,
} from './iso20022-payment-mapper.js';

function instruction(overrides: Partial<PaymentInstruction> = {}): PaymentInstruction {
  return {
    paymentInstructionId: 'payment-001',
    escrowId: 'escrow-001',
    amount: '68000.00',
    currency: 'MYR',
    debtorOrganizationId: 'demo-financier-org',
    creditorOrganizationId: 'demo-supplier-org',
    status: 'accepted',
    paymentReference: 'settlement:escrow-001',
    adapterName: 'localSandbox',
    adapterReference: 'sandbox-payment:payment-001',
    createdByUserId: 'demo-buyer-user',
    createdAt: '2026-05-26T10:00:00.000Z',
    updatedAt: '2026-05-26T10:05:00.000Z',
    lifecycleEventIds: ['settlement-event-001'],
    ...overrides,
  };
}

describe('ISO 20022 payment mapper', () => {
  it('maps a payment instruction to an ISO 20022-like pain.001 JSON artifact', () => {
    const result = mapPaymentInstructionToIso20022Initiation(instruction(), {
      requestedExecutionDate: '2026-05-27',
      generatedAt: '2026-05-26T11:00:00.000Z',
    });

    assert.strictEqual(result.status, 'mapped');
    assert.strictEqual(result.data.standard, 'ISO20022-like');
    assert.strictEqual(result.data.messageDefinition, 'pain.001.001.13');
    assert.strictEqual(result.data.messageName, 'CustomerCreditTransferInitiationV13');
    assert.strictEqual(result.data.groupHeader.numberOfTransactions, 1);
    assert.strictEqual(result.data.groupHeader.controlSum, '68000.00');
    assert.strictEqual(result.data.paymentInformation.requestedExecutionDate, '2026-05-27');
    assert.strictEqual(result.data.paymentInformation.debtor.organizationId, 'demo-financier-org');
    assert.strictEqual(result.data.paymentInformation.creditor.organizationId, 'demo-supplier-org');
    assert.strictEqual(
      result.data.paymentInformation.creditTransferTransactionInformation.instructedAmount.currency,
      'MYR',
    );
    assert.strictEqual(
      result.data.paymentInformation.creditTransferTransactionInformation.remittanceInformation.unstructured,
      'settlement:escrow-001',
    );
    assert.strictEqual(result.data.claimBoundary, 'mappingOnlyNoBankExecution');
  });

  it('maps sandbox payment statuses to ISO 20022-like pain.002 status codes', () => {
    const cases = [
      ['pending', 'PDNG'],
      ['accepted', 'ACCP'],
      ['settled', 'ACSC'],
      ['failed', 'RJCT'],
      ['cancelled', 'CANC'],
    ] as const;

    for (const [status, expectedCode] of cases) {
      const result = mapPaymentInstructionToIso20022StatusReport(instruction({ status }), {
        requestedExecutionDate: '2026-05-27',
        generatedAt: '2026-05-26T11:00:00.000Z',
      });

      assert.strictEqual(result.status, 'mapped');
      assert.strictEqual(result.data.messageDefinition, 'pain.002.001.15');
      assert.strictEqual(result.data.transactionInformationAndStatus.transactionStatus, expectedCode);
      assert.strictEqual(result.data.originalGroupInformationAndStatus.groupStatus, expectedCode);
    }
  });

  it('includes rejection reason metadata for failed sandbox status', () => {
    const result = mapPaymentInstructionToIso20022StatusReport(instruction({
      status: 'failed',
      failureReason: 'Sandbox reconciliation marked payment failed',
    }), {
      requestedExecutionDate: '2026-05-27',
    });

    assert.strictEqual(result.status, 'mapped');
    assert.deepStrictEqual(result.data.transactionInformationAndStatus.statusReasonInformation, {
      reason: 'RJCT',
      additionalInformation: 'Sandbox reconciliation marked payment failed',
    });
  });

  it('rejects missing required ISO 20022 mapping fields', () => {
    const result = mapPaymentInstructionToIso20022Artifacts(instruction({
      amount: '0',
      currency: 'myr',
      debtorOrganizationId: ' ',
      creditorOrganizationId: '',
      paymentReference: '',
    }), {
      requestedExecutionDate: '',
    });

    assert.strictEqual(result.status, 'invalidInput');
    assert.deepStrictEqual(result.issues.map(issue => issue.path), [
      'amount',
      'currency',
      'debtorOrganizationId',
      'creditorOrganizationId',
      'paymentReference',
      'requestedExecutionDate',
    ]);
  });
});
