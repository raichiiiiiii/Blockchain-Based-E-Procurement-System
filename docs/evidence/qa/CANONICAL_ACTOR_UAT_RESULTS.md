# Canonical Actor UAT Results

Date: 2026-05-30
Branch: main
Commit inspected before this pass: `679c2e1`

## Scope

This evidence records the canonical actor UAT review against the Amanah Retail, Barakah Supplies, and Mabrur Finance Partner demo case after the runtime persistence gap closure.

Readiness wording remains:

```text
Supervisor-demo plus selected pilot-hardening features, not commercial-ready or production-certified.
```

## Files Inspected

- `docs/runbooks/canonical-actor-uat.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/evidence/qa/ACTOR_WORKFLOW_ACCEPTANCE_MATRIX.md`
- `docs/evidence/qa/PRODUCTION_EXTENSION_RELEASE_VALIDATION.md`
- `docs/architecture/PERSISTENCE_CAPABILITY_MATRIX.md`
- `docs/runbooks/local-demo.md`
- `docs/runbooks/postgres-local-dev.md`
- `src/frontend`
- `src/modules`

## UAT Result Summary

| Actor | Expected surface | Evidence status | Result |
|---|---|---|---|
| Visitor | Landing and credential-only Sign in | Browser smoke on `/login` | Passed for credential-only login surface. |
| Administrator | Dashboard, Members, Roles, Access History | Live browser sign-in with PostgreSQL-backed session | Passed; no access-denied dashboard state. |
| Buyer / Procurement Officer | Orders, Delivery Evidence, Escrow, Blockchain Proof | Live browser sign-in with PostgreSQL-backed session | Passed. |
| SME / Supplier | Received Orders, Delivery Evidence, Escrow | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Compliance Reviewer | Compliance and Eligibility Status | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Shariah Reviewer | Shariah Review | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Bank / Financier | Financing and PLS distribution scenario | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Auditor | Audit Trail, Blockchain Proof, Export Bundle | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Regulator / Reporting User | Export Bundle and Blockchain Proof | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Security Operator | Security Status and Access Alerts | Live browser sign-in with PostgreSQL-backed session | Passed. |
| Platform Operator | Local startup and validation commands | PostgreSQL Docker service, migration apply, seed, backend, and frontend started locally | Passed after rerunning seed once migration apply completed. |
| Developer / Integrator | API quickstart and response envelopes | Automated API route tests and full suite | Passed through automated validation. |

## Browser Smoke

Live browser smoke was run against `http://127.0.0.1:5173/login` and `http://127.0.0.1:5173/dashboard` with PostgreSQL-backed backend sessions.

Credential-only login result:

- Username field visible.
- Password field visible.
- Sign in button visible.
- Helper text visible: "Use issued credentials to access your workspace."
- No "Continue as" controls visible.
- No role shortcut button text visible.

Environment startup result:

```text
docker compose up -d postgres -> passed
npm run db:migrate -> passed, migrations applied through 011
npm run db:seed -> passed after rerun
npm run dev -> backend listening on port 3100
npm run frontend:dev -> frontend listening on 127.0.0.1:5173
```

The first seed attempt ran while migrations were still applying and failed with:

```text
relation "kyc_aml_onboarding_cases" does not exist
```

After migration apply completed, rerunning `npm run db:seed` succeeded.

Actor dashboard smoke:

| Account | Expected role surface | Result |
|---|---|---|
| `admin.demo` | Administrator workspace with Dashboard, Members, Roles, and Access History | Passed; no access-denied state. |
| `buyer.demo` | Buyer workspace with Orders, Escrow, and Blockchain Proof | Passed. |
| `supplier.demo` | Supplier workspace with Received Orders | Passed. |
| `compliance.demo` | Compliance Reviewer workspace | Passed. |
| `shariah.demo` | Shariah Reviewer workspace | Passed. |
| `financier.demo` | Financier workspace with Financing | Passed. |
| `auditor.demo` | Auditor workspace with Audit Trail, Blockchain Proof, and Export Bundle | Passed. |
| `regulator.demo` | Regulator workspace with Export Bundle | Passed. |
| `security.demo` | Security Operator workspace with Security Status | Passed. |

## Product UI Label Checks

| Search | Result |
|---|---|
| `rg -n "\b(PBI\|Sprint\|Backlog\|Roadmap\|User stories\|implementation slice\|feature lane)\b" src/frontend` | Passed, no matches |
| `rg -n "Continue as\|demo-account-grid\|onDemoSignIn" src/frontend` | Passed, no matches |

## Validation Commands

| Command | Result |
|---|---|
| `node --test --loader ts-node/esm src/modules/ops/infrastructure/postgres-operational-incident-repository.test.ts` | Passed, 4 tests |
| `npm run build` | Passed |
| `npm run frontend:build` | Passed |
| `npm run db:migrate -- --dry-run` | Passed, 11 migrations validated |
| `npm run db:seed -- --dry-run` | Passed |
| `docker compose up -d postgres` | Passed |
| `npm run db:migrate` | Passed |
| `npm run db:seed` | Passed after rerun once migrations completed |
| `GET /health` | Passed |
| `GET /ready` | Passed, `database.mode=postgres`, `database.reachable=true` |
| Backend credential login for `admin.demo` | Passed |
| Browser actor login smoke for all seeded accounts | Passed |
| `docker compose config` | Passed |
| `npm test` | Passed, 777 tests |
| `git diff --check` | Passed with CRLF normalization warnings for edited TypeScript files |

## Known Limitations

- This evidence does not claim pilot-ready, commercial-ready, production-certified, production Fabric consortium, production payment execution, external Shariah certification, production ERP integration, or production ISO 20022 execution.
- Documents, contract negotiation records, external API credentials/idempotency/audit, payment instructions, and ERP/accounting jobs still need later persistence hardening before broader pilot claims.

## Next Recommended Step

Use this live smoke as the baseline for the next rehearsal. The next recommended hardening slice is durable persistence for document metadata, contract negotiation records, external API credentials/idempotency/audit, payment instructions, or ERP/accounting jobs.
