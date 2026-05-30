import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import { toIsoString, toRecord, toStringArray } from '../../../infrastructure/database/postgres-row-utils.js';
import type { DocumentRepository } from '../application/document-repository.js';
import type {
  DocumentExtractionRecord,
  DocumentMetadata,
  DocumentSignatureMetadata,
  DocumentType,
  ExtractionStatus,
  MachineReadableContractFields,
  MalwareScanStatus,
  SignatureStatus,
} from '../domain/document.js';

type DocumentMetadataRow = {
  document_id: string;
  owner_organization_id: string;
  uploaded_by_user_id: string;
  document_type: DocumentType;
  filename: string;
  mime_type: string;
  size_bytes: number;
  storage_ref: string;
  sha256: string;
  malware_scan_status: MalwareScanStatus;
  extraction_status: ExtractionStatus;
  signature_status: SignatureStatus;
  signature_metadata: unknown | null;
  created_at: Date | string;
};

type DocumentExtractionRow = {
  document_id: string;
  status: ExtractionStatus;
  language: string | null;
  extraction_confidence: number | null;
  extracted_text: string | null;
  extracted_fields: unknown;
  unmapped_sections: unknown;
  warnings: unknown;
  created_at: Date | string;
};

function toSignatureMetadata(value: unknown): DocumentSignatureMetadata | undefined {
  const record = toRecord(value);
  if (!record) {
    return undefined;
  }

  const metadata: DocumentSignatureMetadata = {
    signatureStatus: record.signatureStatus as SignatureStatus,
  };

  if (typeof record.signatureType === 'string') {
    metadata.signatureType = record.signatureType;
  }
  if (typeof record.certificateId === 'string') {
    metadata.certificateId = record.certificateId;
  }
  if (typeof record.signerName === 'string') {
    metadata.signerName = record.signerName;
  }
  if (typeof record.signedAt === 'string') {
    metadata.signedAt = record.signedAt;
  }
  if (record.trustModel === 'localMetadataOnly') {
    metadata.trustModel = 'localMetadataOnly';
  }
  if (typeof record.verificationSummary === 'string') {
    metadata.verificationSummary = record.verificationSummary;
  }

  return metadata;
}

function toMachineReadableFields(value: unknown): MachineReadableContractFields {
  return (toRecord(value) ?? {}) as MachineReadableContractFields;
}

function toDocumentMetadata(row: DocumentMetadataRow): DocumentMetadata {
  const metadata: DocumentMetadata = {
    documentId: row.document_id,
    ownerOrganizationId: row.owner_organization_id,
    uploadedByUserId: row.uploaded_by_user_id,
    documentType: row.document_type,
    filename: row.filename,
    mimeType: row.mime_type,
    sizeBytes: row.size_bytes,
    storageRef: row.storage_ref,
    sha256: row.sha256,
    malwareScanStatus: row.malware_scan_status,
    extractionStatus: row.extraction_status,
    signatureStatus: row.signature_status,
    createdAt: toIsoString(row.created_at),
  };

  const signatureMetadata = toSignatureMetadata(row.signature_metadata);
  if (signatureMetadata) {
    metadata.signatureMetadata = signatureMetadata;
  }

  return metadata;
}

function toDocumentExtraction(row: DocumentExtractionRow): DocumentExtractionRecord {
  const extraction: DocumentExtractionRecord = {
    documentId: row.document_id,
    status: row.status,
    extractedFields: toMachineReadableFields(row.extracted_fields),
    unmappedSections: toStringArray(row.unmapped_sections),
    warnings: toStringArray(row.warnings),
    createdAt: toIsoString(row.created_at),
  };

  if (row.language) {
    extraction.language = row.language;
  }
  if (row.extraction_confidence !== null && row.extraction_confidence !== undefined) {
    extraction.extractionConfidence = row.extraction_confidence;
  }
  if (row.extracted_text) {
    extraction.extractedText = row.extracted_text;
  }

  return extraction;
}

