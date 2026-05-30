# Export Bundle Persistence Gap Validation

Date: 2026-05-30
Branch: main

## Scope

Closed the runtime persistence gap for regulator export bundle manifests, integrity metadata, and local software-key signature metadata.

The change keeps domain/application layers database-library-free and adds PostgreSQL persistence only in infrastructure and runtime composition.

## Files Changed

- `migrations/010_export_bundles.sql`
- `src/app/server.ts`
- `src/modules/reporting/infrastructure/postgres-export-bundle-repository.ts`
- `src/modules/reporting/infrastructure/postgres-export-bundle-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_EXPORT_BUNDLE_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

## Runtime Behavior

- `PERSISTENCE_ADAPTER=postgres` now wires `PostgresExportBundleRepository`.
- Export bundle create, detail, verification, signature retrieval, and signature verification routes use the same repository seam.
- Bundle manifests, integrity hashes, download references, and detached signature metadata persist in PostgreSQL mode.
- The signing adapter remains the existing local software-key adapter and continues to declare `localSoftwareKeyOnly`.

## Data Safety

- Export bundle rows store manifest references and proof/integrity metadata.
- Private signing keys are not persisted in PostgreSQL.
- Raw restricted documents are not stored in export bundle rows.
- This does not claim production signing, production key management, or external regulator portal integration.

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/reporting/infrastructure/postgres-export-bundle-repository.test.ts` | Passed, 4 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 10 migrations validated |
| `npm run db:seed -- --dry-run` | Passed |
| `npm test` | Passed, 773 tests |
| `git diff --check` | Passed with CRLF normalization warnings for edited TypeScript files |

## Known Limitations

- This is not production export signing or KMS/HSM key custody.
- Export package file delivery remains an MVP reference path, not a production document vault.
- External regulator portal integration remains out of scope.

## Next Recommended Persistence Slice

Add PostgreSQL persistence for operational incidents so operator and security alert evidence remains durable across backend restart.
