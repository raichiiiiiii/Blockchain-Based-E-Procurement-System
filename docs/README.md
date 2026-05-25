# Documentation Index

This directory contains project documentation for the blockchain-based e-procurement system. Use this file as the navigation entry point before editing or adding new documentation.

## Current documentation groups

The repository currently contains a mix of source-of-truth documentation, sprint planning notes, PBI artifacts, QA evidence, report files, and business proposal drafts. The long-term intent is to keep stable reference documentation separate from delivery evidence and temporary proposal material.

## Recommended folder model

Use the following structure when reorganizing or adding new documentation:

```text
docs/
├── README.md
├── architecture/
├── contracts/
├── audit/
├── process/
├── sprint-planning/
├── evidence/
│   ├── qa/
│   └── pbi-closure/
├── pbi-artifacts/
├── report/
└── proposals/
```

## Navigation by document type

### Architecture and system model

Use this group for durable design references and implementation-wide system models.

Target folder: `docs/architecture/`

Recommended files:

- `ARCHITECTURE.md`
- `diagrams.md`
- `STATE_MODELS.md`
- `FRONTEND_RUNWAY.md`

### API and backend contracts

Use this group for stable backend/API behavior, validation envelopes, and route contracts. These documents should be treated as implementation contracts and should not be mixed with temporary planning notes.

Target folder: `docs/contracts/`

Recommended files:

- `API_CONTRACTS.md`
- `ACCESS_AUDIT_EVENT_CONTRACT.md`
- `ACCESS_AUDIT_EVENT_INSPECTION_CONTRACT.md`
- `ACCESS_HISTORY_QUERY_CONTRACT.md`

### Audit, access-control, and compliance documentation

Use this group for audit-event policy, protected-function inventory, access logging semantics, and non-repudiation related documentation.

Target folder: `docs/audit/`

Recommended files:

- `AUDIT_EVENT_CAPTURE_MATRIX.md`
- `PROTECTED_FUNCTION_INVENTORY.md`
- `PBI-110_AUDIT_INVENTORY.md`
- `PBI-111_DENIED_ACTION_AUDIT_POLICY.md`

### Process, backlog, and delivery method

Use this group for Scrum, SDLC, backlog, PBI, and task-decomposition guidance.

Target folder: `docs/process/`

Recommended files:

- `pbi-guideline.tex`
- `sdlc-guideline.tex`
- `decomposed_tasks.csv`

### Sprint planning

Use this group for sprint-level planning notes. Keep sprint task files together so future work can trace scope by sprint without mixing them into architecture or contract docs.

Target folder: `docs/sprint-planning/`

Recommended files:

- `SPRINT1_TASKS.md`
- `SPRINT2_TASKS.md`
- `SPRINT3_TASKS.md`
- `SPRINT4_TASKS.md`

### Runbooks

Use this group for reproducible local operation, deployment smoke tests, API quickstarts, and supervisor walkthrough scripts.

Target folder: `docs/runbooks/`

Current examples:

- `local-demo.md`
- `postgres-local-dev.md`
- `fabric-local-network.md`
- `api-quickstart.md`
- `deployment-environment-guide.md`
- `deployment-smoke-test.md`
- `final-supervisor-demo-script.md`

### Evidence and QA artifacts

Use this group for validation records, QA notes, closure evidence, and test evidence. Evidence should stay separate from stable source-of-truth documentation.

Target folder: `docs/evidence/`

Suggested subfolders:

- `docs/evidence/qa/` for QA evidence such as `*_QA.md`
- `docs/evidence/pbi-closure/` for story or PBI closure evidence such as `*_CLOSURE_EVIDENCE.md`
- `docs/evidence/audit/` for audit/access-history implementation evidence such as `*_ACCESS_*_EVIDENCE.md`

Current examples:

