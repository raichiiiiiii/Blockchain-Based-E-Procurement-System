# PBI-445/PBI-446 Document Extraction and Signature Validation

Date: 2026-05-26

Branch: `feature/PBI-445-446-document-extraction-signatures`

Commit inspected before change: `84a5f36`

## Scope

This phase adds the first document-processing foundation:

- document metadata upload
- local storage port and adapters
- checksum generation
- text/JSON extraction into machine-readable candidate fields
- explicit unsupported states for PDF/DOCX binary extraction
- local detached SHA-256 signature metadata verification
- protected document metadata and extraction APIs
- frontend Contract Documents panel

This is not production object storage, OCR, PDF/DOCX extraction, malware scanning, legal e-signature validation, or formal Shariah certification.

## Files Changed

- `.env.example`
- `.gitignore`
- `backlog/production-extension-roadmap.csv`
- `docs/architecture/DOCUMENT_PROCESSING_ARCHITECTURE.md`
- `docs/contracts/DOCUMENT_UPLOAD_EXTRACTION_CONTRACT.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/supervisor-demo-script.md`
- `src/app/server.ts`
- `src/modules/documents/**`
- `src/frontend/App.tsx`
- `src/frontend/api/documents.ts`
- `src/frontend/components/layout/AppLayout.tsx`
- `src/frontend/lib/role-navigation.ts`
- `src/frontend/pages/DocumentWorkspacePage.tsx`
- `src/frontend/types/document.ts`

## API Routes Added

- `POST /api/v1/documents`
- `GET /api/v1/documents/:documentId`
- `GET /api/v1/documents/:documentId/extraction`

## Authorization Behavior

- All document routes require authenticated bearer session context.
- Uploads are allowed for administrator, buyer, supplier, compliance reviewer, Shariah reviewer, and financier roles.
- Owner organization users can read their document metadata and extraction output.
- Administrator, auditor, regulator, security operator, and compliance reviewer roles can read document metadata/extraction for review.
- Unrelated buyer access is rejected with `FORBIDDEN`.
- Anonymous access is rejected with `UNAUTHORIZED`.

## Extraction Behavior

- `text/plain` extraction reads safe text and extracts candidate machine-readable contract fields.
- `application/json` extraction records JSON keys as MVP metadata.
- PDF and DOCX uploads are stored, but extraction is explicitly `unsupported`.
- Extraction output is not treated as the final contract domain model.

## Signature Behavior

- Signature statuses are explicit: `notProvided`, `verified`, `invalid`, or `unsupported`.
- The local verifier supports `detachedSha256` metadata only.
- A `verified` state means local detached hash metadata matches the stored document checksum.
- This does not claim legal e-signature validation or certificate-chain trust.

## Privacy and Proof Behavior

- Raw document content is not returned in API responses.
- Raw document content is not written on-chain.
- Storage references are opaque `local-documents://` or `memory-documents://` values.
- Malware scanning remains `notScanned` until a production scanner adapter exists.

## Validation Results

| Command | Result |
| --- | --- |
| `node --loader ts-node/esm --test src/modules/documents/api/document.routes.test.ts` | Passed: 6 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm test` | Passed: 717 tests, 0 failures |
| `npm run db:migrate -- --dry-run` | Passed: validated migrations 001 through 005 |
| `npm run db:seed -- --dry-run` | Passed: validated 9 demo accounts and seeded MVP records |
| `docker compose config` | Passed |
| `docker compose -f docker-compose.app.yml config` | Passed |
| Python CSV validation for `backlog/backlog.csv` and `backlog/production-extension-roadmap.csv` | Passed: no duplicate PBI IDs |
| `rg "PBI|Sprint|Backlog|Roadmap|User stories|implementation slice|feature lane" src/frontend` | Passed: no product-source matches |
| `git diff --check` | Passed with line-ending normalization warnings only |

## Browser Smoke

Browser path: in-app browser on `http://127.0.0.1:5173`.

Result: Passed for the document workspace interaction path.

Flow exercised:

1. Opened `/login`.
2. Confirmed credential-only login form rendered with "Use issued credentials to access your workspace."
3. Signed in as `buyer.demo` with the documented local demo password.
4. Confirmed buyer dashboard rendered from backend session context.
5. Opened `Contract Documents` from buyer navigation.
6. Uploaded the default Amanah/Barakah contract text.
7. Confirmed the UI displayed document metadata, checksum, `local-documents://` storage reference, `extracted` extraction status, `notProvided` signature state, and machine-readable candidate fields.
8. Confirmed rendered document workspace text did not include forbidden product labels: PBI, Sprint, Backlog, Roadmap, User stories, implementation slice, or feature lane.

Console result: no relevant error or warning logs during the checked flow.

Screenshot result: screenshot capture through the in-app browser bridge timed out, so the smoke evidence is DOM and interaction based.

## Backlog Status

`backlog/production-extension-roadmap.csv` marks PBI-445 and PBI-446 as `Completed` with this evidence file referenced in their Notes fields.

## Known Limitations

- No production object storage.
- No multipart upload surface; the MVP route accepts JSON `textContent` or `contentBase64`.
- No OCR.
- No PDF/DOCX text extraction.
- No malware scanner.
- No legal e-signature verification.
- No external certificate-chain validation.
- No PostgreSQL document repository yet.
