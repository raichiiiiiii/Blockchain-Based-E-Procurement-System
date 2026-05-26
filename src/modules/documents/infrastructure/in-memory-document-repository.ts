import type { DocumentRepository } from '../application/document-repository.js';
import type { DocumentExtractionRecord, DocumentMetadata } from '../domain/document.js';

export class InMemoryDocumentRepository implements DocumentRepository {
  private readonly documents = new Map<string, DocumentMetadata>();
  private readonly extractions = new Map<string, DocumentExtractionRecord>();

  async saveDocument(document: DocumentMetadata): Promise<DocumentMetadata> {
    this.documents.set(document.documentId, { ...document });
    return { ...document };
  }

  async findDocumentById(documentId: string): Promise<DocumentMetadata | null> {
    const document = this.documents.get(documentId);
    return document ? { ...document } : null;
  }

  async saveExtraction(extraction: DocumentExtractionRecord): Promise<DocumentExtractionRecord> {
    this.extractions.set(extraction.documentId, {
      ...extraction,
      extractedFields: { ...extraction.extractedFields },
      unmappedSections: [...extraction.unmappedSections],
      warnings: [...extraction.warnings],
    });
    return extraction;
  }

  async findExtractionByDocumentId(documentId: string): Promise<DocumentExtractionRecord | null> {
    const extraction = this.extractions.get(documentId);
    return extraction
      ? {
        ...extraction,
        extractedFields: { ...extraction.extractedFields },
        unmappedSections: [...extraction.unmappedSections],
        warnings: [...extraction.warnings],
      }
      : null;
  }
}
