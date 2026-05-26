import type { DocumentExtractionRecord, DocumentMetadata } from '../domain/document.js';

export interface DocumentRepository {
  saveDocument(document: DocumentMetadata): Promise<DocumentMetadata>;
  findDocumentById(documentId: string): Promise<DocumentMetadata | null>;
  saveExtraction(extraction: DocumentExtractionRecord): Promise<DocumentExtractionRecord>;
  findExtractionByDocumentId(documentId: string): Promise<DocumentExtractionRecord | null>;
}
