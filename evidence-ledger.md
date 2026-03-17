# Packet-by-Packet Evidence Ledger

> Purpose: This ledger captures **public evidence only**. It does **not** finalize answers and does **not** resolve flags yet.

---

## Q-01 — Membership lifecycle default state

### Public evidence found
- NIST AC-2 treats account lifecycle actions such as create, enable, disable, and remove as explicit governed actions. 
- SCIM defines an `active` administrative status, where the value controls whether the account is operable. 
- GitHub organization invitations show a public pattern where membership can exist in a pending state before becoming effective, and invitations can expire. 

### What this evidence is necessary for
- Determining whether a newly created member organization should begin in a **gated** state rather than immediately becoming usable.
- Separating the notion of **record exists** from **record is active/operational**.
- Supporting future modeling for activation, suspension, expiry, and reactivation.

### What this evidence supports well
- A lifecycle model with at least one non-active pre-operational state.
- The idea that enablement should be deliberate rather than implicit.

### What this evidence does **not** settle yet
- The exact initial state label to use in your system.
- Whether the lifecycle should be 2-state, 3-state, or richer.
- Whether the gate is approval-driven, invitation-driven, validation-driven, or hybrid.

---

## Q-02 — Membership uniqueness and ID strategy

### Public evidence found
- ISO 17442-1 defines the LEI scheme for identifying legal entities relevant to financial transactions. 
- GLEIF describes the LEI as a unique 20-character alphanumeric code, with one LEI per entity. 
- SCIM distinguishes between provider-issued stable `id` and client-defined `externalId`. 

### What this evidence is necessary for
- Deciding whether your organization model should use:
  - a stable internal system ID,
  - a business identifier,
  - or both.
- Defining uniqueness constraints.
- Avoiding overloading a business identifier as the system primary key.

### What this evidence supports well
- A pattern of **stable internal ID + optional/required external business identifier**.
- Keeping external identifiers semantically meaningful without making them the sole system identity anchor.

### What this evidence does **not** settle yet
- Whether your system should require LEI, local registration number, both, or conditional alternatives by jurisdiction.
- Whether the business identifier is mandatory in Sprint 1.

---

## Q-03 — User identity model

### Public evidence found
- JWT defines `sub` as the principal identifier and `exp` as the token expiration boundary. 
- OpenID Connect provides an identity layer on top of OAuth 2.0 using claims about the authenticated end-user. 
- SCIM provides a public lifecycle vocabulary for user records, including operability via `active`. 

### What this evidence is necessary for
- Identifying what your system should treat as the authoritative user key.
- Determining the minimum identity attributes expected in authenticated requests.
- Understanding how suspension or deactivation should affect access and audit attribution.

### What this evidence supports well
- A token-based identity model with a stable subject identifier.
- Explicit user operability states rather than vague “enabled/disabled” behavior.

### What this evidence does **not** settle yet
- Whether Sprint 1 assumes local users, external IdP users, or both.
- Whether user provisioning is in-scope or out-of-scope for the sprint.

---

## Q-04 — Role catalog design

### Public evidence found
- OWASP states that in RBAC, permissions are assigned to roles rather than directly to users, and user-role relationships are generally many-to-many. 
- Kubernetes distinguishes role definitions from bindings, and separates namespace-scoped bindings from broader-scope bindings. 
- AWS IAM provides a deterministic policy evaluation pattern where explicit deny overrides allow. 

### What this evidence is necessary for
- Deciding whether roles should be modeled as reusable definitions plus scoped assignments.
- Preventing direct user-permission sprawl.
- Structuring permission logic so it is testable and predictable.

### What this evidence supports well
- A clean RBAC shape:
  - role definitions,
  - bindings/assignments,
  - explicit scope,
  - deterministic permission evaluation.

### What this evidence does **not** settle yet
- The exact role names and role inventory for your domain.
- Which roles are global, organization-scoped, reviewer-scoped, or reserved.

---

## Q-05 — Assignment multiplicity and conflict rules

### Public evidence found
- OWASP states RBAC relationships are generally many-to-many. 
- Kubernetes RoleBinding demonstrates separate assignment objects attaching subjects to roles within a scope. 
- AWS IAM offers a public example of deterministic conflict handling with explicit deny precedence. 
- NIST AC-2 requires organization-defined prerequisites and criteria for role/group membership. 

### What this evidence is necessary for
- Deciding whether one user may hold multiple roles.
- Deciding whether assignments are additive by default.
- Defining assignment preconditions such as active user, active organization, and valid scope.

### What this evidence supports well
- Multi-role assignment as a legitimate default.
- Assignment modeled separately from role definition.
- Preconditions and conflict rules as first-class business rules.

### What this evidence does **not** settle yet
- Your exact separation-of-duties policy.
- Whether certain role combinations are forbidden in the same organization or workflow.

---

## Q-06 — Deactivation and protected functions

### Public evidence found
- NIST AC-2 treats disable/remove as explicit lifecycle actions. 
- SCIM supports disable-without-delete through `active`. 
- OWASP recommends deny-by-default access control. 
- GitHub SCIM deprovisioning preserves the account while removing effective access. 
- NIST AU-3 requires records rich enough to reconstruct what happened, by whom, when, where, and with what result. 

### What this evidence is necessary for
- Defining which actions a deactivated entity must no longer perform.
- Preserving visibility of prior records and history.
- Determining whether denied attempts should still be logged.

