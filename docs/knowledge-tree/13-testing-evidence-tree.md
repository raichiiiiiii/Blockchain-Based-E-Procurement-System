# Testing / Evidence Tree

## Evidence Categories

| Category | Current evidence | Confidence effect | Gaps |
|---|---|---|---|
| Unit tests | Domain/application tests across auth, access, procurement, financing, ops, payments, etc. | Proves service rules | Does not prove UI path alone. |
| Route tests | Extensive Fastify route tests including Issue 26/27 workflows | Proves API behavior | Some route groups are broader than OpenAPI. |
| Frontend build | `npm run frontend:build` | Proves frontend compiles | Not full visual QA. |
| Browser smoke | Multiple evidence docs include actor smoke | Proves main journeys render | Manual/local environment dependent. |
| Docker smoke | Deployable smoke evidence exists | Proves container path where run | Not production deployment. |
| Migration dry-run | `npm run db:migrate -- --dry-run` | Proves migration ordering | Not restart durability by itself. |
| Seed dry-run | `npm run db:seed -- --dry-run` | Proves demo data validity | Not real data migration. |
| OpenAPI validation | `npm run openapi:validate` | Proves contract syntax | Contract does not cover all route groups. |
| Fabric lab evidence | PBI-438 lab docs | Proves configured lab path | Not managed production Fabric. |
| Actor walkthrough evidence | release candidate, actor matrix, Issue 25/26 docs | Proves supervisor-demo path | Stakeholder UAT still needed. |
| Manual evidence | runbooks, scorecard, demo case | Product-owner context | Must not be treated as automated proof. |

## Outdated or Superseded Evidence

- `FINAL_RELEASE_CANDIDATE_VALIDATION.md` says supervisor-demo ready, not pilot-ready; later evidence adds pilot-hardening features but keeps non-production claims.
- `PRODUCTION_EXTENSION_RELEASE_VALIDATION.md` contains a supersession note for PBI-438; later PBI-438 evidence should be used for current Fabric lab status.
- `PBI-506_ISSUE26_FINAL_VALIDATION.md` originally listed source-to-award/invoice/closeout runtime in-memory limitations; Issue 27 addendum supersedes that with PostgreSQL persistence.

## Current Validation Baseline

The most recent merge-gate evidence is `docs/evidence/qa/ISSUE27_MERGE_GATE_HARDENING_VALIDATION.md`, which records:

- `npm run build` passed
- `npm run frontend:build` passed
- `npm test` passed with 849 tests
- OpenAPI validation passed
- migration and seed dry-runs passed
- Docker Compose app config passed
- browser smoke passed for credential login and buyer dashboard sample
