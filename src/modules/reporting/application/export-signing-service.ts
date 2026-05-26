import type { ExportBundleRepository } from './export-bundle-repository.js';
import type { ExportSigningPort } from './export-signing-port.js';
import type {
  ExportBundleSignature,
  ExportBundleSignatureVerificationResult,
} from '../domain/export-bundle.js';

export type ExportSigningServiceResult =
  | { status: 'signed'; signature: ExportBundleSignature }
  | { status: 'verified'; verification: ExportBundleSignatureVerificationResult }
  | { status: 'notFound' }
  | { status: 'signatureNotFound' }
  | { status: 'rejected'; reason: string };

export type ExportSigningServiceDependencies = {
  repository: ExportBundleRepository;
  signingPort: ExportSigningPort;
};

export async function signExportBundleManifest(
  bundleId: string,
  dependencies: ExportSigningServiceDependencies,
): Promise<ExportSigningServiceResult> {
  const bundle = await dependencies.repository.findById(bundleId);
  if (!bundle) {
    return { status: 'notFound' };
  }

  const signingResult = await dependencies.signingPort.signManifest({ bundle });
  if (signingResult.status === 'rejected') {
    return signingResult;
  }

  const updatedBundle = await dependencies.repository.save({
    ...bundle,
    signature: signingResult.signature,
  });

  return {
    status: 'signed',
    signature: updatedBundle.signature as ExportBundleSignature,
  };
}

export async function getExportBundleSignature(
  bundleId: string,
  dependencies: Pick<ExportSigningServiceDependencies, 'repository'>,
): Promise<ExportSigningServiceResult> {
  const bundle = await dependencies.repository.findById(bundleId);
  if (!bundle) {
    return { status: 'notFound' };
  }

  if (!bundle.signature) {
    return { status: 'signatureNotFound' };
  }

  return {
    status: 'signed',
    signature: bundle.signature,
  };
}

export async function verifyExportBundleSignature(
  bundleId: string,
  submittedManifestHash: string | undefined,
  dependencies: ExportSigningServiceDependencies,
): Promise<ExportSigningServiceResult> {
  const bundle = await dependencies.repository.findById(bundleId);
  if (!bundle) {
    return { status: 'notFound' };
  }

  if (!bundle.signature) {
    return { status: 'signatureNotFound' };
  }

  return {
    status: 'verified',
    verification: await dependencies.signingPort.verifySignature({
      bundle,
      signature: bundle.signature,
      submittedManifestHash,
    }),
  };
}
