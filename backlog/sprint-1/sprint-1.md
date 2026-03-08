# Sprint 1 BPI Decomposition

## Parent PBI-003 — Permissioned membership and role management

### PBI-031 — As an administrator, I want to register a member organization, so that participating organizations can be onboarded into the platform
- **Type:** Story
- **Purpose:** Establish the initial organization record required for membership management.
- **Scope:** organization profile creation, unique organization identifier, active/inactive membership state.
- **Out of scope:** user-role assignment, fine-grained authorization rules.

### PBI-032 — As an administrator, I want to define and maintain platform roles, so that access can be governed consistently
- **Type:** Story
- **Purpose:** Create the baseline role catalogue for controlled access.
- **Scope:** role creation, role update, role visibility, role status.
- **Out of scope:** user assignment and runtime authorization enforcement.

### PBI-033 — As an administrator, I want to assign platform roles to member users, so that each user can access only the functions required for their responsibilities
- **Type:** Story
- **Purpose:** Bind users to the role model defined by the platform.
- **Scope:** assign role, change role, remove role, validate organization membership before assignment.
- **Out of scope:** deactivation of organization membership.

### PBI-034 — As the platform, I want to block access for deactivated members, so that removed organizations and users cannot use protected functions
- **Type:** Story
- **Purpose:** Enforce membership state at access time.
- **Scope:** deactivate member organization, revoke effective access, deny protected action attempts.
- **Out of scope:** non-repudiation and advanced audit analytics.

### Recommended Sprint 1 delivery order for PBI-003
1. PBI-031
2. PBI-032
3. PBI-033
4. PBI-034

---

## Parent PBI-020 — Shariah governance workflow for PLS approvals

### PBI-035 — As a compliance coordinator, I want to submit a PLS item for Shariah review, so that governance starts from a formal and traceable request
- **Type:** Story
- **Purpose:** Start the approval workflow with a controlled submission record.
- **Scope:** review request creation, mandatory metadata, initial workflow status.
- **Out of scope:** final reviewer decision and downstream activation enforcement.

### PBI-036 — As a Shariah reviewer, I want to record the review checklist outcome, so that the basis of the governance decision is documented
- **Type:** Story
- **Purpose:** Capture the review evidence and checklist completion before decisioning.
- **Scope:** checklist completion, review comments, completion status.
- **Out of scope:** final approve/reject status transition.

### PBI-037 — As a Shariah reviewer, I want to record approve, reject, or conditional-approve decisions, so that governance outcomes are explicit and auditable
- **Type:** Story
- **Purpose:** Capture the formal governance outcome of the review.
- **Scope:** approval decision, rejection reason, conditional approval notes, workflow state transition.
- **Out of scope:** contract activation gating.

### PBI-038 — As a compliance coordinator, I want to view the current approval status and decision history, so that I can track governance progress and outcomes
- **Type:** Story
- **Purpose:** Provide workflow transparency for follow-up and reporting.
- **Scope:** current status display, history of review actions, decision summary.
- **Out of scope:** regulator export bundle and lifecycle linkage to PLS execution.

### Recommended Sprint 1 delivery order for PBI-020
1. PBI-035
2. PBI-036
3. PBI-037
4. PBI-038