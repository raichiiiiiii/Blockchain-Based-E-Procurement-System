import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toRecord } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ProcurementContractRepository } from '../application/contract-repository.js';
import type { ProcurementContract } from '../domain/procurement-contract.js';

type ProcurementContractRow = {
  contract_json: unknown;
};

function cloneContract(contract: ProcurementContract): ProcurementContract {
  return structuredClone(contract);
}

function toProcurementContract(row: ProcurementContractRow): ProcurementContract {
  return cloneContract(toRecord(row.contract_json) as unknown as ProcurementContract);
}

export class PostgresProcurementContractRepository implements ProcurementContractRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(contract: ProcurementContract): Promise<ProcurementContract> {
    await this.db.query(
      `
        INSERT INTO procurement_contracts (
          contract_id,
          contract_number,
          buyer_organization_id,
          supplier_organization_id,
          financier_organization_id,
          status,
          version,
          human_readable_document_id,
          terms_hash,
          signed_at,
          effective_at,
          expires_at,
          created_by_user_id,
          created_at,
          updated_at,
          contract_json
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16::jsonb)
        ON CONFLICT (contract_id)
        DO UPDATE SET
          contract_number = EXCLUDED.contract_number,
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          financier_organization_id = EXCLUDED.financier_organization_id,
          status = EXCLUDED.status,
          version = EXCLUDED.version,
          human_readable_document_id = EXCLUDED.human_readable_document_id,
          terms_hash = EXCLUDED.terms_hash,
          signed_at = EXCLUDED.signed_at,
          effective_at = EXCLUDED.effective_at,
          expires_at = EXCLUDED.expires_at,
          created_by_user_id = EXCLUDED.created_by_user_id,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at,
          contract_json = EXCLUDED.contract_json
      `,
      [
        contract.contractId,
        contract.contractNumber,
        contract.buyerOrganizationId,
        contract.supplierOrganizationId,
        contract.financierOrganizationId ?? null,
        contract.status,
        contract.version,
        contract.humanReadableDocumentId ?? null,
        contract.termsHash,
        contract.signedAt ?? null,
        contract.effectiveAt ?? null,
        contract.expiresAt ?? null,
        contract.createdByUserId,
        contract.createdAt,
        contract.updatedAt,
        JSON.stringify(contract),
      ],
    );

    return cloneContract(contract);
  }

  async findById(contractId: string): Promise<ProcurementContract | null> {
    const result = await this.db.query<ProcurementContractRow>(
      'SELECT contract_json FROM procurement_contracts WHERE contract_id = $1',
      [contractId],
    );

    return result.rows[0] ? toProcurementContract(result.rows[0]) : null;
  }

  async list(): Promise<ProcurementContract[]> {
    const result = await this.db.query<ProcurementContractRow>(
      `
        SELECT contract_json
        FROM procurement_contracts
        ORDER BY updated_at DESC, contract_id ASC
      `,
    );

    return result.rows.map(toProcurementContract);
  }
}
