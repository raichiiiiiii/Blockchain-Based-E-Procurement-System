import type { DocumentExtractionRecord } from '../domain/document.js';

export type ExtractDocumentTextInput = {
  documentId: string;
  filename: string;
  mimeType: string;
  bytes: Uint8Array;
  createdAt: string;
};

export interface DocumentTextExtractionPort {
  extract(input: ExtractDocumentTextInput): Promise<DocumentExtractionRecord>;
}