- `PBI-043_MEMBER_REGISTRATION_QA.md`
- `PBI-048_ROLE_MANAGEMENT_QA.md`
- `PBI-053_ROLE_ASSIGNMENT_QA.md`
- `PBI-058_DEACTIVATION_QA.md`
- `PBI-068_CHECKLIST_QA.md`
- `PBI-073_DECISION_QA.md`
- `PBI-078_STATUS_HISTORY_QA.md`
- `PBI-125_ACCESS_AUDIT_CAPTURE_EVIDENCE.md`
- `PBI-126_SENSITIVE_READ_AUDIT_CAPTURE_EVIDENCE.md`
- `PBI-127_PBI120_CLOSURE_EVIDENCE.md`
- `PBI-129_ACCESS_HISTORY_QUERY_READ_MODEL_EVIDENCE.md`
- `PBI-130_ACCESS_HISTORY_API_EVIDENCE.md`
- `PBI-132_PBI121_ACCESS_HISTORY_SEARCH_CLOSURE_EVIDENCE.md`
- `PBI-134_ACCESS_AUDIT_EVENT_DETAIL_EVIDENCE.md`
- `PBI-135_ACCESS_AUDIT_EVENT_SEQUENCE_EVIDENCE.md`
- `PBI-136_MISSING_INCOMPLETE_SEQUENCE_HARDENING_EVIDENCE.md`
- `PBI-137_PBI122_EVENT_INSPECTION_CLOSURE_EVIDENCE.md`

### PBI artifacts, spikes, proposals, and inventories

Use this group for PBI-specific analysis outputs that are not general source-of-truth documentation and are not QA closure evidence.

Target folder: `docs/pbi-artifacts/`

Recommended files:

- `PBI-053_EVIDENCE.md`
- `PBI-098_GAP_NOTE.md`
- `PBI-099_BOUNDARY_OPTIONS.md`
- `PBI-100_CONTRACT_PROPOSAL.md`
- `PBI-104_EVIDENCE.md`
- `PBI-105_INVENTORY.md`
- `PBI-106_PROPOSAL.md`
- `PBI-109_EVIDENCE.md`
- `PBI-113_EVIDENCE.md`

### Reports and formal LaTeX documents

Use this group for formal project report or SRS source files.

Target folder: `docs/report/`

Recommended files:

- `srs-v3.tex`

### Business proposals and research drafts

Use this group for business proposal material, research appendices, and non-final draft documents. Existing `docs/drafts/` content can move here when the folder migration is applied.

Target folder: `docs/proposals/`

Recommended files:

- `business_proposal_digital_procurement_pls_seedbed.tex`
- `business_proposal_research_appendix.md`

## Migration guidance

When applying the folder migration, prefer one atomic Git commit from a local clone so history remains readable and the repository is not left in a partially moved state.

Recommended local command pattern:

```bash
mkdir -p docs/architecture docs/contracts docs/audit docs/process docs/sprint-planning \
  docs/evidence/qa docs/evidence/pbi-closure docs/evidence/audit \
  docs/pbi-artifacts docs/report docs/proposals

# Move files with git mv so Git can preserve rename history.
# Example:
# git mv docs/ARCHITECTURE.md docs/architecture/ARCHITECTURE.md
# git mv docs/API_CONTRACTS.md docs/contracts/API_CONTRACTS.md
# git mv docs/evidence/PBI-043_MEMBER_REGISTRATION_QA.md docs/evidence/qa/PBI-043_MEMBER_REGISTRATION_QA.md
# git mv docs/drafts/business_proposal_research_appendix.md docs/proposals/business_proposal_research_appendix.md
```

After moving files, search for stale links or references:

```bash
grep -R "docs/ARCHITECTURE.md\|docs/API_CONTRACTS.md\|docs/evidence/\|docs/drafts/" -n .
```

## Documentation rules going forward

1. Put stable, implementation-wide references in `architecture/`, `contracts/`, `audit/`, or `process/`.
2. Put sprint-specific planning notes in `sprint-planning/`.
3. Put validation proof, screenshots, QA results, and story-closure evidence in `evidence/`.
4. Put exploratory PBI outputs in `pbi-artifacts/` unless they become durable project contracts.
5. Put formal report/SRS source files in `report/`.
6. Put proposal drafts and research appendices in `proposals/`.
7. Avoid adding new files directly under `docs/` unless they are navigation files such as this README.
