import { randomUUID } from 'node:crypto';
import type { DocumentStoragePort } from './document-storage-port.js';
import type { DocumentRepository } from './document-repository.js';
import type { DocumentTextExtractionPort } from './document-text-extraction-port.js';
import type { SignatureVerificationPort } from './signature-verification-port.js';
import {
  isDocumentType,
  type DocumentMetadata,
  type DocumentSignatureInput,
  type DocumentType,
} from '../domain/document.js';

export type UploadDocumentInput = {
  documentType?: string;
  filename?: string;
  mimeType?: string;
  contentBase64?: string;
  textContent?: string;
  signature?: DocumentSignatureInput;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type DocumentValidationIssue = {
  path: string;
  message: string;
};

export type UploadDocumentResult =
  | { status: 'uploaded'; document: DocumentMetadata }
  | { status: 'invalidInput'; issues: DocumentValidationIssue[] }
  | { status: 'unauthorized' }
  | { status: 'forbidden' };

export type UploadDocumentDependencies = {
  repository: DocumentRepository;
  storage: DocumentStoragePort;
  extractor: DocumentTextExtractionPort;
  signatureVerifier: SignatureVerificationPort;
  now?: () => string;
  idGenerator?: () => string;
  maxSizeBytes?: number;
};

const DEFAULT_MAX_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  'text/plain',
  'application/json',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);
const WRITE_ROLES = new Set([
  'administrator',
  'buyer',
  'supplier',
  'complianceReviewer',
  'shariahReviewer',
  'financier',
]);

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function decodeContent(input: UploadDocumentInput): { bytes?: Uint8Array; issues: DocumentValidationIssue[] } {
  const issues: DocumentValidationIssue[] = [];
  const contentBase64 = trimOptional(input.contentBase64);
  const textContent = input.textContent;

  if (!contentBase64 && (textContent === undefined || textContent.length === 0)) {
    return {
      issues: [{ path: 'contentBase64', message: 'Document content is required' }],
    };
  }

  if (contentBase64 && textContent !== undefined && textContent.length > 0) {
    issues.push({ path: 'contentBase64', message: 'Provide either contentBase64 or textContent, not both' });
  }

  if (contentBase64) {
    try {
      return {
        issues,
        bytes: Buffer.from(contentBase64, 'base64'),
      };
    } catch {
      return {
        issues: [...issues, { path: 'contentBase64', message: 'Document content must be valid base64' }],
      };
    }
  }

  return {
    issues,
    bytes: Buffer.from(textContent ?? '', 'utf8'),
  };
}

function normalize(input: UploadDocumentInput, maxSizeBytes: number): {
  normalized?: {
    documentType: DocumentType;
    filename: string;
    mimeType: string;
    bytes: Uint8Array;
    actorUserId: string;
    actorOrganizationId: string;
    actorRoleCodes: string[];
  };
  issues: DocumentValidationIssue[];
} {
  const issues: DocumentValidationIssue[] = [];
  const documentType = trimOptional(input.documentType);
  const filename = trimOptional(input.filename);
  const mimeType = trimOptional(input.mimeType);
  const actorUserId = trimOptional(input.actorUserId);
  const actorOrganizationId = trimOptional(input.actorOrganizationId);
  const decoded = decodeContent(input);

  issues.push(...decoded.issues);

  if (!documentType) {
    issues.push({ path: 'documentType', message: 'Document type is required' });
  } else if (!isDocumentType(documentType)) {
    issues.push({ path: 'documentType', message: 'Document type is not supported' });
  }

  if (!filename) {
    issues.push({ path: 'filename', message: 'Filename is required' });
  }

  if (!mimeType) {
    issues.push({ path: 'mimeType', message: 'MIME type is required' });
  } else if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    issues.push({ path: 'mimeType', message: 'MIME type is not supported by the MVP document gateway' });
  }

  if (!actorUserId || !actorOrganizationId) {
    issues.push({ path: 'actorContext', message: 'Authenticated actor context is required' });
  }

  if (decoded.bytes && decoded.bytes.byteLength === 0) {
    issues.push({ path: 'contentBase64', message: 'Document content must not be empty' });
  }

  if (decoded.bytes && decoded.bytes.byteLength > maxSizeBytes) {
    issues.push({
      path: 'contentBase64',
      message: `Document content must not exceed ${maxSizeBytes} bytes`,
    });
  }

  if (issues.length > 0) {
    return { issues };
  }

  return {
    issues: [],
    normalized: {
      documentType: documentType as DocumentType,
      filename: filename as string,
      mimeType: mimeType as string,
      bytes: decoded.bytes as Uint8Array,
      actorUserId: actorUserId as string,
      actorOrganizationId: actorOrganizationId as string,
      actorRoleCodes: input.actorRoleCodes ?? [],
    },
  };
}

export async function uploadDocument(
  input: UploadDocumentInput,
  dependencies: UploadDocumentDependencies,
): Promise<UploadDocumentResult> {
  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  const actorRoles = input.actorRoleCodes ?? [];
  if (!actorRoles.some(role => WRITE_ROLES.has(role))) {
    return { status: 'forbidden' };
  }

  const maxSizeBytes = dependencies.maxSizeBytes ?? DEFAULT_MAX_SIZE_BYTES;
  const { normalized, issues } = normalize(input, maxSizeBytes);
  if (!normalized) {
    return { status: 'invalidInput', issues };
  }

  const documentId = dependencies.idGenerator?.() ?? `document_${randomUUID()}`;
  const createdAt = dependencies.now?.() ?? new Date().toISOString();
  const stored = await dependencies.storage.store({
    documentId,
    filename: normalized.filename,
    mimeType: normalized.mimeType,
    bytes: normalized.bytes,
  });
  const signatureMetadata = await dependencies.signatureVerifier.verify({
    documentHash: stored.sha256,
    signature: input.signature,
  });
  const extraction = await dependencies.extractor.extract({
    documentId,
    filename: normalized.filename,
    mimeType: normalized.mimeType,
    bytes: normalized.bytes,
    createdAt,
  });

  const document: DocumentMetadata = {
    documentId,
    ownerOrganizationId: normalized.actorOrganizationId,
    uploadedByUserId: normalized.actorUserId,
    documentType: normalized.documentType,
    filename: normalized.filename,
    mimeType: normalized.mimeType,
    sizeBytes: stored.sizeBytes,
    storageRef: stored.storageRef,
    sha256: stored.sha256,
    malwareScanStatus: 'notScanned',
    extractionStatus: extraction.status,
    signatureStatus: signatureMetadata.signatureStatus,
    signatureMetadata,
    createdAt,
  };

  const savedDocument = await dependencies.repository.saveDocument(document);
  await dependencies.repository.saveExtraction(extraction);

  return {
    status: 'uploaded',
    document: savedDocument,
  };
}
