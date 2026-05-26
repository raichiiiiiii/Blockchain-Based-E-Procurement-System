# Document Processing Architecture

Status: MVP foundation  
Owner: Architecture + Backend + Security  
Last updated: 2026-05-26

## Purpose

This document records the document-processing seam introduced for the production-extension roadmap. The slice supports safe local document storage, metadata capture, checksum generation, text/JSON extraction, and local signature metadata verification.

The current readiness remains: Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.

## Boundary

Document processing is implemented as ports/adapters:

- `DocumentStoragePort`
- `DocumentTextExtractionPort`
- `SignatureVerificationPort`
- `DocumentRepository`

Domain and application code do not import storage SDKs, PDF renderers, OCR libraries, database clients, or external signature-verification libraries.

## Current Adapters

| Adapter | Purpose | Boundary |
| --- | --- | --- |
| `LocalDocumentStorageAdapter` | Stores uploaded bytes under a local operator-controlled folder and returns an opaque `local-documents://` reference | Not production object storage |
| `InMemoryDocumentStorageAdapter` | Fast tests without filesystem dependency | Test/demo only |
| `LocalDocumentTextExtractionAdapter` | Extracts text/plain and JSON content into candidate machine-readable fields | No OCR, no PDF/DOCX parsing |
| `LocalSignatureMetadataAdapter` | Verifies local detached SHA-256 metadata against stored checksum | Not legal signature validation |
| `InMemoryDocumentRepository` | Stores metadata and extraction records for the MVP foundation | Runtime persistence hardening remains future work |

## Data Flow

1. Authenticated actor submits a document payload to `POST /api/v1/documents`.
2. API route derives actor identity from trusted session context.
3. Application validates document type, MIME type, content shape, actor role, and size.
4. Storage port writes bytes and returns size, storage reference, and SHA-256 checksum.
5. Signature port verifies optional signature metadata.
6. Extraction port extracts text/JSON or marks binary extraction as `unsupported`.
7. Repository stores metadata and extraction output.
8. GET routes return metadata/extraction only; raw content is not returned.

## Security and Privacy Rules

- Raw document content is not returned from document APIs.
- Raw documents are not written on-chain.
- Storage references are opaque and must not expose host file paths.
- Signature metadata is explicitly local-only unless a future trust-store adapter is implemented.
- PDF/DOCX extraction is explicit `unsupported` rather than silently pretending success.
- Malware scanning is `notScanned` until a production scanning adapter exists.

## Standards Mapping

The MVP extraction schema is influenced by external standards but does not replace the internal domain model.

- OCDS: candidate contract fields can later map to release, parties, contract, implementation, and document blocks.
- UBL/Peppol: order, order response, despatch advice, invoice, invoice response, and attached document profiles inform future import/export adapters.
- EPCIS: future delivery proof adapters may link document references to visibility events and delivery evidence records.

Official references used:

- [Open Contracting Data Standard](https://www.open-contracting.org/data-standard/)
- [OCDS release reference](https://standard.open-contracting.org/latest/en/schema/reference/)
- [OASIS UBL 2.1](https://docs.oasis-open.org/ubl/UBL-2.1.html)
- [Peppol BIS documentation](https://docs.peppol.eu/poacc/upgrade-3/rules/)
- [GS1 EPCIS 2.0](https://ref.gs1.org/standards/epcis/2.0.0/)

## Future Production Adapters

Future phases can add:

- S3/MinIO-compatible object storage adapter
- antivirus/malware scanning adapter
- PDF text extraction adapter
- DOCX text extraction adapter
- OCR adapter
- signature verification adapter with trust-store policy
- document retention and deletion policy
- PostgreSQL document repository
- document-to-OCDS and document-to-UBL/Peppol mapping jobs

## Open Limitations

- No production object storage.
- No document preview renderer.
- No OCR.
- No full PDF/DOCX extraction.
- No malware scanner.
- No legal e-signature or certificate-chain validation.
- No production retention policy.
- No on-chain raw document storage.
