import { createSessionHeaders } from './auth-headers';
import { requestJson } from './http-client';
import type { AuthenticatedFrontendSession } from '../lib/session-state';
import type {
  DocumentExtractionRecord,
  DocumentMetadata,
  UploadDocumentRequest,
} from '../types/document';

export async function uploadDocument(
  payload: UploadDocumentRequest,
  session?: AuthenticatedFrontendSession,
): Promise<DocumentMetadata> {
  return requestJson<DocumentMetadata>('/api/v1/documents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...createSessionHeaders(session),
    },
    body: JSON.stringify(payload),
  });
}

export async function getDocumentExtraction(
  documentId: string,
  session?: AuthenticatedFrontendSession,
): Promise<DocumentExtractionRecord> {
  return requestJson<DocumentExtractionRecord>(
    `/api/v1/documents/${encodeURIComponent(documentId)}/extraction`,
    {
      headers: createSessionHeaders(session),
    },
  );
}
