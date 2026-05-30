import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { QueryResultRow } from 'pg';
import type { PostgresExecutor } from '../../../infrastructure/database/postgres-client.js';
import type { DocumentExtractionRecord, DocumentMetadata } from '../domain/document.js';
import { PostgresDocumentRepository } from './postgres-document-repository.js';

type CapturedQuery = {
  text: string;
  values?: readonly unknown[];
};

class FakePostgresExecutor implements PostgresExecutor {
  readonly queries: CapturedQuery[] = [];

  constructor(private readonly responses: QueryResultRow[][]) {}

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values?: readonly unknown[],
  ) {
    this.queries.push({ text, values });
    const rows = (this.responses.shift() ?? []) as T[];
    return {
      rows,
      rowCount: rows.length,
      command: 'SELECT',
      oid: 0,
      fields: [],
    };
  }
}

const document: DocumentMetadata = {
  documentId: 'document-contract-demo',
  ownerOrganizationId: 'demo-buyer-org',
  uploadedByUserId: 'demo-buyer-user',
  documentType: 'contract',
  filename: 'amanah-barakah-contract.txt',
  mimeType: 'text/plain',
  sizeBytes: 512,
  storageRef: 'local-documents://document-contract-demo/amanah-barakah-contract.txt',
  sha256: 'sha256:document-contract-hash',
  malwareScanStatus: 'notScanned',
  extractionStatus: 'extracted',
  signatureStatus: 'verified',
  signatureMetadata: {
    signatureStatus: 'verified',
    signatureType: 'detachedSha256',
    certificateId: 'cert-local-1',
    signerName: 'Amanah Retail operations lead',
    signedAt: '2026-05-26T08:00:00.000Z',
    trustModel: 'localMetadataOnly',
    verificationSummary: 'Local detached hash metadata matches. This is not a legal e-signature validation.',
  },
  createdAt: '2026-05-30T12:00:00.000Z',
};

const documentRow = {
  document_id: document.documentId,
  owner_organization_id: document.ownerOrganizationId,
  uploaded_by_user_id: document.uploadedByUserId,
  document_type: document.documentType,
  filename: document.filename,
  mime_type: document.mimeType,
  size_bytes: document.sizeBytes,
  storage_ref: document.storageRef,
  sha256: document.sha256,
  malware_scan_status: document.malwareScanStatus,
  extraction_status: document.extractionStatus,
  signature_status: document.signatureStatus,
  signature_metadata: document.signatureMetadata,
  created_at: new Date(document.createdAt),
};

const extraction: DocumentExtractionRecord = {
  documentId: document.documentId,
  status: 'extracted',
  language: 'en',
  extractionConfidence: 0.82,
  extractedText: 'Contract Title: Amanah Retail Supply Agreement',
  extractedFields: {
    parties: {
      buyer: 'Amanah Retail Sdn Bhd',
      supplier: 'Barakah Supplies Sdn Bhd',
    },
    contractTitle: 'Amanah Retail Supply Agreement',
  },
  unmappedSections: [],
  warnings: ['MVP extraction candidate only'],
  createdAt: '2026-05-30T12:00:00.000Z',
};

const extractionRow = {
  document_id: extraction.documentId,
  status: extraction.status,
  language: extraction.language,
  extraction_confidence: extraction.extractionConfidence,
  extracted_text: extraction.extractedText,
  extracted_fields: extraction.extractedFields,
  unmapped_sections: extraction.unmappedSections,
  warnings: extraction.warnings,
  created_at: new Date(extraction.createdAt),
};

test('PostgresDocumentRepository saves document metadata without raw document payloads', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresDocumentRepository(db);

  await repository.saveDocument(document);

  assert.match(db.queries[0].text, /INSERT INTO document_metadata/);
  assert.strictEqual(db.queries[0].values?.[0], document.documentId);
  assert.strictEqual(db.queries[0].values?.[7], document.storageRef);
  assert.strictEqual(db.queries[0].values?.[8], document.sha256);
  assert.strictEqual(db.queries[0].values?.[12], JSON.stringify(document.signatureMetadata));
});

test('PostgresDocumentRepository maps document metadata for authorization reads', async () => {
  const db = new FakePostgresExecutor([[documentRow]]);
  const repository = new PostgresDocumentRepository(db);

  const found = await repository.findDocumentById(document.documentId);

  assert.strictEqual(found?.documentId, document.documentId);
  assert.strictEqual(found?.createdAt, document.createdAt);
  assert.strictEqual(found?.signatureMetadata?.trustModel, 'localMetadataOnly');
  assert.match(db.queries[0].text, /WHERE document_id = \$1/);
});

test('PostgresDocumentRepository saves extraction JSON and candidate text', async () => {
  const db = new FakePostgresExecutor([]);
  const repository = new PostgresDocumentRepository(db);

  await repository.saveExtraction(extraction);

  assert.match(db.queries[0].text, /INSERT INTO document_extractions/);
  assert.strictEqual(db.queries[0].values?.[0], extraction.documentId);
  assert.strictEqual(db.queries[0].values?.[4], extraction.extractedText);
  assert.strictEqual(db.queries[0].values?.[5], JSON.stringify(extraction.extractedFields));
});

test('PostgresDocumentRepository maps extraction records', async () => {
  const db = new FakePostgresExecutor([[extractionRow]]);
  const repository = new PostgresDocumentRepository(db);

  const found = await repository.findExtractionByDocumentId(document.documentId);

  assert.strictEqual(found?.documentId, extraction.documentId);
  assert.strictEqual(found?.status, 'extracted');
  assert.strictEqual(found?.extractionConfidence, 0.82);
  assert.strictEqual(found?.extractedFields.parties?.buyer, 'Amanah Retail Sdn Bhd');
  assert.deepStrictEqual(found?.warnings, extraction.warnings);
});

test('PostgresDocumentRepository returns null for missing metadata and extraction rows', async () => {
  const db = new FakePostgresExecutor([[], []]);
  const repository = new PostgresDocumentRepository(db);

  const metadata = await repository.findDocumentById('missing-document');
  const extractionResult = await repository.findExtractionByDocumentId('missing-document');

  assert.strictEqual(metadata, null);
  assert.strictEqual(extractionResult, null);
});
