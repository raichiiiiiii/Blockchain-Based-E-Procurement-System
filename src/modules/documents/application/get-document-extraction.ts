import type { DocumentExtractionRecord } from '../domain/document.js';
import { getDocument, type GetDocumentInput } from './get-document.js';
import type { DocumentRepository } from './document-repository.js';

export type GetDocumentExtractionResult =
  | { status: 'found'; extraction: DocumentExtractionRecord }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' };

export async function getDocumentExtraction(
  input: GetDocumentInput,
  dependencies: { repository: DocumentRepository },
): Promise<GetDocumentExtractionResult> {
  const documentResult = await getDocument(input, dependencies);
  if (documentResult.status !== 'found') {
    return documentResult;
  }

  const extraction = await dependencies.repository.findExtractionByDocumentId(documentResult.document.documentId);
  if (!extraction) {
    return { status: 'notFound' };
  }

  return { status: 'found', extraction };
}
