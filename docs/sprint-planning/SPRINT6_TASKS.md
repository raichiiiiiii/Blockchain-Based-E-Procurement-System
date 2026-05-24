# Sprint 6 Tasks

Status: Draft execution sheet
Owner: Scrum Master / Tech Lead
Audience: Frontend, Backend, Blockchain, QA
Source of truth: backlog/backlog.csv
Related release theme: Blockchain Demonstrable MVP Recovery

## 1. Sprint objective

Sprint 6 turns the merged Sprint 5 backend and dashboard foundation into a demonstrable blockchain procurement application.

Target demo flow:

```text
Landing page
-> login as demo user
-> authenticated role dashboard
-> audit or procurement event
-> Hyperledger Fabric smart-contract proof
-> auditor verifies blockchain proof in UI
```

This sprint must avoid product screens that expose backlog/PBI language as user-facing navigation. PBI IDs remain in backlog, docs, evidence, and commit messages only.

## 2. Durable references

Use these files throughout Sprint 6:

```text
backlog/backlog.csv
backlog/plan.mermaid

docs/report/srs-v3.tex
docs/drafts/Pre-SRS-v3.pdf
docs/drafts/business_proposal_digital_procurement_pls_seedbed.pdf

docs/process/pbi-guideline.tex
docs/process/CODING_RULES.md

docs/architecture/ARCHITECTURE.md
docs/architecture/FRONTEND_RUNWAY.md
docs/architecture/STATE_MODELS.md
docs/architecture/DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md
docs/architecture/dashboard-state-flow.mermaid
docs/architecture/FRONTEND_PRODUCT_JOURNEY.md
docs/architecture/POSTGRES_PERSISTENCE_DECISION.md
docs/architecture/FABRIC_MVP_BOUNDARY.md
docs/architecture/BLOCKCHAIN_PROOF_UI_CONTRACT.md
docs/architecture/ESCROW_SMART_CONTRACT_BOUNDARY.md

docs/architecture/adr/ADR-001-dashboard-auth-boundary-and-state-flow.md
docs/architecture/adr/ADR-002-auth-session-management-boundary.md

docs/contracts/API_CONTRACTS.md
docs/contracts/AUTH_SESSION_CONTRACT.md
docs/contracts/TRANSACTION_HISTORY_CONTRACT.md
docs/contracts/ACCESS_HISTORY_QUERY_CONTRACT.md
docs/contracts/ACCESS_AUDIT_EVENT_INSPECTION_CONTRACT.md
docs/contracts/ONBOARDING_ELIGIBILITY_CONTRACT.md
docs/contracts/BLOCKCHAIN_ANCHOR_CONTRACT.md
docs/contracts/ESCROW_WORKFLOW_CONTRACT.md

docs/runbooks/local-demo.md
docs/runbooks/postgres-local-dev.md
docs/runbooks/fabric-local-network.md
```

## 3. Product UI rule

Do not put implementation artifacts in product navigation or product content.

Forbidden product labels:

```text
PBI-263
Sprint 6
Feature lane
Blockchain enabler
User stories
Task list
```

Allowed product labels:

```text
Home
Sign in
Dashboard
Orders
Escrow
Audit Trail
Blockchain Proof
Compliance
Members
Roles
Shariah Review
Financing
```

## 4. Sprint 6 feature decomposition

The following PBI IDs are proposed for backlog addition. If the backlog already uses these IDs, renumber before committing backlog rows.

### Feature PBI-263 - Product entry, login, and authenticated dashboard journey

Purpose: make the frontend behave like a real application entry flow.

Parent dependencies:

```text
PBI-017
PBI-253
```

Stories and tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| A1 | PBI-264 | Story | Landing page for product entry |
| A1.1 | PBI-265 | Task | Define landing page information architecture |
| A1.2 | PBI-266 | Task | Implement LandingPage component |
| A1.3 | PBI-267 | Task | Add landing page visual baseline |
| A1.4 | PBI-268 | Task | Validate landing page |
| A2 | PBI-269 | Story | Login and demo accounts |
| A2.1 | PBI-270 | Task | Define demo account catalogue |
| A2.2 | PBI-271 | Task | Implement LoginPage component |
| A2.3 | PBI-272 | Task | Implement frontend auth client |
| A2.4 | PBI-273 | Task | Implement frontend session state provider |
| A2.5 | PBI-274 | Task | Implement logout behavior |
| A2.6 | PBI-275 | Task | Validate login and demo flow |
| A3 | PBI-276 | Story | Protected dashboard routing |
| A3.1 | PBI-277 | Task | Define frontend route map |
| A3.2 | PBI-278 | Task | Implement lightweight route state in App |
| A3.3 | PBI-279 | Task | Implement ProtectedDashboardRoute |
| A3.4 | PBI-280 | Task | Wire authenticated actor into DashboardShell |
| A3.5 | PBI-281 | Task | Validate protected route flow |

