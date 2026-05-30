# Codex Task Ledger

This ledger is the repository memory for staged Codex implementation work. It records what was inspected, changed, validated, and left open so future agents do not need to rediscover the same project state.

## TASK-2026-05-30-001 Blueprint Foundation

Stage: Phase 1 / Phase 2 documentation baseline
Status: done

Business reason:

Realign the repository around a deployable procurement evidence MVP with optional procurement-linked PLS / mudarabah financing support. PostgreSQL and backend services remain the operational source of truth; Hyperledger Fabric remains a selected proof anchoring and verification boundary.

Files inspected:

- `README.md`
- `docs/architecture/ARCHITECTURE.md`
- `docs/architecture/POSTGRES_PERSISTENCE_DECISION.md`
- `docs/architecture/FABRIC_MVP_BOUNDARY.md`
- `docs/contracts/API_CONTRACTS.md`
- `docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md`
- `docs/contracts/TRANSACTION_HISTORY_CONTRACT.md`
- `docs/contracts/ESCROW_WORKFLOW_CONTRACT.md`
- `docs/evidence/qa/PRODUCTION_EXTENSION_RELEASE_VALIDATION.md`
- `src/app/server.ts`
- `src/modules/`
- `migrations/`

Files changed:

- `docs/file-index.md`
- `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
- `docs/contracts/CANONICAL_PAYLOAD_HASHING.md`
- `docs/contracts/CONTRACT_OWNERSHIP_MATRIX.md`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/architecture/diagrams/procurement-workflow-activity.mmd`
- `docs/architecture/diagrams/mvp-component-architecture.mmd`
- `docs/architecture/diagrams/proof-anchoring-sequence.mmd`
- `docs/architecture/diagrams/escrow-state-machine.mmd`
- `docs/architecture/adr/ADR-003-operational-state-postgres.md`
- `docs/architecture/adr/ADR-004-fabric-proof-boundary.md`
- `docs/architecture/adr/ADR-005-react-incremental-refactor.md`
- `docs/traceability/REQID_TO_PBI_TO_EVIDENCE.md`
- `docs/runbooks/canonical-actor-uat.md`
- `docs/DEVELOPER_ONBOARDING.md`

Tests run:

- `git diff --check` passed.

Evidence produced:

- This ledger entry.
- `docs/requirements/CURRENT_PRODUCT_BASELINE.md`
- `docs/file-index.md`
- `docs/traceability/REQID_TO_PBI_TO_EVIDENCE.md`
- `docs/contracts/CONTRACT_OWNERSHIP_MATRIX.md`
- `docs/contracts/CANONICAL_PAYLOAD_HASHING.md`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/runbooks/canonical-actor-uat.md`

Known limitations:

- This task is documentation and architecture alignment only.
- It does not add PostgreSQL repositories for modules that still run in memory.
- It does not implement new procurement workflow behavior.
- It does not close production Fabric consortium execution.

Next task:

Start the next smallest implementation slice from the current product baseline. Recommended first target: close MVP-critical persistence gaps documented in `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`.

## TASK-2026-05-30-002 KYC/AML PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

KYC/AML eligibility is upstream of procurement order creation, escrow creation, and PLS activation. In PostgreSQL runtime mode, eligibility must survive backend restart and must not depend on in-memory demo state.

Files inspected:

- `src/modules/kyc-aml-onboarding/`
- `src/app/server.ts`
- `migrations/`
- `scripts/db/seed-demo-data.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/007_kyc_aml_onboarding_cases.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.ts`
- `src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_KYC_AML_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/kyc-aml-onboarding/infrastructure/postgres-onboarding-case-repository.test.ts` passed.
- `npm run build` passed.
- `npm run db:migrate -- --dry-run` passed.
- `npm run db:seed -- --dry-run` passed.
- `npm test` passed, 762 tests.
- `git diff --check` passed with CRLF warnings for edited TypeScript files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_KYC_AML_VALIDATION.md`

Known limitations:

- Does not implement third-party AML screening, OCR, raw document upload, or production KYC verification.
- Stores safe structured metadata and evidence references only.

Next task:

Continue to Shariah review persistence so PLS review and activation state remain durable across backend restart.

## TASK-2026-05-30-003 Shariah Review PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

Shariah review decisions are part of the PLS seedbed governance chain. In PostgreSQL runtime mode, approved review metadata must survive backend restart and remain available for review history, PLS gating evidence, and supervisor demonstration without claiming formal external Shariah certification.

Files inspected:

