import type { DocumentMetadata } from '../domain/document.js';
import type { DocumentRepository } from './document-repository.js';

export type GetDocumentInput = {
  documentId?: string;
  actorUserId?: string;
  actorOrganizationId?: string;
  actorRoleCodes?: string[];
};

export type GetDocumentResult =
  | { status: 'found'; document: DocumentMetadata }
  | { status: 'invalidInput'; issues: Array<{ path: string; message: string }> }
  | { status: 'unauthorized' }
  | { status: 'forbidden' }
  | { status: 'notFound' };

const PRIVILEGED_READ_ROLES = new Set([
  'administrator',
  'auditor',
  'regulator',
  'securityOperator',
  'complianceReviewer',
]);

function canReadDocument(input: Required<Pick<GetDocumentInput, 'actorOrganizationId' | 'actorRoleCodes'>>, document: DocumentMetadata): boolean {
  if (document.ownerOrganizationId === input.actorOrganizationId) {
    return true;
  }

  return input.actorRoleCodes.some(role => PRIVILEGED_READ_ROLES.has(role));
}

export async function getDocument(
  input: GetDocumentInput,
  dependencies: { repository: DocumentRepository },
): Promise<GetDocumentResult> {
  const documentId = input.documentId?.trim();
  if (!documentId) {
    return {
      status: 'invalidInput',
      issues: [{ path: 'documentId', message: 'Document id is required' }],
    };
  }

  if (!input.actorUserId || !input.actorOrganizationId) {
    return { status: 'unauthorized' };
  }

  const document = await dependencies.repository.findDocumentById(documentId);
  if (!document) {
    return { status: 'notFound' };
  }

  if (!canReadDocument({
    actorOrganizationId: input.actorOrganizationId,
    actorRoleCodes: input.actorRoleCodes ?? [],
  }, document)) {
    return { status: 'forbidden' };
  }

  return { status: 'found', document };
}
