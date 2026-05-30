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
| Administrator | Dashboard, Members, Roles, Access History | Automated auth/RBAC/role/access-history tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Buyer / Procurement Officer | Orders, Delivery Evidence, Escrow, Blockchain Proof | Automated procurement, delivery evidence, escrow, proof tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| SME / Supplier | Received Orders, Delivery Evidence, Escrow | Automated procurement and delivery evidence authorization tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Compliance Reviewer | Compliance and Eligibility Status | Automated KYC/AML eligibility and decision tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Shariah Reviewer | Shariah Review | Automated Shariah review, certificate artifact, and PLS gate tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Bank / Financier | Financing and PLS distribution scenario | Automated PLS activation/distribution tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Auditor | Audit Trail, Blockchain Proof, Export Bundle | Automated access-history, proof, and export tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Regulator / Reporting User | Export Bundle and Blockchain Proof | Automated export bundle/signature/verification tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Security Operator | Security Status and Access Alerts | Automated security alert and ops status tests; browser actor smoke blocked by DB environment | Evidence-backed, live browser sign-in not rerun in this environment. |
| Platform Operator | Local startup and validation commands | Docker daemon unavailable; dry-run validation passed | Blocked only for live PostgreSQL apply/browser actor smoke on this machine. |
| Developer / Integrator | API quickstart and response envelopes | Automated API route tests and full suite | Passed through automated validation. |

## Browser Smoke

Frontend-only browser smoke was run against `http://127.0.0.1:5173/login`.

Result:

- Username field visible.
- Password field visible.
- Sign in button visible.
- Helper text visible: "Use issued credentials to access your workspace."
- No "Continue as" controls visible.
- No role shortcut button text visible.

Full browser actor sign-in smoke was not rerun because the local PostgreSQL dependency could not be started in this environment:

```text
docker compose up -d postgres
error during connect: this error may indicate that the docker daemon is not running
```

Additional check:

```text
Test-NetConnection localhost:5432 -> TcpTestSucceeded: False
```

This is an environment blocker, not a code validation failure. The persistent credential path remains covered by `npm run db:seed -- --dry-run`, auth route tests, RBAC tests, and prior release browser evidence.

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
| `docker compose config` | Passed |
| `npm test` | Passed, 777 tests |
| `git diff --check` | Passed with CRLF normalization warnings for edited TypeScript files |

## Known Limitations

- Live PostgreSQL apply/seed and full actor browser sign-in smoke were blocked because Docker Desktop was not running and no local PostgreSQL listener was available.
- This evidence does not claim pilot-ready, commercial-ready, production-certified, production Fabric consortium, production payment execution, external Shariah certification, production ERP integration, or production ISO 20022 execution.
- Documents, contract negotiation records, external API credentials/idempotency/audit, payment instructions, and ERP/accounting jobs still need later persistence hardening before broader pilot claims.

## Next Recommended Step

Start Docker Desktop or a local PostgreSQL service, run `.\scripts\start-local-demo.ps1`, then execute the browser actor smoke for all seeded credentials and append the live-browser results to this file.
