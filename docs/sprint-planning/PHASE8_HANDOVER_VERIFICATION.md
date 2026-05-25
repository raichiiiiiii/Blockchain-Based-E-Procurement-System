# Phase 8 Handover Verification

Status: Ready for independent verification
Created: 2026-05-26
Verifier role: Independent release acceptance reviewer

## Purpose

Phase 8 is a handover and verification wave. It is not new implementation scope unless a release blocker is found. The verifier should be able to validate the deployment-ready MVP from repository artifacts, commands, runbooks, and evidence without relying on chat memory.

## Repository Baseline At Handover Creation

```text
Branch observed: main
Commit observed: 5b1c5122c7fac8860048b6d173e1b31410d4ec0c
Release validation evidence: docs/evidence/qa/RELEASE_VALIDATION_RESULTS.md
Actor UAT evidence: docs/evidence/qa/ACTOR_UAT_RESULTS.md
Supervisor script: docs/runbooks/final-supervisor-demo-script.md
```

The verifier must record the actual branch, commit hash, and working tree state at verification time. Release acceptance should be based on the committed repository state being reviewed, not on this observed handover hash alone.

## Source Artifacts

Primary roadmap and planning:

```text
backlog/backlog.csv
backlog/deployment-ready-roadmap.csv
backlog/plan.mermaid
docs/sprint-planning/DEPLOYMENT_READY_MVP_ROADMAP.md
docs/sprint-planning/SPRINT6_TASKS.md
docs/sprint-planning/KNOWN_LIMITATIONS_AND_POST_MVP_ROADMAP.md
```

Runbooks:

```text
docs/runbooks/local-demo.md
docs/runbooks/postgres-local-dev.md
docs/runbooks/fabric-local-network.md
docs/runbooks/api-quickstart.md
docs/runbooks/deployment-environment-guide.md
docs/runbooks/deployment-smoke-test.md
docs/runbooks/final-supervisor-demo-script.md
```

Evidence:

```text
docs/evidence/qa/ACTOR_UAT_RESULTS.md
docs/evidence/qa/RELEASE_VALIDATION_RESULTS.md
docs/evidence/qa/PHASE8_VERIFICATION_CHECKLIST.md
docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
```

## Verification Sequence

1. Repository state
   Confirm branch, commit hash, and working tree status. Confirm roadmap and runbook files exist.

2. Documentation structure
   Read `docs/README.md`. Confirm roadmap docs are under `docs/sprint-planning`, runbooks are under `docs/runbooks`, and validation evidence is under `docs/evidence/qa`.

3. CSV and roadmap parse
   Parse both backlog CSV files with a real CSV parser. Confirm no duplicate IDs within either source and confirm deployment roadmap rows include actor, ReqID, status, dependencies, acceptance criteria, deployment relevance, and source reference path.

4. Static validation
   Run:

   ```powershell
   git diff --check
   npm run build
   npm run frontend:build
   npm test
   ```

5. Database verification
   Run:

   ```powershell
   docker compose config
   npm run db:migrate -- --dry-run
   npm run db:seed -- --dry-run
   ```

   If local PostgreSQL is available, also apply migrations and seed using `docs/runbooks/postgres-local-dev.md`, then start the backend with `PERSISTENCE_ADAPTER=postgres`.

6. Fabric verification
   Run:

   ```powershell
   npm run chaincode:audit-anchor:build
   npm run chaincode:audit-anchor:test
   ```

   If `fabric-samples/test-network` is available, follow `docs/runbooks/fabric-local-network.md` and verify `verified`, `mismatch`, and `notFound` proof states.

7. Backend proof API
   Confirm proof retrieval and verification routes match the blockchain anchor contract and return honest states: `verified`, `mismatch`, `notFound`, and `unavailable`.

8. Frontend proof UI
   Confirm proof UI does not fabricate transaction IDs, does not show raw payloads, and renders missing, mismatch, unavailable, pending, failed, and verified states distinctly.

9. Actor login and routing
   Verify every mandatory actor can sign in, reaches the correct dashboard, and cannot directly access unauthorized routes.

10. Actor UAT
    Execute the scripts in `docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md` and record results in `docs/evidence/qa/PHASE8_VERIFICATION_CHECKLIST.md` or a verifier-owned report.

11. Authorization matrix
    Verify `docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md` covers positive and negative authorization cases for mandatory actors and anonymous users.

12. Known limitations
    Confirm limitations clearly state the MVP is not production Fabric consortium, not production payment rails, not full ERP integration, not DID/VC federation, not a tokenized receivables full lifecycle, not full arbitration, not a multi-jurisdiction policy engine, not full Fabric private data collections, and not automated consortium governance.

13. Supervisor demo readiness
    Follow `docs/runbooks/final-supervisor-demo-script.md` and confirm the walkthrough can be executed from a local environment.

## Go Criteria

- All mandatory actor flows pass or have accepted non-code blockers.
- Build/test validation passes.
- Unauthorized access is blocked in backend routes.
- Product UI does not expose backlog, sprint, task, or PBI labels.
- Blockchain proof UI does not fabricate proof data.
- Eligibility blocks protected transaction actions.
- PLS activation requires approved Shariah review.
- Export bundle integrity metadata is present and honest.
- Known limitations are documented.
- Local demo runbook is executable or has documented environmental blockers.

## No-Go Criteria

- Any mandatory actor cannot sign in.
- Dashboard runtime actor source is hardcoded instead of session-derived.
- Unauthorized actor can access protected workflow or API.
- Blockchain proof UI displays fake transaction IDs or fake verified states.
- KYC eligibility does not block transaction actions.
- PLS activation bypasses Shariah approval.
- Export bundle integrity metadata is missing or misleading.
- Local demo cannot be started and no documented workaround exists.

## Verifier Final Report Format

The verifier should produce:

```text
1. Commit verified
2. Environment used
3. Commands executed
4. Validation results
5. Actor UAT results
6. Authorization matrix results
7. Fabric verification result
8. PostgreSQL verification result
9. UI product-label check result
10. Known limitations check
11. Release blockers
12. Non-blocking issues
13. Go / No-Go recommendation
14. Evidence file paths
```
