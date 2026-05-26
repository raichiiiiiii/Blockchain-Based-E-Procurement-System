import type { DocumentSignatureInput, DocumentSignatureMetadata } from '../domain/document.js';

export type VerifyDocumentSignatureInput = {
  documentHash: string;
  signature?: DocumentSignatureInput;
};

export interface SignatureVerificationPort {
  verify(input: VerifyDocumentSignatureInput): Promise<DocumentSignatureMetadata>;
}
