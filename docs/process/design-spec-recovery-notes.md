# Design Spec Recovery Notes

Status: Sprint 6 corrective note
Owner: Frontend Engineer / Scrum Master
Related document: `docs/process/design-spec.md`

## 1. Reason for this note

The Sprint 6 Figma prototype experiments were useful for exploring screen inventory, but they exposed design failure modes that must not be carried into implementation.

The next implementation should be code-first. Figma is exploratory only.

## 2. Source-of-truth priority

Use this order when implementing frontend and product workflow behavior:

1. `backlog/backlog.csv`
2. `docs/contracts/*.md`
3. `docs/architecture/*.md`
4. `docs/process/CODING_RULES.md`
5. `docs/process/design-spec.md`
6. `docs/process/design-spec-recovery-notes.md`
7. `docs/process/pbi-guideline.tex`
8. `docs/sprint-planning/SPRINT6_TASKS.md`
9. `docs/report/srs-v3.tex`
10. `docs/drafts/*.pdf`
11. Figma prototypes, exploratory only

## 3. Figma status

Figma prototypes may be used only as:

- rough screen inventory
- rough visual exploration
- examples of what to avoid

Figma prototypes must not be used as:

- final wording source
- final route map
- final navigation model
- final component structure
- final role-visibility source
- final workflow sequence

## 4. Failure modes to avoid

Do not repeat these in React implementation:

1. Reusing one generic template for every role.
2. Rendering internal design notes inside product screens.
3. Showing authenticated app navigation on the public landing page.
4. Showing proof panels on login or unrelated dashboard screens.
5. Writing UI copy that sounds like backlog or implementation notes.
6. Expanding to every actor before the buyer/auditor proof flow works.

## 5. Code-first implementation posture

Start with the smallest coherent product journey:

```text
Landing
-> Login
-> Buyer dashboard
-> Order detail
-> Escrow detail
-> Blockchain proof

Landing
-> Login
-> Auditor dashboard
-> Audit event detail
-> Verify proof
```

Supporting roles should be added after the core flow is usable.

## 6. Product copy rule

Use natural product labels:

```text
Sign in
View order
Review escrow
Verify proof
Proof verified
Proof mismatch
Proof service unavailable
Organization pending review
Account inactive
Search audit trail
Open case
Approve review
Request revision
Generate export
Download bundle
```

Do not use planning or implementation labels in the product UI:

```text
PBI
Sprint
Story
Task
Enabler
Backlog
Acceptance criteria
Screen purpose
Primary action
Workflow state
Permission matrix
```

## 7. Role navigation rule

Navigation must be role-specific.

Buyer:

```text
Dashboard
Orders
Escrow
Blockchain Proof
Settings
Logout
```

Auditor:

```text
Dashboard
Audit Trail
Blockchain Proof
Export Bundle
Settings
Logout
```

Compliance reviewer:

```text
Dashboard
KYC Review
Compliance
Access History
Settings
Logout
```

Shariah reviewer:

```text
Dashboard
Shariah Review
PLS Contract
Access History
Settings
Logout
```

Financier:

```text
Dashboard
Financing
PLS Contract
Distribution
Settings
Logout
```

Supplier:

```text
Dashboard
Orders
Delivery Evidence
Escrow Status
Settings
Logout
```

Administrator:

```text
Dashboard
Members
Roles
Access History
Settings
Logout
```

Security operator:

```text
Dashboard
Security Status
Access Alerts
Settings
Logout
```

Regulator / reporting user:

```text
Dashboard
Export Bundle
Audit Trail
Blockchain Proof
Settings
Logout
```

## 8. Acceptance checks

Implementation should pass these checks:

- root route opens a landing page
- login precedes dashboard access
- buyer sees buyer navigation only
- auditor sees auditor navigation only
- blockchain proof appears on escrow, audit-event, and export/proof result contexts only
- no product screen exposes backlog or sprint terminology
- unavailable and mismatch proof states never appear as verified
- mobile layout is not just a shrunken desktop layout
