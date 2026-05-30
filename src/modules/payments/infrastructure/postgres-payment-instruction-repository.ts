import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { PaymentInstructionRepository } from '../application/payment-instruction-repository.js';
import type { PaymentAdapterName, PaymentInstruction, PaymentInstructionStatus } from '../domain/payment-instruction.js';

type PaymentInstructionRow = {
  payment_instruction_id: string;
  escrow_id: string;
  amount: string;
  currency: string;
  debtor_organization_id: string;
  creditor_organization_id: string;
  status: PaymentInstructionStatus;
  payment_reference: string;
  adapter_name: PaymentAdapterName;
  adapter_reference?: string | null;
  failure_reason?: string | null;
  created_by_user_id: string;
  created_at: string | Date;
  updated_at: string | Date;
  lifecycle_event_ids: unknown;
};

function toIsoString(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toPaymentInstruction(row: PaymentInstructionRow): PaymentInstruction {
  return {
    paymentInstructionId: row.payment_instruction_id,
    escrowId: row.escrow_id,
    amount: row.amount,
    currency: row.currency,
    debtorOrganizationId: row.debtor_organization_id,
    creditorOrganizationId: row.creditor_organization_id,
    status: row.status,
    paymentReference: row.payment_reference,
    adapterName: row.adapter_name,
    adapterReference: row.adapter_reference ?? undefined,
    failureReason: row.failure_reason ?? undefined,
    createdByUserId: row.created_by_user_id,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
    lifecycleEventIds: toStringArray(row.lifecycle_event_ids),
  };
}

const selectPaymentInstructionColumns = `
  payment_instruction_id,
  escrow_id,
  amount::text AS amount,
  currency,
  debtor_organization_id,
  creditor_organization_id,
  status,
  payment_reference,
  adapter_name,
  adapter_reference,
  failure_reason,
  created_by_user_id,
  created_at,
  updated_at,
  lifecycle_event_ids
`;

export class PostgresPaymentInstructionRepository implements PaymentInstructionRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(instruction: PaymentInstruction): Promise<PaymentInstruction> {
    await this.db.query(
      `
        INSERT INTO payment_instructions (
          payment_instruction_id,
          escrow_id,
          amount,
          currency,
          debtor_organization_id,
          creditor_organization_id,
          status,
          payment_reference,
          adapter_name,
          adapter_reference,
          failure_reason,
          created_by_user_id,
          created_at,
          updated_at,
          lifecycle_event_ids
        )
        VALUES ($1, $2, $3::numeric, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15::text[])
      `,
      [
        instruction.paymentInstructionId,
        instruction.escrowId,
        instruction.amount,
        instruction.currency,
        instruction.debtorOrganizationId,
        instruction.creditorOrganizationId,
        instruction.status,
        instruction.paymentReference,
        instruction.adapterName,
        instruction.adapterReference ?? null,
        instruction.failureReason ?? null,
        instruction.createdByUserId,
        instruction.createdAt,
        instruction.updatedAt,
        instruction.lifecycleEventIds,
      ],
    );

    return { ...instruction, lifecycleEventIds: [...instruction.lifecycleEventIds] };
  }

  async update(instruction: PaymentInstruction): Promise<PaymentInstruction> {
    const result = await this.db.query(
      `
        UPDATE payment_instructions
        SET
          amount = $2::numeric,
          currency = $3,
          debtor_organization_id = $4,
          creditor_organization_id = $5,
          status = $6,
          payment_reference = $7,
          adapter_name = $8,
          adapter_reference = $9,
          failure_reason = $10,
          updated_at = $11,
          lifecycle_event_ids = $12::text[]
        WHERE payment_instruction_id = $1
        RETURNING payment_instruction_id
      `,
      [
        instruction.paymentInstructionId,
        instruction.amount,
        instruction.currency,
        instruction.debtorOrganizationId,
        instruction.creditorOrganizationId,
        instruction.status,
        instruction.paymentReference,
        instruction.adapterName,
        instruction.adapterReference ?? null,
        instruction.failureReason ?? null,
        instruction.updatedAt,
        instruction.lifecycleEventIds,
      ],
    );

    if (result.rowCount === 0) {
      throw new Error(`Payment instruction does not exist: ${instruction.paymentInstructionId}`);
    }

    return { ...instruction, lifecycleEventIds: [...instruction.lifecycleEventIds] };
  }

  async findById(paymentInstructionId: string): Promise<PaymentInstruction | null> {
    const result = await this.db.query<PaymentInstructionRow>(
      `
        SELECT ${selectPaymentInstructionColumns}
        FROM payment_instructions
        WHERE payment_instruction_id = $1
      `,
      [paymentInstructionId],
    );

    return result.rows[0] ? toPaymentInstruction(result.rows[0]) : null;
  }

  async findActiveByEscrowId(escrowId: string): Promise<PaymentInstruction | null> {
    const result = await this.db.query<PaymentInstructionRow>(
      `
        SELECT ${selectPaymentInstructionColumns}
        FROM payment_instructions
        WHERE escrow_id = $1
          AND status IN ('pending', 'accepted', 'settled')
        ORDER BY updated_at DESC, payment_instruction_id ASC
        LIMIT 1
      `,
      [escrowId],
    );

    return result.rows[0] ? toPaymentInstruction(result.rows[0]) : null;
  }
}
