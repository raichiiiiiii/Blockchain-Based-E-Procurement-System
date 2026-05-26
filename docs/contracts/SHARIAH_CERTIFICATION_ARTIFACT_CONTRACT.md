# Shariah Certification Artifact Contract

Status: production-extension pilot-hardening reference
Owner: Shariah Compliance Lead / Backend Engineer
Related PBIs: PBI-447, PBI-393, PBI-405
Related requirements: R07, R20, R22

## 1. Purpose

This contract defines internal Shariah certificate artifact tracking for restricted PLS seedbed templates.

The platform records certificate metadata, coverage scope, conditions, expiry, revocation, and a certificate hash. It does not issue external certification, replace a Shariah board, provide legal attestation, or claim formal Islamic finance certification.

## 2. In Scope

- certificate artifact registry.
- certificate hash generation.
- active, expired, and revoked states.
- certificate coverage check for PLS template version.
- PLS activation block when certificate coverage is missing or invalid.
- frontend visibility for Shariah reviewer and financier workflows.

## 3. Out of Scope

- external fatwa issuance automation.
- legal certification authority integration.
- formal Shariah board workflow outside the application.
- document signing or legal signature validation.
- production Islamic finance product certification.
- payment execution or guaranteed principal/profit claims.

## 4. Certificate Artifact Model

```json
{
  "certificateId": "shariah-certificate-mudarabah-v1",
  "issuedBy": "MVP Shariah Governance Board",
  "reviewerBoard": "Restricted PLS Seedbed Review Panel",
  "fatwaReference": "FATWA-MVP-PLS-001",
  "scope": "restricted-pls-seedbed",
  "contractTemplateVersion": "mudarabah-procurement-v1",
  "conditions": [
    "Simulation-only PLS distribution records",
    "No guaranteed profit or principal",
    "No external payment execution"
  ],
  "issuedAt": "2026-05-20T00:00:00.000Z",
  "expiresAt": "2027-05-20T00:00:00.000Z",
  "status": "active",
  "certificateDocumentId": "doc-shariah-certificate-demo",
  "certificateHash": "sha256:...",
  "createdByUserId": "demo-shariah-user",
  "createdAt": "2026-05-20T00:00:00.000Z"
}
```

Allowed statuses:

- `active`
- `expired`
- `revoked`

Expiry may be stored as status or computed during activation coverage checks from `expiresAt`.

## 5. API Routes

```text
GET /api/v1/shariah/certificates
POST /api/v1/shariah/certificates
GET /api/v1/shariah/certificates/:certificateId
POST /api/v1/shariah/certificates/:certificateId/revoke
```

Write access is limited to Shariah governance users and administrators.

Read access is allowed for Shariah reviewers, financiers, auditors, regulators, and administrators.

## 6. PLS Activation Gate

`POST /api/v1/financing/pls-contracts/:contractId/activate` accepts:

```json
{
  "shariahReviewId": "review-demo-approved",
  "shariahCertificateId": "shariah-certificate-mudarabah-v1"
}
```

Activation is blocked unless:

- the referenced Shariah review exists and is approved.
- all contract parties remain eligible.
- the referenced certificate exists.
- the certificate is active.
- the certificate has not expired.
- the certificate `contractTemplateVersion` matches the PLS contract template version.

Blocked activation returns `CONFLICT` with a reason such as:

- `missing`
- `notFound`
- `inactive`
- `expired`
- `templateMismatch`

## 7. Claim Boundary

Product and evidence wording may say:

- certificate artifact.
- Shariah governance reference.
- active certificate coverage.
- restricted PLS seedbed template.

Product and evidence wording must not say:

- externally certified Islamic finance product.
- formal Shariah certification has been issued by the platform.
- legal certification authority validation.
- guaranteed profit or principal.
- production payment execution.
