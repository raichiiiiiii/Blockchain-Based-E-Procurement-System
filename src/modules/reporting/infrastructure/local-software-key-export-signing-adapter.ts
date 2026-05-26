import {
  createHash,
  generateKeyPairSync,
  randomUUID,
  sign,
  verify,
  type KeyObject,
} from 'node:crypto';
import type {
  ExportBundleRecord,
  ExportBundleSignature,
  ExportBundleSignatureVerificationResult,
  ExportSigningProfile,
  ExportSigningProfileStatus,
} from '../domain/export-bundle.js';
import type {
  ExportSigningPort,
  SignExportManifestInput,
  VerifyExportManifestSignatureInput,
  ExportSigningResult,
} from '../application/export-signing-port.js';
import { canonicalizeExportValue, hashExportValue } from '../application/export-canonicalization.js';

type LocalSoftwareKeyExportSigningAdapterOptions = {
  now?: () => string;
  initialStatus?: ExportSigningProfileStatus;
};

function publicKeyId(publicKeyPem: string): string {
  return `local-ed25519-${createHash('sha256').update(publicKeyPem).digest('hex').slice(0, 16)}`;
}

function signedPayloadFor(bundle: ExportBundleRecord, manifestHash: string): Record<string, string> {
  return {
    bundleId: bundle.bundleId,
    manifestHash,
    bundleHash: bundle.integrity.bundleHash,
    canonicalization: bundle.integrity.canonicalization,
  };
}

function verificationInstructionsFor(signature: ExportBundleSignature): string {
  return [
    'Verify the canonical json-stable-v1 manifest hash.',
    `Confirm the manifest hash equals ${signature.manifestHash}.`,
    `Verify the detached Ed25519 signature in ${signature.offlineVerificationPackage.signatureFileName}`,
    `with public key ${signature.offlineVerificationPackage.publicKeyFileName}.`,
    'This local software-key signature is for MVP evidence review only and is not a production KMS/HSM assertion.',
  ].join(' ');
}

export class LocalSoftwareKeyExportSigningAdapter implements ExportSigningPort {
  private privateKey: KeyObject;
  private publicKey: KeyObject;
  private profile: ExportSigningProfile;
  private readonly now: () => string;

  constructor(options: LocalSoftwareKeyExportSigningAdapterOptions = {}) {
    this.now = options.now ?? (() => new Date().toISOString());
    const keyPair = generateKeyPairSync('ed25519');
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
    this.profile = this.createProfile(options.initialStatus ?? 'active');
  }

  async getActiveProfile(): Promise<ExportSigningProfile> {
    return { ...this.profile };
  }

  async signManifest(input: SignExportManifestInput): Promise<ExportSigningResult> {
    if (this.profile.status !== 'active') {
      return {
        status: 'rejected',
        reason: 'signingProfileInactive',
      };
    }

    const signedAt = this.now();
    const manifestHash = input.bundle.integrity.manifestHash;
    const payload = signedPayloadFor(input.bundle, manifestHash);
    const canonicalPayload = canonicalizeExportValue(payload);
    const detachedSignature = sign(null, Buffer.from(canonicalPayload), this.privateKey).toString('base64');
    const publicKeyPem = this.publicKey.export({ type: 'spki', format: 'pem' }).toString();

    const signature: ExportBundleSignature = {
      signatureId: `signature-${randomUUID()}`,
      bundleId: input.bundle.bundleId,
      signingProfileId: this.profile.signingProfileId,
      algorithm: this.profile.algorithm,
      keyId: this.profile.keyId,
      keyStatus: this.profile.status,
      status: 'signed',
      manifestHash,
      bundleHash: input.bundle.integrity.bundleHash,
      signedPayloadHash: hashExportValue(payload),
      signature: detachedSignature,
      signedAt,
      publicKeyPem,
      verificationInstructions: '',
      offlineVerificationPackage: {
        manifestFileName: 'manifest.json',
        signatureFileName: `${input.bundle.bundleId}.manifest.sig`,
        publicKeyFileName: `${this.profile.keyId}.pem`,
        instructionsFileName: 'VERIFY_SIGNATURE.txt',
      },
      claimBoundary: 'localSoftwareKeyOnly',
    };

    return {
      status: 'signed',
      signature: {
        ...signature,
        verificationInstructions: verificationInstructionsFor(signature),
      },
    };
  }

  async verifySignature(input: VerifyExportManifestSignatureInput): Promise<ExportBundleSignatureVerificationResult> {
    const submittedManifestHash = input.submittedManifestHash ?? input.bundle.integrity.manifestHash;

    if (input.signature.keyStatus !== 'active') {
      return {
        bundleId: input.bundle.bundleId,
        signatureId: input.signature.signatureId,
        verificationStatus: 'keyInactive',
        manifestHash: input.signature.manifestHash,
        submittedManifestHash,
        keyId: input.signature.keyId,
        algorithm: input.signature.algorithm,
        verifiedAt: this.now(),
        reason: 'signingProfileInactive',
      };
    }

    const payload = signedPayloadFor(input.bundle, submittedManifestHash);
    const valid = verify(
      null,
      Buffer.from(canonicalizeExportValue(payload)),
      this.publicKey,
      Buffer.from(input.signature.signature, 'base64'),
    );

    return {
      bundleId: input.bundle.bundleId,
      signatureId: input.signature.signatureId,
      verificationStatus: valid ? 'verified' : 'invalid',
      manifestHash: input.signature.manifestHash,
      submittedManifestHash,
      keyId: input.signature.keyId,
      algorithm: input.signature.algorithm,
      verifiedAt: this.now(),
      reason: valid ? undefined : 'signatureMismatch',
    };
  }

  async rotateKey(now: string = this.now()): Promise<ExportSigningProfile> {
    const keyPair = generateKeyPairSync('ed25519');
    this.privateKey = keyPair.privateKey;
    this.publicKey = keyPair.publicKey;
    this.profile = this.createProfile('active', now);
    return { ...this.profile };
  }

  private createProfile(status: ExportSigningProfileStatus, rotatedAt?: string): ExportSigningProfile {
    const publicKeyPem = this.publicKey.export({ type: 'spki', format: 'pem' }).toString();
    return {
      signingProfileId: 'local-software-export-signing',
      algorithm: 'Ed25519',
      keyId: publicKeyId(publicKeyPem),
      status,
      createdAt: this.now(),
      rotatedAt,
    };
  }
}