Exit condition: localhost opens on a product landing page, login consumes the auth/session contract, and dashboard no longer starts from a hardcoded App-level actor.

### Feature PBI-282 - Dashboard UX and ADR-aligned state-flow correction

Purpose: make the dashboard visually credible and state-flow correct.

Parent dependencies:

```text
PBI-017
PBI-253
PBI-263
```

Stories and tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| B1 | PBI-283 | Story | Dashboard visual baseline |
| B1.1 | PBI-284 | Task | Define dashboard visual system |
| B1.2 | PBI-285 | Task | Implement AppLayout component |
| B1.3 | PBI-286 | Task | Implement dashboard card and badge components |
| B1.4 | PBI-287 | Task | Restyle DashboardShell and widget zones |
| B1.5 | PBI-288 | Task | Validate dashboard visual baseline |
| B2 | PBI-289 | Story | Dashboard state resolver |
| B2.1 | PBI-290 | Task | Extract dashboard state resolver |
| B2.2 | PBI-291 | Task | Add user lifecycle gate |
| B2.3 | PBI-292 | Task | Add role assignment gate |
| B2.4 | PBI-293 | Task | Add organization state gate |
| B2.5 | PBI-294 | Task | Add dashboard state views |
| B2.6 | PBI-295 | Task | Validate state resolver behavior |

Exit condition: dashboard state behavior follows DASHBOARD_STATE_FLOW_RECOMMENDATIONS.md and dashboard UI is presentable for supervisor demo.

### Enabler PBI-296 - PostgreSQL persistence baseline for demo-stable workflows

Purpose: reduce reliance on volatile in-memory state for demo-critical workflows.

Parent dependencies:

```text
PBI-253
PBI-005
PBI-002
```

Tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| C1 | PBI-297 | Task | Define persistence decision |
| C2 | PBI-298 | Task | Add PostgreSQL local Docker service |
| C3 | PBI-299 | Task | Add database configuration module |
| C4 | PBI-300 | Task | Add migration structure |
| C5 | PBI-301 | Task | Add auth/session schema |
| C6 | PBI-302 | Task | Add membership/RBAC schema |
| C7 | PBI-303 | Task | Add audit/procurement schema |
| C8 | PBI-304 | Task | Add blockchain anchor metadata schema |
| C9 | PBI-305 | Task | Add demo seed script |
| C10 | PBI-306 | Task | Implement auth/session PostgreSQL adapter |
| C11 | PBI-307 | Task | Implement procurement/audit PostgreSQL adapter |
| C12 | PBI-308 | Task | Validate PostgreSQL baseline |

Exit condition: local demo state can be persisted and seeded. Full production hardening is out of scope.

### Enabler PBI-309 - Hyperledger Fabric sandbox and AuditAnchor smart contract baseline

Purpose: make the blockchain component real and demonstrable without a full production consortium rollout.

Parent dependencies:

```text
PBI-005
PBI-022
```

Stories and tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| D1 | PBI-310 | Story | Fabric MVP boundary |
| D1.1 | PBI-311 | Task | Document Fabric MVP boundary |
| D1.2 | PBI-312 | Task | Define AuditAnchor smart-contract contract |
| D1.3 | PBI-313 | Task | Add Fabric local network runbook |
| D2 | PBI-314 | Story | AuditAnchorContract chaincode |
| D2.1 | PBI-315 | Task | Add chaincode workspace skeleton |
| D2.2 | PBI-316 | Task | Implement anchorEvent |
| D2.3 | PBI-317 | Task | Implement getAnchor |
| D2.4 | PBI-318 | Task | Implement verifyEvent |
| D2.5 | PBI-319 | Task | Implement listAnchorsByCase |
| D2.6 | PBI-320 | Task | Add chaincode tests |
| D2.7 | PBI-321 | Task | Add chaincode deployment script |
| D2.8 | PBI-322 | Task | Validate Fabric baseline |

Exit condition: local Fabric test network can deploy AuditAnchorContract and demonstrate anchor/verify behavior.

### Enabler PBI-323 - Backend blockchain anchoring gateway and proof API

Purpose: connect backend audit/procurement event hashes to Fabric through a clean port/adapter seam.

Parent dependencies:

```text
PBI-309
PBI-005
PBI-296
```

Tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| E1 | PBI-324 | Task | Define backend blockchain anchor API contract |
| E2 | PBI-325 | Task | Add BlockchainAnchorGateway port |
| E3 | PBI-326 | Task | Add in-memory blockchain anchor adapter |
| E4 | PBI-327 | Task | Add Fabric blockchain anchor adapter |
| E5 | PBI-328 | Task | Add anchor metadata repository |
| E6 | PBI-329 | Task | Integrate lifecycle event anchoring |
| E7 | PBI-330 | Task | Add proof verification endpoint |
| E8 | PBI-331 | Task | Add blockchain gateway regression tests |
| E9 | PBI-332 | Task | Validate backend blockchain integration |