export class PostgresDocumentRepository implements DocumentRepository {
  constructor(private readonly db: PostgresExecutor) {}

  async saveDocument(document: DocumentMetadata): Promise<DocumentMetadata> {
    await this.db.query(
      `
        INSERT INTO document_metadata (
          document_id,
          owner_organization_id,
          uploaded_by_user_id,
          document_type,
          filename,
          mime_type,
          size_bytes,
          storage_ref,
          sha256,
          malware_scan_status,
          extraction_status,
          signature_status,
          signature_metadata,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14)
        ON CONFLICT (document_id)
        DO UPDATE SET
          owner_organization_id = EXCLUDED.owner_organization_id,
          uploaded_by_user_id = EXCLUDED.uploaded_by_user_id,
          document_type = EXCLUDED.document_type,
          filename = EXCLUDED.filename,
          mime_type = EXCLUDED.mime_type,
          size_bytes = EXCLUDED.size_bytes,
          storage_ref = EXCLUDED.storage_ref,
          sha256 = EXCLUDED.sha256,
          malware_scan_status = EXCLUDED.malware_scan_status,
          extraction_status = EXCLUDED.extraction_status,
          signature_status = EXCLUDED.signature_status,
          signature_metadata = EXCLUDED.signature_metadata,
          created_at = EXCLUDED.created_at
      `,
      [
        document.documentId,
        document.ownerOrganizationId,
        document.uploadedByUserId,
        document.documentType,
        document.filename,
        document.mimeType,
        document.sizeBytes,
        document.storageRef,
        document.sha256,
        document.malwareScanStatus,
        document.extractionStatus,
        document.signatureStatus,
        document.signatureMetadata ? JSON.stringify(document.signatureMetadata) : null,
        document.createdAt,
      ],
    );

    return {
      ...document,
      signatureMetadata: document.signatureMetadata ? { ...document.signatureMetadata } : undefined,
    };
  }

  async findDocumentById(documentId: string): Promise<DocumentMetadata | null> {
    const result = await this.db.query<DocumentMetadataRow>(
      'SELECT * FROM document_metadata WHERE document_id = $1',
      [documentId],
    );

    return result.rows[0] ? toDocumentMetadata(result.rows[0]) : null;
  }

  async saveExtraction(extraction: DocumentExtractionRecord): Promise<DocumentExtractionRecord> {
    await this.db.query(
      `
        INSERT INTO document_extractions (
          document_id,
          status,
          language,
          extraction_confidence,
          extracted_text,
          extracted_fields,
          unmapped_sections,
          warnings,
          created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, $9)
        ON CONFLICT (document_id)
        DO UPDATE SET
          status = EXCLUDED.status,
          language = EXCLUDED.language,
          extraction_confidence = EXCLUDED.extraction_confidence,
          extracted_text = EXCLUDED.extracted_text,
          extracted_fields = EXCLUDED.extracted_fields,
          unmapped_sections = EXCLUDED.unmapped_sections,
          warnings = EXCLUDED.warnings,
          created_at = EXCLUDED.created_at
      `,
      [
        extraction.documentId,
        extraction.status,
        extraction.language ?? null,
        extraction.extractionConfidence ?? null,
        extraction.extractedText ?? null,
        JSON.stringify(extraction.extractedFields),
        JSON.stringify(extraction.unmappedSections),
        JSON.stringify(extraction.warnings),
        extraction.createdAt,
      ],
    );

    return {
      ...extraction,
      extractedFields: { ...extraction.extractedFields },
      unmappedSections: [...extraction.unmappedSections],
      warnings: [...extraction.warnings],
    };
  }

  async findExtractionByDocumentId(documentId: string): Promise<DocumentExtractionRecord | null> {
    const result = await this.db.query<DocumentExtractionRow>(
      'SELECT * FROM document_extractions WHERE document_id = $1',
      [documentId],
    );

    return result.rows[0] ? toDocumentExtraction(result.rows[0]) : null;
  }
}
