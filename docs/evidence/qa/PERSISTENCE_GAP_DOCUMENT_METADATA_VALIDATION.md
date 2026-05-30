# Document Metadata Persistence Gap Validation

Date: 2026-05-30
Branch: main

## Scope

Closed the runtime persistence gap for document metadata and extraction records.

The change keeps raw file storage behind the existing document storage port. PostgreSQL stores metadata, checksum, extraction status, machine-readable field candidates, and local signature metadata only.

## Files Changed

- `migrations/013_document_metadata.sql`
- `src/app/server.ts`
- `src/modules/documents/application/upload-document.ts`
- `src/modules/documents/infrastructure/postgres-document-repository.ts`
- `src/modules/documents/infrastructure/postgres-document-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_DOCUMENT_METADATA_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

## Runtime Behavior

- `PERSISTENCE_ADAPTER=postgres` now wires `PostgresDocumentRepository`.
- `POST /api/v1/documents` stores document metadata before extraction so extraction records can reference the metadata row.
- `GET /api/v1/documents/:documentId` reads durable metadata without raw document payloads.
- `GET /api/v1/documents/:documentId/extraction` reads durable extraction output and machine-readable field candidates.
- Local file bytes remain in the configured storage adapter; `.local-documents/` remains non-production local storage.

## Data Safety

- Raw document bytes are not stored in the metadata table.
- Raw document bytes are not written on-chain.
- Checksums, storage references, extraction status, signature status, safe extracted fields, and warnings are persisted.
- Local signature verification remains metadata-only and does not claim legal e-signature validation.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/documents/infrastructure/postgres-document-repository.test.ts` | Passed, 5 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 13 migrations validated including `013_document_metadata.sql` |
| `npm run db:seed -- --dry-run` | Passed |
| `docker compose config` | Passed |
| `npm test` | Passed, 787 tests |
| `npm run db:migrate` with `DATABASE_URL` and `DB_MIGRATIONS_ENABLED=true` | Passed against local Docker PostgreSQL; applied `013_document_metadata.sql` |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('document_metadata','document_extractions') ORDER BY table_name;"` | Passed; returned `document_extractions` and `document_metadata` |
| `git diff --check` | Passed; PowerShell reported CRLF warnings for edited files only |

## Known Limitations

- This does not add production object storage such as S3 or MinIO.
- This does not add malware scanning beyond explicit `notScanned` status.
- PDF and DOCX extraction remain `unsupported` until a production extractor adapter is connected.
- Local detached signature metadata is not legal e-signature validation or external certificate-chain validation.

## Next Recommended Persistence Slice

Add PostgreSQL persistence for machine-readable contracts so negotiation state and terms hashes survive backend restart.
