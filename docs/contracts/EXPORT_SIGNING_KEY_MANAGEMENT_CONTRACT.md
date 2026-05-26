# Export Signing and Key Management Contract

Status: production-extension pilot-hardening reference
Owner: Security Engineer / Backend Engineer
Related PBIs: PBI-448, PBI-406, PBI-412
Related requirements: R15, R22, R24

## 1. Purpose

This contract defines how the platform signs export bundle manifests for offline integrity review.

The first implementation uses a local software-key adapter and detached Ed25519 signature metadata. It does not provide production KMS/HSM custody, regulator portal integration, legal attestation, or production export certification.

## 2. In Scope

- Export signing profile model.
- Export signing port and local software-key adapter.
- Detached signature over the export bundle manifest hash.
- Offline verification package metadata.
- API routes to sign, retrieve, and verify a bundle signature.
- UI signature panel for regulator/auditor review.

## 3. Out of Scope

- production KMS or HSM key custody.
- external regulator portal submission.
- production certificate authority lifecycle.
- legal attestation or digital-signature compliance certification.
- raw export document signing or raw commercial document exposure.
- private-key export through API or UI.

## 4. Signing Profile

An export signing profile records:

- `signingProfileId`
- `algorithm`
- `keyId`
- `status`
- `createdAt`
- `rotatedAt`

Allowed profile statuses:

- `active`
- `rotated`
- `revoked`

Only an active profile may sign a manifest.

## 5. Signature Record

An export bundle signature records:

- `signatureId`
- `bundleId`
- `manifestHash`
- `bundleHash`
- `algorithm`
- `keyId`
- `keyStatus`
- `signature`
- `signedAt`
- `canonicalization`
- `offlineVerificationPackage`
- `status`

The detached signature covers the canonical signing payload:

```json
{
  "bundleId": "<bundle id>",
  "manifestHash": "<manifest hash>",
  "bundleHash": "<bundle hash>",
  "canonicalization": "json-stable-sha256"
}
```

## 6. Offline Verification Package

The offline package metadata includes:

- `manifest.json`
- `<bundleId>.manifest.sig`
- `<keyId>.pem`
- `VERIFY_SIGNATURE.txt`

The API returns package metadata and public key material only. It must never return a private key.

## 7. Application Port

```ts
export type ExportSigningPort = {
  getActiveProfile(): Promise<ExportSigningProfile>;
  signManifest(input: ExportSigningInput): Promise<ExportSigningResult>;
  verifySignature(input: ExportSignatureVerificationInput): Promise<ExportBundleSignatureVerificationResult>;
  rotateKey(reason: string): Promise<ExportSigningProfile>;
};
```

The local adapter uses Node.js cryptography and Ed25519 keys generated in process for local demo/pilot-hardening use.

Future adapters may bind this port to KMS/HSM custody after production key-management policy is approved.

## 8. API Routes

All routes require authenticated export-bundle access according to the reporting route authorization policy.

```text
POST /api/v1/export-bundles/:bundleId/sign
GET /api/v1/export-bundles/:bundleId/signature
POST /api/v1/export-bundles/:bundleId/verify-signature
```

Verification accepts an optional submitted `manifestHash` so reviewers can verify the stored signature against a supplied manifest hash. A mismatch returns `invalid`.

## 9. Verification States

- `verified`: signature and manifest hash match.
- `invalid`: signature, bundle hash, or submitted manifest hash does not match.
- `notFound`: bundle or signature is missing.
- `unavailable`: signing service cannot verify.
- `keyInactive`: signature key is no longer active.

The UI must not display an invalid, missing, or unavailable signature as verified.

## 10. Claim Boundary

Product and evidence wording may say:

- detached export manifest signature.
- local software-key signing profile.
- offline integrity verification package.
- future KMS/HSM adapter seam.

Product and evidence wording must not say:

- production regulator submission is implemented.
- production KMS/HSM is implemented.
- external legal signature validation is implemented.
- export package is legally certified.
- private keys are available for download.
