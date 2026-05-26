import { createHash } from 'node:crypto';
import type { SignatureVerificationPort, VerifyDocumentSignatureInput } from '../application/signature-verification-port.js';
import type { DocumentSignatureMetadata } from '../domain/document.js';

export function createLocalDetachedSignature(documentHash: string, certificateId = 'local'): string {
  return `sha256:${createHash('sha256').update(`${documentHash}:${certificateId}`).digest('hex')}`;
}

export class LocalSignatureMetadataAdapter implements SignatureVerificationPort {
  async verify(input: VerifyDocumentSignatureInput): Promise<DocumentSignatureMetadata> {
    const signature = input.signature;
    if (!signature || !signature.signatureValue?.trim()) {
      return {
        signatureStatus: 'notProvided',
        verificationSummary: 'No detached signature metadata was supplied.',
      };
    }

    if (signature.signatureType !== 'detachedSha256') {
      return {
        signatureStatus: 'unsupported',
        signatureType: signature.signatureType,
        certificateId: signature.certificateId,
        signerName: signature.signerName,
        signedAt: signature.signedAt,
        trustModel: 'localMetadataOnly',
        verificationSummary: 'The supplied signature type is not supported by the local MVP verifier.',
      };
    }

    const certificateId = signature.certificateId?.trim() || 'local';
    const expected = createLocalDetachedSignature(input.documentHash, certificateId);
    const provided = signature.signatureValue.trim().toLowerCase();
    const verified = provided === expected;

    return {
      signatureStatus: verified ? 'verified' : 'invalid',
      signatureType: 'detachedSha256',
      certificateId,
      signerName: signature.signerName,
      signedAt: signature.signedAt,
      trustModel: 'localMetadataOnly',
      verificationSummary: verified
        ? 'Detached hash metadata matches the stored document checksum. This is not a legal e-signature validation.'
        : 'Detached hash metadata does not match the stored document checksum.',
    };
  }
}