- `src/modules/shariah-review/`
- `src/app/server.ts`
- `migrations/`
- `scripts/db/seed-demo-data.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/008_shariah_reviews.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.ts`
- `src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_REVIEW_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/shariah-review/infrastructure/postgres-shariah-review-repository.test.ts` passed.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed.
- `npm run db:seed -- --dry-run` passed.
- `npm test` passed, 765 tests.
- `git diff --check` passed with CRLF warnings for edited TypeScript files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_REVIEW_VALIDATION.md`

Known limitations:

- Does not implement formal external Shariah certification, board workflow, or legal attestation.
- Stores review metadata, checklist state, rationale, conditions, and safe references only.
- Does not write raw contract documents or certification payloads on-chain.

Next task:

Continue to PLS contract/distribution persistence so financing demo state remains durable across backend restart.

## TASK-2026-05-30-004 PLS Contract PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

PLS contract activation and distribution scenarios are part of the restricted financing seedbed. In PostgreSQL runtime mode, contract state, Shariah approval references, and simulation distribution records must survive backend restart without implying payment execution or production Islamic finance compliance.

Files inspected:

- `src/modules/financing/`
- `src/app/server.ts`
- `migrations/`
- `scripts/db/seed-demo-data.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/009_pls_contracts_distributions.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/financing/infrastructure/postgres-pls-contract-repository.ts`
- `src/modules/financing/infrastructure/postgres-pls-contract-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_PLS_CONTRACT_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/financing/infrastructure/postgres-pls-contract-repository.test.ts` passed.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed.
- `npm run db:seed -- --dry-run` passed.
- `npm test` passed, 769 tests.
- `git diff --check` passed with CRLF warnings for edited TypeScript files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_PLS_CONTRACT_VALIDATION.md`

Known limitations:

- Does not execute payments.
- Does not claim formal Shariah certification or production Islamic finance compliance.
- Stores contract state, approval references, and simulation distribution metadata only.

Next task:

Continue to export bundle/signing metadata persistence so regulator evidence packages remain durable across backend restart.

## TASK-2026-05-30-005 Export Bundle PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

Regulator export bundles and detached signature metadata are supervisor evidence artifacts. In PostgreSQL runtime mode, generated bundle manifests and local software-key signatures must survive backend restart while preserving the claim boundary that this is not production KMS/HSM signing.

Files inspected:

- `src/modules/reporting/`
- `src/app/server.ts`
- `migrations/`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/010_export_bundles.sql`
- `src/app/server.ts`
- `src/modules/reporting/infrastructure/postgres-export-bundle-repository.ts`
- `src/modules/reporting/infrastructure/postgres-export-bundle-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_EXPORT_BUNDLE_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/reporting/infrastructure/postgres-export-bundle-repository.test.ts` passed, 4 tests.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed, 10 migrations.
- `npm run db:seed -- --dry-run` passed.
- `npm test` passed, 773 tests.
- `git diff --check` passed with CRLF warnings for edited TypeScript files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_EXPORT_BUNDLE_VALIDATION.md`

Known limitations:

- Local software-key signing is MVP evidence only, not production KMS/HSM signing.
- Does not add production export package storage or external regulator portal integration.
- Does not store private signing keys in PostgreSQL.

Next task:

Continue to operational incident persistence so security/operator incidents remain durable across backend restart.

## TASK-2026-05-30-006 Operational Incident PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

Operational readiness incidents feed security/operator alert views. In PostgreSQL runtime mode, database and Fabric availability incidents must survive backend restart so deployment evidence and operator review are not limited to in-memory state.

Files inspected:

- `src/modules/ops/`
- `src/app/server.ts`
- `migrations/`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/011_operational_incidents.sql`
- `src/app/server.ts`
- `src/modules/ops/infrastructure/postgres-operational-incident-repository.ts`
- `src/modules/ops/infrastructure/postgres-operational-incident-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_OPERATIONAL_INCIDENT_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/ops/infrastructure/postgres-operational-incident-repository.test.ts` passed, 4 tests.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed, 11 migrations.
- `npm run db:seed -- --dry-run` passed.
- `docker compose config` passed.
- `npm test` passed, 777 tests.
- `git diff --check` passed with CRLF warnings for edited TypeScript files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_OPERATIONAL_INCIDENT_VALIDATION.md`

Known limitations:

- Does not implement external monitoring, paging, SIEM export, or retention policy.
- Does not change incident semantics beyond persistence.

Next task:

The persistence matrix no longer lists a required follow-up item before the next evidence review. Recommended later hardening remains for documents, contracts, external API credentials/idempotency, payment instructions, and ERP/accounting jobs.

## TASK-2026-05-30-007 Shariah Certificate Artifact PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

Shariah certificate artifact metadata gates restricted PLS activation when the certificate repository is wired. In PostgreSQL runtime mode, the demo certificate artifact must survive backend restart while preserving the claim boundary that the system tracks governance evidence only and does not claim formal external Shariah certification.

Files inspected:

