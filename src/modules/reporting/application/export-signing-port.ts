import type {
  ExportBundleRecord,
  ExportBundleSignature,
  ExportBundleSignatureVerificationResult,
  ExportSigningProfile,
} from '../domain/export-bundle.js';

export type SignExportManifestInput = {
  bundle: ExportBundleRecord;
};

export type VerifyExportManifestSignatureInput = {
  bundle: ExportBundleRecord;
  signature: ExportBundleSignature;
  submittedManifestHash?: string;
};

export type ExportSigningResult =
  | { status: 'signed'; signature: ExportBundleSignature }
  | { status: 'rejected'; reason: string };

export interface ExportSigningPort {
  getActiveProfile(): Promise<ExportSigningProfile>;
  signManifest(input: SignExportManifestInput): Promise<ExportSigningResult>;
  verifySignature(input: VerifyExportManifestSignatureInput): Promise<ExportBundleSignatureVerificationResult>;
  rotateKey(now?: string): Promise<ExportSigningProfile>;
}
