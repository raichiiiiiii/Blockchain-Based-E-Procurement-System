# Shariah Certificate Artifact Persistence Gap Validation

Date: 2026-05-30
Branch: main

## Scope

Closed the runtime persistence gap for Shariah certificate artifact metadata.

The change keeps domain/application layers database-library-free and adds PostgreSQL persistence only through an infrastructure adapter and runtime composition.

## Files Changed

- `migrations/012_shariah_certificates.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/shariah-certification/infrastructure/postgres-shariah-certificate-repository.ts`
- `src/modules/shariah-certification/infrastructure/postgres-shariah-certificate-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_CERTIFICATE_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

## Runtime Behavior

- `PERSISTENCE_ADAPTER=postgres` now wires `PostgresShariahCertificateRepository`.
- Shariah certificate list, read, register, and revoke routes use the same repository seam.
- PLS activation can validate active certificate artifact coverage through durable PostgreSQL state.
- The demo seed inserts `shariah-certificate-mudarabah-v1` for the restricted PLS seedbed template.
- The demo PLS contract references the certificate artifact metadata without implying external certification.

## Data Safety

- Certificate artifact rows store metadata, conditions, certificate hash, document reference ID, status, and revocation metadata.
- Raw certificate documents are not stored in this table.
- No certificate document payload or unrestricted contract text is written on-chain.
- This evidence does not claim formal Shariah certification, legal attestation, or production Islamic finance compliance.

## Validation Commands

| Command | Result |
|---|---|
| `npm test -- --test-name-pattern=PostgresShariahCertificateRepository` | Passed; project harness ran 782 tests including the new repository tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 12 migrations validated including `012_shariah_certificates.sql` |
| `npm run db:seed -- --dry-run` | Passed, 9 demo accounts plus Shariah certificate artifact seed path validated |
| `docker compose config` | Passed |
| `git diff --check` | Passed; PowerShell reported CRLF warnings for edited files only |
| `npm run db:migrate` with `DATABASE_URL` and `DB_MIGRATIONS_ENABLED=true` | Passed against local Docker PostgreSQL; applied `012_shariah_certificates.sql` after skipping prior applied migrations |
| `npm run db:seed` with `DATABASE_URL` and `DEMO_SEED_ENABLED=true` | Passed against local Docker PostgreSQL after migration flag was enabled |
| `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT certificate_id, status, contract_template_version FROM shariah_certificates ORDER BY certificate_id;"` | Passed; returned `shariah-certificate-mudarabah-v1|active|mudarabah-procurement-v1` |

Live validation note: the first live seed attempt failed because `DB_MIGRATIONS_ENABLED` was not set, so migration execution intentionally skipped and `shariah_certificates` did not exist yet. The command was rerun with `DB_MIGRATIONS_ENABLED=true`, after which migration and seed both passed.

## Known Limitations

- This does not implement external Shariah board certification or certificate signing authority integration.
- This does not validate uploaded certificate documents or legal e-signatures.
- This does not claim the PLS seedbed is a production Islamic finance platform.
- The certificate document reference remains a metadata pointer; document upload/signature validation belongs to the document processing track.

## Next Recommended Persistence Slice

Continue later persistence hardening for document metadata and machine-readable contracts, then external API/idempotency records, payment instructions, and ERP/accounting job state.
