import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toOptionalIsoString, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { ShariahCertificateRepository } from '../application/shariah-certificate-repository.js';
import type { ShariahCertificate, ShariahCertificateStatus } from '../domain/shariah-certificate.js';

type ShariahCertificateRow = {
  certificate_id: string;
  issued_by: string;
  reviewer_board: string;
  fatwa_reference: string;
  scope: string;
  contract_template_version: string;
  conditions: unknown;
  issued_at: Date | string;
  expires_at: Date | string | null;
  status: ShariahCertificateStatus;
  certificate_document_id: string | null;
  certificate_hash: string;
  created_by_user_id: string;
  created_at: Date | string;
  revoked_at: Date | string | null;
  revocation_reason: string | null;
};

function toShariahCertificate(row: ShariahCertificateRow): ShariahCertificate {
  const certificate: ShariahCertificate = {
    certificateId: row.certificate_id,
    issuedBy: row.issued_by,
    reviewerBoard: row.reviewer_board,
    fatwaReference: row.fatwa_reference,
    scope: row.scope,
    contractTemplateVersion: row.contract_template_version,
    conditions: toStringArray(row.conditions),
    issuedAt: toIsoString(row.issued_at),
    status: row.status,
    certificateHash: row.certificate_hash,
    createdByUserId: row.created_by_user_id,
    createdAt: toIsoString(row.created_at),
  };

  const expiresAt = toOptionalIsoString(row.expires_at);
  if (expiresAt) {
    certificate.expiresAt = expiresAt;
  }

  if (row.certificate_document_id) {
    certificate.certificateDocumentId = row.certificate_document_id;
  }

  const revokedAt = toOptionalIsoString(row.revoked_at);
  if (revokedAt) {
    certificate.revokedAt = revokedAt;
  }

  if (row.revocation_reason) {
    certificate.revocationReason = row.revocation_reason;
  }

  return certificate;
}

export class PostgresShariahCertificateRepository implements ShariahCertificateRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async save(certificate: ShariahCertificate): Promise<ShariahCertificate> {
    await this.db.query(
      `
        INSERT INTO shariah_certificates (
          certificate_id,
          issued_by,
          reviewer_board,
          fatwa_reference,
          scope,
          contract_template_version,
          conditions,
          issued_at,
          expires_at,
          status,
          certificate_document_id,
          certificate_hash,
          created_by_user_id,
          created_at,
          revoked_at,
          revocation_reason
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (certificate_id)
        DO UPDATE SET
          issued_by = EXCLUDED.issued_by,
          reviewer_board = EXCLUDED.reviewer_board,
          fatwa_reference = EXCLUDED.fatwa_reference,
          scope = EXCLUDED.scope,
          contract_template_version = EXCLUDED.contract_template_version,
          conditions = EXCLUDED.conditions,
          issued_at = EXCLUDED.issued_at,
          expires_at = EXCLUDED.expires_at,
          status = EXCLUDED.status,
          certificate_document_id = EXCLUDED.certificate_document_id,
          certificate_hash = EXCLUDED.certificate_hash,
          created_by_user_id = EXCLUDED.created_by_user_id,
          created_at = EXCLUDED.created_at,
          revoked_at = EXCLUDED.revoked_at,
          revocation_reason = EXCLUDED.revocation_reason
      `,
      [
        certificate.certificateId,
        certificate.issuedBy,
        certificate.reviewerBoard,
        certificate.fatwaReference,
        certificate.scope,
        certificate.contractTemplateVersion,
        JSON.stringify(certificate.conditions),
        certificate.issuedAt,
        certificate.expiresAt ?? null,
        certificate.status,
        certificate.certificateDocumentId ?? null,
        certificate.certificateHash,
        certificate.createdByUserId,
        certificate.createdAt,
        certificate.revokedAt ?? null,
        certificate.revocationReason ?? null,
      ],
    );

    return { ...certificate, conditions: [...certificate.conditions] };
  }

  async findById(certificateId: string): Promise<ShariahCertificate | null> {
    const result = await this.db.query<ShariahCertificateRow>(
      'SELECT * FROM shariah_certificates WHERE certificate_id = $1',
      [certificateId],
    );

    return result.rows[0] ? toShariahCertificate(result.rows[0]) : null;
  }

  async list(): Promise<ShariahCertificate[]> {
    const result = await this.db.query<ShariahCertificateRow>(
      `
        SELECT *
        FROM shariah_certificates
        ORDER BY created_at DESC, certificate_id ASC
      `,
    );

    return result.rows.map(toShariahCertificate);
  }
}