- `src/modules/shariah-certification/`
- `src/modules/financing/`
- `src/app/server.ts`
- `migrations/`
- `scripts/db/seed-demo-data.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/012_shariah_certificates.sql`
- `scripts/db/seed-demo-data.ts`
- `src/app/server.ts`
- `src/modules/shariah-certification/infrastructure/postgres-shariah-certificate-repository.ts`
- `src/modules/shariah-certification/infrastructure/postgres-shariah-certificate-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_CERTIFICATE_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `npm test -- --test-name-pattern=PostgresShariahCertificateRepository` ran the project test harness and passed, 782 tests.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed, 12 migrations.
- `npm run db:seed -- --dry-run` passed.
- `docker compose config` passed.
- Live `npm run db:migrate` with `DATABASE_URL` and `DB_MIGRATIONS_ENABLED=true` passed against local Docker PostgreSQL; migration `012_shariah_certificates.sql` applied.
- Live `npm run db:seed` with `DATABASE_URL` and `DEMO_SEED_ENABLED=true` passed after migration flag was enabled.
- `docker exec pls-postgres psql -U pls_app -d pls_platform -tAc "SELECT certificate_id, status, contract_template_version FROM shariah_certificates ORDER BY certificate_id;"` passed and returned the active demo certificate artifact.
- `git diff --check` passed with CRLF warnings for edited TypeScript files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_SHARIAH_CERTIFICATE_VALIDATION.md`

Known limitations:

- This does not implement external Shariah board certification, legal attestation, or certificate document upload verification.
- This does not make the PLS seedbed a production Islamic finance platform.
- Certificate artifacts store metadata and hash references only; raw certificate documents remain outside this table and off-chain.

Next task:

Continue later persistence hardening for document metadata, machine-readable contracts, external API client/idempotency records, payment instructions, and ERP/accounting jobs.

## TASK-2026-05-30-008 Document Metadata PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

Document upload and extraction are part of the production-extension foundation. In PostgreSQL runtime mode, document metadata, extraction status, machine-readable field candidates, checksum, and local signature metadata must survive backend restart while raw files remain outside the database and off-chain.

Files inspected:

- `src/modules/documents/`
- `src/app/server.ts`
- `migrations/`
- `docs/contracts/DOCUMENT_UPLOAD_EXTRACTION_CONTRACT.md`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`

Files changed:

- `migrations/013_document_metadata.sql`
- `src/app/server.ts`
- `src/modules/documents/application/upload-document.ts`
- `src/modules/documents/infrastructure/postgres-document-repository.ts`
- `src/modules/documents/infrastructure/postgres-document-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_DOCUMENT_METADATA_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/documents/infrastructure/postgres-document-repository.test.ts` passed, 5 tests.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed, 13 migrations.
- `npm run db:seed -- --dry-run` passed.
- `docker compose config` passed.
- `git diff --check` passed with CRLF warnings for edited files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_DOCUMENT_METADATA_VALIDATION.md`

Known limitations:

- Local file storage remains `.local-documents/` and is not production object storage.
- Malware scanning remains explicit as `notScanned`.
- PDF/DOCX extraction remains unsupported until a production extractor adapter is connected.
- Local detached signature metadata is not legal e-signature validation.

Next task:

Continue later persistence hardening for machine-readable contracts, external API client/idempotency records, payment instructions, and ERP/accounting jobs.

## TASK-2026-05-30-009 Machine-Readable Contract PostgreSQL Persistence

Stage: Phase 3 persistence gap closure
Status: done

Business reason:

The contract negotiation and machine-readable contract model must survive backend restart in PostgreSQL runtime mode. The MVP needs durable contract metadata, terms hash, offers, acceptances, and lifecycle event references while preserving the internal domain aggregate and avoiding external schema lock-in.

Files inspected:

- `src/modules/contracts/`
- `src/app/server.ts`
- `migrations/`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PBI-450_451_CONTRACT_NEGOTIATION_MODEL_VALIDATION.md`

Files changed:

- `migrations/014_procurement_contracts.sql`
- `src/app/server.ts`
- `src/modules/contracts/infrastructure/postgres-procurement-contract-repository.ts`
- `src/modules/contracts/infrastructure/postgres-procurement-contract-repository.test.ts`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/evidence/qa/PERSISTENCE_GAP_CONTRACT_NEGOTIATION_VALIDATION.md`
- `docs/implementation/CODEX_TASK_LEDGER.md`

Tests run:

- `node --test --loader ts-node/esm src/modules/contracts/infrastructure/postgres-procurement-contract-repository.test.ts` passed, 4 tests.
- `npm run build` passed.
- `npm run frontend:build` passed.
- `npm run db:migrate -- --dry-run` passed, 14 migrations.
- `npm run db:seed -- --dry-run` passed.
- `docker compose config` passed.
- `npm test` passed, 791 tests.
- Live `npm run db:migrate` with `DATABASE_URL` and `DB_MIGRATIONS_ENABLED=true` passed against local Docker PostgreSQL; migration `014_procurement_contracts.sql` applied.
- Live table verification for `procurement_contracts` passed.
- `git diff --check` passed with CRLF warnings for edited files.

Evidence produced:

- `docs/evidence/qa/PERSISTENCE_GAP_CONTRACT_NEGOTIATION_VALIDATION.md`

Known limitations:

- This stores contract metadata and the machine-readable contract aggregate; it does not implement production document signing, ERP synchronization, or external registry publication.
- Human-readable contract documents remain linked by document ID/reference rather than copied into the contract table.
- The implementation keeps the current MVP contract workflow and does not claim legal contract execution beyond tracked acceptance metadata.

Next task:

Continue later persistence hardening for external API client/idempotency records, payment instructions, and ERP/accounting jobs.