### What this evidence supports well
- A non-destructive deactivation pattern.
- “Block operational access, keep audit trail and history.”
- Tight linkage between status and endpoint enforcement.

### What this evidence does **not** settle yet
- The exact list of protected functions in your application.
- Whether some read actions remain allowed while all writes are denied.

---

## Q-07 — Shariah review request submission metadata

### Public evidence found
- IFSB-10 says an IIFS should maintain a Shariah Process Manual specifying how submissions or requests for pronouncements are made and how compliance with decisions is ensured. 
- IFSB-10 also requires relevant documentation for new products/services to be endorsed and validated, and that Shariah opinions be recorded in writing. 
- IFSA section 35 requires institutions and officers to provide documents/information required by the Shariah committee and ensure that the materials are accurate, complete, and not misleading. 
- IFSB-31 requires documenting the process of obtaining rulings and disclosing the rationale behind them. 

### What this evidence is necessary for
- Justifying the need for structured submission metadata.
- Supporting inclusion of rationale, supporting materials, decision records, and traceability.
- Supporting completeness checks before review proceeds.

### What this evidence supports well
- Submission should not be a bare free-text request.
- Supporting documents and written rationale are governance-relevant.
- Records of decision and reasoning matter.

### What this evidence does **not** settle yet
- The exact field-level submission form for your product.
- Which fields are mandatory versus optional in Sprint 1.
- Whether the submission is one-step or multi-stage.

---

## Q-08 — Reference handling for attachments and links

### Public evidence found
- AWS S3 presigned URLs provide a public secure pattern for temporary upload/download access and support checksum-based integrity validation. 
- Microsoft Graph and Google Drive upload flows show mature public patterns for externalized file transfer/session-based uploads. 
- OpenAPI/Swagger supports standard multipart binary upload contracts. 
- IFSA supports confidentiality-sensitive handling of Shariah committee materials. 

### What this evidence is necessary for
- Deciding whether your system should support:
  - file upload,
  - reference links,
  - or both.
- Defining the metadata that must accompany attachments or references.
- Informing secure storage and access design.

### What this evidence supports well
- External object storage plus metadata in the app.
- Temporary access mechanisms instead of permanent public URLs.
- Integrity and confidentiality considerations as part of attachment design.

### What this evidence does **not** settle yet
- Your exact storage architecture.
- Retention, residency, and regulator-specific document handling obligations.
- Whether external URLs are acceptable in all cases.

---

## Q-09 — Checklist source, configurability, and versioning

### Public evidence found
- IFSB-10 explicitly states there is no single one-size-fits-all Sharīʻah governance model. 
- OWASP logging guidance warns there is no one-size-fits-all checklist and that naive checklist use can create noise. 
- NIST CA-5 requires plans of action and milestones to document remediation and update those records from assessments, audits, and monitoring. 

### What this evidence is necessary for
- Deciding whether the checklist should be hardcoded, seeded, or configurable.
- Supporting versioning and remediation tracking rather than fixed yes/no capture.
- Avoiding a brittle checklist model that cannot evolve.

### What this evidence supports well
- A controlled baseline with the ability to evolve.
- Checklist items as governed artifacts, not arbitrary UI toggles.
- A linkage between checklist findings and remediation tracking.

### What this evidence does **not** settle yet
- The exact checklist taxonomy for your domain.
- How much configurability should be exposed in Sprint 1.
- Whether checklist administration belongs to product config or governance admin tooling.

---

## Q-10 — Decision workflow, conditional approval, and status history

### Public evidence found
- IFSB-31 says that when Shariah governance deficiencies are identified, supervisors should require prompt remedial action, set timetables, and use escalation where appropriate. 
- IFSB-31 also requires documentation of the ruling process and the rationale behind rulings. 
- FedRAMP POA&M guidance provides a public remediation-tracking pattern for weaknesses, deficiencies, and milestones. 
- NIST AU-3 and OWASP logging guidance support structured records that reconstruct what happened and when. 

### What this evidence is necessary for
- Supporting a non-binary workflow rather than only approved/rejected.
- Justifying conditional approval with tracked remediation, due dates, and escalation.
- Justifying a dedicated status-history timeline rather than storing only the current state.

### What this evidence supports well
- Intermediate or condition-bearing outcomes are governance-compatible.
- History should preserve actor, timestamp, change, and rationale.
- Remediation tracking can be part of the workflow, not an afterthought.

### What this evidence does **not** settle yet
- The exact state machine for your application.
- The precise names of intermediate statuses.
- The exact closure rule for conditions.

---

# Cross-Packet Summary

## Strongest-evidence packets
- **Q-01** Membership lifecycle
- **Q-02** ID strategy
- **Q-03** User identity model
- **Q-04** Role catalog structure
- **Q-05** Assignment multiplicity structure
- **Q-06** Deactivation pattern
- **Q-10** Conditional approval and history pattern

These are strongly supported because they rely on mature public standards or formal guidance on lifecycle, identity, RBAC, audit, and remediation. 

## Principle-strong but template-weak packets
- **Q-07** Submission metadata
- **Q-08** Attachment/reference handling
- **Q-09** Checklist source and versioning

These have solid governance and implementation principles, but they do not yet provide a ready-made field-perfect domain template. 

## Main unresolved boundary before flag filling
The remaining gap is mostly **not lack of public support**. The remaining gap is the absence of a single authoritative public template for:
- exact Shariah submission fields,
- exact checklist taxonomy,
- exact conditional-approval state labels,
- exact jurisdictional business identifier requirements. 