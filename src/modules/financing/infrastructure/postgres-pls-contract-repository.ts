import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString, toRecord } from '../../../infrastructure/database/postgres-row-utils.js';
import type { PlsContractRepository } from '../application/pls-contract-repository.js';
import type {
  PlsContract,
  PlsContractStatus,
  PlsDistributionAllocation,
  PlsDistributionEventType,
  PlsDistributionRecord,
  PlsProfitShare,
  ShariahApprovalReference,
  ShariahCertificateReference,
} from '../domain/pls-contract.js';

type PlsContractRow = {
  contract_id: string;
  procurement_reference: string;
  contract_template_version: string;
  buyer_organization_id: string;
  supplier_organization_id: string;
  financier_organization_id: string;
  capital_amount: string;
  currency: string;
  profit_share: unknown;
  loss_allocation: PlsContract['lossAllocation'];
  status: PlsContractStatus;
  shariah_approval: unknown | null;
  shariah_certificate: unknown | null;
  activated_at: Date | string | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type PlsDistributionRow = {
  distribution_id: string;
  contract_id: string;
  event_type: PlsDistributionEventType;
  gross_result_amount: string;
  currency: string;
  calculation_basis: string;
  allocations: unknown;
  created_by: string;
  created_at: Date | string;
};

function toProfitShare(value: unknown): PlsProfitShare {
  const record = toRecord(value) ?? {};
  return {
    financierPercent: Number(record.financierPercent ?? 0),
    ventureOperatorPercent: Number(record.ventureOperatorPercent ?? 0),
  };
}

function toShariahApproval(value: unknown): ShariahApprovalReference | undefined {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const approval: ShariahApprovalReference = {
    reviewId: String(record.reviewId ?? ''),
    status: record.status as ShariahApprovalReference['status'],
  };

  if (typeof record.decidedAt === 'string') {
    approval.decidedAt = record.decidedAt;
  }

  return approval;
}

function toShariahCertificate(value: unknown): ShariahCertificateReference | undefined {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const certificate: ShariahCertificateReference = {
    certificateId: String(record.certificateId ?? ''),
    status: record.status as ShariahCertificateReference['status'],
    certificateHash: String(record.certificateHash ?? ''),
    issuedAt: String(record.issuedAt ?? ''),
  };

  if (typeof record.expiresAt === 'string') {
    certificate.expiresAt = record.expiresAt;
  }

  return certificate;
}

function toAllocations(value: unknown): PlsDistributionAllocation[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(item => toRecord(item))
    .filter((item): item is Record<string, unknown> => Boolean(item))
    .map(item => ({
      partyRole: item.partyRole as PlsDistributionAllocation['partyRole'],
      organizationId: String(item.organizationId ?? ''),
      amount: String(item.amount ?? ''),
      basis: String(item.basis ?? ''),
    }));
}

function toPlsContract(row: PlsContractRow): PlsContract {
  const contract: PlsContract = {
    contractId: row.contract_id,
    procurementReference: row.procurement_reference,
    contractTemplateVersion: row.contract_template_version,
    buyerOrganizationId: row.buyer_organization_id,
    supplierOrganizationId: row.supplier_organization_id,
    financierOrganizationId: row.financier_organization_id,
    capitalAmount: row.capital_amount,
    currency: row.currency,
    profitShare: toProfitShare(row.profit_share),
    lossAllocation: row.loss_allocation,
    status: row.status,
    createdAt: toIsoString(row.created_at),
    updatedAt: toIsoString(row.updated_at),
  };

  const shariahApproval = toShariahApproval(row.shariah_approval);
  if (shariahApproval) {
    contract.shariahApproval = shariahApproval;
  }

  const shariahCertificate = toShariahCertificate(row.shariah_certificate);
  if (shariahCertificate) {
    contract.shariahCertificate = shariahCertificate;
  }

  const activatedAt = toOptionalIsoString(row.activated_at);
  if (activatedAt) {
    contract.activatedAt = activatedAt;
  }

  return contract;
}

function toPlsDistribution(row: PlsDistributionRow): PlsDistributionRecord {
  return {
    distributionId: row.distribution_id,
    contractId: row.contract_id,
    eventType: row.event_type,
    grossResultAmount: row.gross_result_amount,
    currency: row.currency,
    calculationBasis: row.calculation_basis,
    allocations: toAllocations(row.allocations),
    createdBy: row.created_by,
    createdAt: toIsoString(row.created_at),
  };
}

export class PostgresPlsContractRepository implements PlsContractRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async saveContract(contract: PlsContract): Promise<PlsContract> {
    await this.db.query(
      `
        INSERT INTO pls_contracts (
          contract_id,
          procurement_reference,
          contract_template_version,
          buyer_organization_id,
          supplier_organization_id,
          financier_organization_id,
          capital_amount,
          currency,
          profit_share,
          loss_allocation,
          status,
          shariah_approval,
          shariah_certificate,
          activated_at,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, $11, $12::jsonb, $13::jsonb, $14, $15, $16)
        ON CONFLICT (contract_id)
        DO UPDATE SET
          procurement_reference = EXCLUDED.procurement_reference,
          contract_template_version = EXCLUDED.contract_template_version,
          buyer_organization_id = EXCLUDED.buyer_organization_id,
          supplier_organization_id = EXCLUDED.supplier_organization_id,
          financier_organization_id = EXCLUDED.financier_organization_id,
          capital_amount = EXCLUDED.capital_amount,
          currency = EXCLUDED.currency,
          profit_share = EXCLUDED.profit_share,
          loss_allocation = EXCLUDED.loss_allocation,
          status = EXCLUDED.status,
          shariah_approval = EXCLUDED.shariah_approval,
          shariah_certificate = EXCLUDED.shariah_certificate,
          activated_at = EXCLUDED.activated_at,
          created_at = EXCLUDED.created_at,
          updated_at = EXCLUDED.updated_at
      `,
      [
        contract.contractId,
        contract.procurementReference,
        contract.contractTemplateVersion,
        contract.buyerOrganizationId,
        contract.supplierOrganizationId,
        contract.financierOrganizationId,
        contract.capitalAmount,
        contract.currency,
        JSON.stringify(contract.profitShare),
        contract.lossAllocation,
        contract.status,
        contract.shariahApproval ? JSON.stringify(contract.shariahApproval) : null,
        contract.shariahCertificate ? JSON.stringify(contract.shariahCertificate) : null,
        contract.activatedAt ?? null,
        contract.createdAt,
        contract.updatedAt,
      ],
    );

    return { ...contract };
  }

  async findContractById(contractId: string): Promise<PlsContract | null> {
    const result = await this.db.query<PlsContractRow>(
      'SELECT * FROM pls_contracts WHERE contract_id = $1',
      [contractId],
    );

    return result.rows[0] ? toPlsContract(result.rows[0]) : null;
  }

  async listContracts(): Promise<PlsContract[]> {
    const result = await this.db.query<PlsContractRow>(
      `
        SELECT *
        FROM pls_contracts
        ORDER BY updated_at DESC, contract_id ASC
      `,
    );

    return result.rows.map(toPlsContract);
  }

  async saveDistribution(distribution: PlsDistributionRecord): Promise<PlsDistributionRecord> {
    await this.db.query(
      `
        INSERT INTO pls_distribution_records (
          distribution_id,
          contract_id,
          event_type,
          gross_result_amount,
          currency,
          calculation_basis,
          allocations,
          created_by,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9)
        ON CONFLICT (distribution_id)
        DO UPDATE SET
          contract_id = EXCLUDED.contract_id,
          event_type = EXCLUDED.event_type,
          gross_result_amount = EXCLUDED.gross_result_amount,
          currency = EXCLUDED.currency,
          calculation_basis = EXCLUDED.calculation_basis,
          allocations = EXCLUDED.allocations,
          created_by = EXCLUDED.created_by,
          created_at = EXCLUDED.created_at
      `,
      [
        distribution.distributionId,
        distribution.contractId,
        distribution.eventType,
        distribution.grossResultAmount,
        distribution.currency,
        distribution.calculationBasis,
        JSON.stringify(distribution.allocations),
        distribution.createdBy,
        distribution.createdAt,
      ],
    );

    return { ...distribution, allocations: distribution.allocations.map(allocation => ({ ...allocation })) };
  }

  async findDistributionById(distributionId: string): Promise<PlsDistributionRecord | null> {
    const result = await this.db.query<PlsDistributionRow>(
      'SELECT * FROM pls_distribution_records WHERE distribution_id = $1',
      [distributionId],
    );

    return result.rows[0] ? toPlsDistribution(result.rows[0]) : null;
  }

  async listDistributionsByContract(contractId: string): Promise<PlsDistributionRecord[]> {
    const result = await this.db.query<PlsDistributionRow>(
      `
        SELECT *
        FROM pls_distribution_records
        WHERE contract_id = $1
        ORDER BY created_at DESC, distribution_id ASC
      `,
      [contractId],
    );

    return result.rows.map(toPlsDistribution);
  }
}