Exit condition: PBI-005 lifecycle event hashes can be anchored and verified through backend routes.

### Feature PBI-333 - Blockchain proof viewer for anchored audit and procurement events

Purpose: make blockchain proof visible in the application UI.

Parent dependencies:

```text
PBI-323
PBI-282
```

Stories and tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| F1 | PBI-334 | Story | Proof panel for auditors and operators |
| F1.1 | PBI-335 | Task | Define proof panel UI contract |
| F1.2 | PBI-336 | Task | Implement BlockchainProofPanel component |
| F1.3 | PBI-337 | Task | Add blockchain proof client |
| F1.4 | PBI-338 | Task | Add proof panel to event detail page |
| F1.5 | PBI-339 | Task | Add verify proof button |
| F1.6 | PBI-340 | Task | Validate blockchain proof UI |

Exit condition: an auditor can see anchor status, payload hash, Fabric transaction reference, and verification result in the UI.

### PBI-006 first escrow slice

PBI-006 remains the existing parent feature for order acceptance and escrow.

Stories and tasks:

| Order | PBI | Type | Purpose |
|---|---|---|---|
| G1 | PBI-341 | Story | Escrow workflow contract |
| G1.1 | PBI-342 | Task | Define escrow workflow state model |
| G1.2 | PBI-343 | Task | Define EscrowContract on-chain/off-chain boundary |
| G1.3 | PBI-344 | Task | Define escrow API contract |
| G1.4 | PBI-345 | Task | Validate escrow contract docs |
| G2 | PBI-346 | Story | Escrow backend first slice |
| G2.1 | PBI-347 | Task | Implement escrow domain model |
| G2.2 | PBI-348 | Task | Implement escrow repository seam |
| G2.3 | PBI-349 | Task | Implement create escrow service |
| G2.4 | PBI-350 | Task | Implement escrow API route |
| G2.5 | PBI-351 | Task | Emit PBI-005 lifecycle event for escrowCreated |
| G2.6 | PBI-352 | Task | Anchor escrowCreated event to Fabric |
| G2.7 | PBI-353 | Task | Add escrow backend tests |
| G2.8 | PBI-354 | Task | Validate escrow backend first slice |
| G3 | PBI-355 | Story | Escrow UI first slice |
| G3.1 | PBI-356 | Task | Define escrow UI flow |
| G3.2 | PBI-357 | Task | Implement EscrowOverviewPage |
| G3.3 | PBI-358 | Task | Add escrow route/dashboard entry |
| G3.4 | PBI-359 | Task | Add BlockchainProofPanel to escrow page |
| G3.5 | PBI-360 | Task | Validate escrow UI |

Exit condition for first escrow slice: buyer/auditor can see escrowCreated state and blockchain proof. Full settlement, dispute, and PLS distribution remain future scope unless pulled forward explicitly.

## 5. Execution waves

### Wave 0 - lock durable docs

```text
PBI-265
PBI-297
PBI-311
PBI-312
PBI-335
PBI-342
PBI-343
```

### Wave 1 - product entry and UI recovery

```text
PBI-266 to PBI-281
PBI-284 to PBI-295
```

### Wave 2 - database and Fabric baseline

```text
PBI-298 to PBI-308
PBI-315 to PBI-322
```

### Wave 3 - backend blockchain gateway

```text
PBI-324 to PBI-332
```

### Wave 4 - blockchain proof UI

```text
PBI-336 to PBI-340
```

### Wave 5 - escrow first slice

```text
PBI-344 to PBI-360
```

## 6. Sprint commitment recommendation

Must have:

```text
PBI-263 - Product entry/login/dashboard journey
PBI-282 - Dashboard UX/state-flow correction
PBI-309 - Fabric sandbox and AuditAnchorContract baseline
PBI-323 - Backend blockchain anchoring gateway
PBI-333 - Blockchain proof viewer
```

Should have:

```text
PBI-296 - PostgreSQL persistence baseline
PBI-341 - Escrow workflow contract
```

Stretch:

```text
PBI-346 - Escrow backend first slice
PBI-355 - Escrow UI first slice
```

## 7. Done gates

A task is Done only when:

- implementation or documentation exists
- relevant build/test command passes where applicable
- acceptance criteria are covered
- validation evidence is added or updated
- no shared contract drift is introduced
- product UI does not expose PBI/task labels

An enabler is Done only when:

- the technical capability exists
- a runbook or usage doc exists
- consuming modules can use it without local redefinition
- tests or manual validation evidence prove it works

A frontend story is Done only when:

- the screen behaves like a real product screen
- labels are product-facing
- loading, error, empty, and forbidden states are handled where applicable
- frontend build passes

A blockchain story is Done only when:

- on-chain/off-chain boundary is respected
- private business data is not written raw on-chain
- anchor or smart-contract behavior is testable
- UI/backend evidence can show proof state
