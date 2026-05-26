# Document Upload and Extraction Contract

Status: MVP foundation  
Owner: Backend + Frontend + QA  
Last updated: 2026-05-26

## Purpose

This contract defines the first document-processing boundary for the Digital Procurement and PLS Seedbed MVP. It supports safe document metadata intake, checksum generation, local storage, text/JSON extraction, machine-readable field extraction, and local signature metadata verification.

This is not production document management, legal e-signature validation, OCR, PDF rendering, malware scanning, or external trust-store certification.

## External Standards Reference

The implementation treats public standards as adapter/input-output references rather than replacements for the internal domain model.

- Open Contracting Data Standard: public contracting data is modeled across planning, tender, award, contract, and implementation stages, with JSON Schema as the canonical technical reference. Source: [OCDS data standard](https://www.open-contracting.org/data-standard/) and [OCDS release reference](https://standard.open-contracting.org/latest/en/schema/reference/).
- OASIS UBL 2.1: UBL defines procurement document schemas including Order, Order Response, Despatch Advice, Receipt Advice, Invoice, and digital-signature extension profiles. Source: [OASIS UBL 2.1](https://docs.oasis-open.org/ubl/UBL-2.1.html).
- Peppol BIS: Peppol post-award profiles provide ordering, order response, despatch advice, invoice response, and billing implementation guidance. Source: [Peppol BIS documentation](https://docs.peppol.eu/poacc/upgrade-3/rules/).
- GS1 EPCIS 2.0: EPCIS supports visibility-event capture/query over REST resources and requires client authentication for API calls. Source: [GS1 EPCIS 2.0 standard](https://ref.gs1.org/standards/epcis/2.0.0/).

## API Routes

Base path: `/api/v1`

### POST /documents

Purpose:
- Store a document through the configured storage port.
- Record document metadata, checksum, extraction status, and signature status.
- Extract safe text/JSON fields where the local extractor supports the content type.

Request:

```json
{
  "documentType": "contract",
  "filename": "amanah-barakah-contract.txt",
  "mimeType": "text/plain",
  "textContent": "Contract Title: Amanah Retail Supply Agreement\nBuyer: Amanah Retail Sdn Bhd",
  "signature": {
    "signatureType": "detachedSha256",
    "signatureValue": "sha256:...",
    "certificateId": "cert-local-1",
    "signerName": "Amanah Retail operations lead",
    "signedAt": "2026-05-26T08:00:00.000Z"
  }
}
```

Either `textContent` or `contentBase64` may be supplied. Both together are rejected.

Supported `documentType` values:
- `contract`
- `purchaseOrder`
- `deliveryProof`
- `invoice`
- `exportBundle`
- `shariahCertificate`
- `other`

Supported MVP MIME types:
- `text/plain`
- `application/json`
- `application/pdf`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

PDF and DOCX files can be stored, but extraction is returned as `unsupported` until a production extractor adapter is connected.

Response:

```json
{
  "data": {
    "documentId": "document_...",
    "ownerOrganizationId": "buyer-org",
    "uploadedByUserId": "buyer-user",
    "documentType": "contract",
    "filename": "amanah-barakah-contract.txt",
    "mimeType": "text/plain",
    "sizeBytes": 1024,
    "storageRef": "local-documents://document_.../amanah-barakah-contract.txt",
    "sha256": "sha256:...",
    "malwareScanStatus": "notScanned",
    "extractionStatus": "extracted",
    "signatureStatus": "notProvided",
    "createdAt": "2026-05-26T00:00:00.000Z"
  }
}
```

Rules:
- Protected route; bearer session is required.
- Actor identity is derived from server-side session context.
- Write access is limited to administrator, buyer, supplier, compliance reviewer, Shariah reviewer, and financier roles.
- Raw document content is not returned in API responses.
- Raw document content is never written on-chain.
- Malware scanning is explicit as `notScanned` in this MVP.

### GET /documents/:documentId

Purpose:
- Return document metadata without raw content.

Read access:
- Owner organization members can read their document metadata.
- Administrator, auditor, regulator, security operator, and compliance reviewer roles can read metadata for review.

### GET /documents/:documentId/extraction

Purpose:
- Return extraction output and machine-readable field candidates.

Response:

```json
{
  "data": {
    "documentId": "document_...",
    "status": "extracted",
    "language": "en",
    "extractionConfidence": 0.82,
    "extractedText": "Contract Title: ...",
    "extractedFields": {
      "parties": {
        "buyer": "Amanah Retail Sdn Bhd",
        "supplier": "Barakah Supplies Sdn Bhd"
      },
      "contractTitle": "Amanah Retail Supply Agreement",
      "effectiveDate": "2026-05-26"
    },
    "unmappedSections": [],
    "warnings": [],
    "createdAt": "2026-05-26T00:00:00.000Z"
  }
}
```

## Machine-Readable Contract Field Candidates

The local extractor can identify candidate fields for:

- parties
- registration numbers
- contract title
- effective date
- expiry date
- goods/services
- quantities
- price/currency
- delivery terms
- payment terms
- escrow terms
- dispute clause
- governing law
- signatures
- attachments
- clause references

These fields are extraction output only. They do not replace the internal contract domain model planned for the later contract negotiation phase.

## Signature States

Allowed `signatureStatus` values:

- `notProvided`
- `pending`
- `verified`
- `invalid`
- `unsupported`

The MVP local verifier supports `detachedSha256` metadata only. A `verified` result means the detached hash metadata matches the stored document checksum under the local metadata rule. It does not mean legal e-signature validation, external certificate-chain validation, or formal certification.

## Error Semantics

All errors use the shared API error envelope from `docs/contracts/API_CONTRACTS.md`.

Expected errors:
- `UNAUTHORIZED`: missing or invalid bearer session
- `FORBIDDEN`: role or organization cannot access the resource
- `VALIDATION_ERROR`: invalid document type, MIME type, missing content, oversized content, or invalid request
- `NOT_FOUND`: document or extraction record is missing

## Privacy and Proof Rules

- Raw documents stay off-chain.
- Only checksums, metadata, proof references, or future manifest hashes may be anchored.
- Raw KYC, commercial documents, delivery images, payment credentials, and unrestricted contract text must not be written to Fabric.
- Unsupported extraction, missing signatures, and invalid signatures must remain visibly distinct from verified states.
