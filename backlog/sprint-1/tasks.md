# Sprint 1 Task Decomposition

## Parent PBI-003 — Permissioned membership and role management

### Story PBI-031 — Register a member organization

- **PBI-039 — Do define member organization schema, uniqueness rules, and membership status model**
  - Depends on: `PBI-031`
  - Covers: `PBI-031 AC1, AC2`
  - Key output: entity fields, uniqueness rule, status values, API request/response contract
  - Evidence: reviewed schema/API note, status model, validation rules

- **PBI-040 — Do implement member organization creation API and service validation**
  - Depends on: `PBI-031`, `PBI-039`
  - Covers: `PBI-031 AC1, AC2`
  - Key output: create endpoint/service, duplicate checks, required-field validation, persistence logic
  - Evidence: API response samples, unit tests, integration tests

- **PBI-041 — Do implement administrator registration UI and error feedback for member onboarding**
  - Depends on: `PBI-031`, `PBI-039`
  - Covers: `PBI-031 AC1, AC2`
  - Key output: create form, field validation feedback, success/error states
  - Evidence: UI screenshots, functional test cases

- **PBI-042 — Do implement organization-creation authorization, audit logging, and protected data handling**
  - Depends on: `PBI-031`, `PBI-040`
  - Covers: `PBI-031 AC1`
  - Key output: admin-only access, create-event audit record, sensitive-field handling rules
  - Evidence: audit log sample, access-control test results

- **PBI-043 — Do execute end-to-end validation, regression checks, documentation updates, and demo evidence for member organization registration**
  - Depends on: `PBI-031`, `PBI-040`, `PBI-041`, `PBI-042`
  - Covers: `PBI-031 AC1, AC2`, DoD
  - Key output: test evidence, updated docs, demo-ready flow
  - Evidence: test run IDs, screenshots, API examples, acceptance note

### Story PBI-032 — Define and maintain platform roles

- **PBI-044 — Do define role catalog model, constraints, and reference data**
  - Depends on: `PBI-032`
  - Covers: `PBI-032 AC1, AC2`
  - Key output: role entity, allowed attributes, uniqueness rules, status rules
  - Evidence: reviewed role model and validation rules

- **PBI-045 — Do implement role management API and duplicate/invalid-role validation**
  - Depends on: `PBI-032`, `PBI-044`
  - Covers: `PBI-032 AC1, AC2`
  - Key output: create/update role service, validation, persistence
  - Evidence: API tests, negative validation tests

- **PBI-046 — Do implement administrator role management UI and system feedback**
  - Depends on: `PBI-032`, `PBI-044`
  - Covers: `PBI-032 AC1, AC2`
  - Key output: role maintenance screen, success/error states
  - Evidence: UI screenshots, functional tests

- **PBI-047 — Do implement authorization boundaries, audit logging, and role status checks**
  - Depends on: `PBI-032`, `PBI-045`
  - Covers: `PBI-032 AC1`
  - Key output: admin-only changes, role-change audit events, inactive-role handling
  - Evidence: access-control results, audit samples

- **PBI-048 — Do execute role-management testing, regression checks, documentation updates, and demo evidence**
  - Depends on: `PBI-032`, `PBI-045`, `PBI-046`, `PBI-047`
  - Covers: `PBI-032 AC1, AC2`, DoD
  - Key output: test evidence, updated docs, demo-ready role flow
  - Evidence: test run IDs, screenshots, PO review material

### Story PBI-033 — Assign platform roles to member users

- **PBI-049 — Do define user-to-organization and user-to-role assignment rules and preconditions**
  - Depends on: `PBI-033`, `PBI-039`, `PBI-044`
  - Covers: `PBI-033 AC1, AC2`
  - Key output: assignment rules, allowed transitions, dependency assumptions, error cases
  - Evidence: reviewed assignment rules and precondition list

- **PBI-050 — Do implement role assignment service for assign, change, and remove actions**
  - Depends on: `PBI-033`, `PBI-049`, `PBI-040`, `PBI-045`
  - Covers: `PBI-033 AC1, AC2`
  - Key output: assignment API/service, membership checks, invalid-role handling
  - Evidence: unit tests, integration tests, API response samples

- **PBI-051 — Do implement administrator role-assignment UI and operational feedback**
  - Depends on: `PBI-033`, `PBI-049`, `PBI-050`
  - Covers: `PBI-033 AC1, AC2`
  - Key output: assign/change/remove UI, feedback for invalid conditions
  - Evidence: UI screenshots, functional tests

- **PBI-052 — Do implement permission checks, audit logging, and invalid-assignment prevention**
  - Depends on: `PBI-033`, `PBI-050`
  - Covers: `PBI-033 AC1, AC2`
  - Key output: admin-only assignment, audit trail, blocked invalid assignments
  - Evidence: audit log samples, negative test results

- **PBI-053 — Do execute role-assignment testing with seeded data, documentation updates, and demo evidence**
  - Depends on: `PBI-033`, `PBI-050`, `PBI-051`, `PBI-052`
  - Covers: `PBI-033 AC1, AC2`, DoD
  - Key output: seeded test data, regression results, updated docs, demo flow
  - Evidence: test run IDs, screenshots, acceptance evidence

### Story PBI-034 — Block access for deactivated members

- **PBI-054 — Do define deactivation rules, protected-function list, and access-denial behavior**
  - Depends on: `PBI-034`, `PBI-039`
  - Covers: `PBI-034 AC1, AC2`
  - Key output: deactivation semantics, protected route list, expected denial messages
  - Evidence: reviewed rule set and protected-function inventory

- **PBI-055 — Do implement member and user deactivation handling in access-control services**
  - Depends on: `PBI-034`, `PBI-054`, `PBI-050`
  - Covers: `PBI-034 AC1, AC2`
  - Key output: effective-access checks, deactivation status evaluation
  - Evidence: unit tests, integration tests

- **PBI-056 — Do integrate protected endpoints and UI guards with deactivation checks**
  - Depends on: `PBI-034`, `PBI-054`, `PBI-055`
  - Covers: `PBI-034 AC1, AC2`
  - Key output: guarded routes/actions, denial feedback in API/UI
  - Evidence: blocked-access screenshots, endpoint tests

- **PBI-057 — Do implement deactivation audit logging, regression safeguards for active members, and configuration controls**
  - Depends on: `PBI-034`, `PBI-055`
  - Covers: `PBI-034 AC1, AC2`
  - Key output: access-denial logs, active-user regression checks, any needed feature/config toggle
  - Evidence: audit samples, regression test results

- **PBI-058 — Do execute access-control validation, documentation updates, and demo evidence for deactivated-member blocking**
  - Depends on: `PBI-034`, `PBI-055`, `PBI-056`, `PBI-057`
  - Covers: `PBI-034 AC1, AC2`, DoD
  - Key output: end-to-end validation, docs, demo of allow/deny behavior
  - Evidence: test run IDs, screenshots, log excerpts

---

## Parent PBI-020 — Shariah governance workflow for PLS approvals

### Story PBI-035 — Submit a PLS item for Shariah review

- **PBI-059 — Do define review-request schema, mandatory metadata, and initial workflow status rules**
  - Depends on: `PBI-035`
  - Covers: `PBI-035 AC1, AC2`
  - Key output: review-request fields, required metadata, Submitted state, validation rules
  - Evidence: reviewed schema and state model

- **PBI-060 — Do implement review-request API and service validation for submission**
  - Depends on: `PBI-035`, `PBI-059`
  - Covers: `PBI-035 AC1, AC2`
  - Key output: submission service, mandatory-field validation, persistence, Submitted transition
  - Evidence: API tests, negative validation tests

- **PBI-061 — Do implement coordinator submission UI and validation feedback for review requests**
  - Depends on: `PBI-035`, `PBI-059`
  - Covers: `PBI-035 AC1, AC2`
  - Key output: submit form, validation messages, success state
  - Evidence: UI screenshots, functional tests

- **PBI-062 — Do implement request access control, audit logging, and reference or attachment handling**
  - Depends on: `PBI-035`, `PBI-060`
  - Covers: `PBI-035 AC1`
  - Key output: coordinator access restriction, create-event audit log, linked-reference handling
  - Evidence: audit samples, permission test results

- **PBI-063 — Do execute review-submission validation, documentation updates, and demo evidence**
  - Depends on: `PBI-035`, `PBI-060`, `PBI-061`, `PBI-062`
  - Covers: `PBI-035 AC1, AC2`, DoD
  - Key output: test evidence, updated docs, demo-ready submission flow
  - Evidence: test run IDs, screenshots, acceptance evidence

### Story PBI-036 — Record the review checklist outcome

- **PBI-064 — Do define checklist structure, mandatory entries, and completion rules**
  - Depends on: `PBI-036`, `PBI-059`
  - Covers: `PBI-036 AC1, AC2`
  - Key output: checklist schema, mandatory items, completion-state rules
  - Evidence: reviewed checklist model and completion logic

- **PBI-065 — Do implement reviewer checklist API and persistence of checklist outcomes**
  - Depends on: `PBI-036`, `PBI-064`, `PBI-060`
  - Covers: `PBI-036 AC1, AC2`
  - Key output: checklist save/update service, validation of required entries
  - Evidence: unit tests, integration tests, API samples

- **PBI-066 — Do implement reviewer checklist UI and incomplete-entry feedback**
  - Depends on: `PBI-036`, `PBI-064`, `PBI-065`
  - Covers: `PBI-036 AC1, AC2`
  - Key output: checklist screen, inline errors, completion workflow
  - Evidence: UI screenshots, functional tests

- **PBI-067 — Do implement checklist access control, audit logging, and state-transition guards**
  - Depends on: `PBI-036`, `PBI-065`
  - Covers: `PBI-036 AC1, AC2`
  - Key output: reviewer-only action, audit trail, submitted-to-reviewed guard behavior
  - Evidence: audit samples, negative state-transition tests

- **PBI-068 — Do execute checklist validation, regression checks, documentation updates, and demo evidence**
  - Depends on: `PBI-036`, `PBI-065`, `PBI-066`, `PBI-067`
  - Covers: `PBI-036 AC1, AC2`, DoD
  - Key output: end-to-end validation and updated guidance
  - Evidence: test run IDs, screenshots, acceptance material

### Story PBI-037 — Record governance decisions

- **PBI-069 — Do define decision states, rationale rules, and conditional-approval constraints**
  - Depends on: `PBI-037`, `PBI-064`
  - Covers: `PBI-037 AC1, AC2`
  - Key output: state transitions, mandatory rationale rules, conditional fields
  - Evidence: reviewed decision-state matrix

- **PBI-070 — Do implement decision API and service logic for approve, reject, and conditional approve**
  - Depends on: `PBI-037`, `PBI-069`, `PBI-065`
  - Covers: `PBI-037 AC1, AC2`
  - Key output: decision service, transition validation, persistence
  - Evidence: unit tests, integration tests, API samples

- **PBI-071 — Do implement reviewer decision UI and status feedback**
  - Depends on: `PBI-037`, `PBI-069`, `PBI-070`
  - Covers: `PBI-037 AC1, AC2`
  - Key output: decision form, conditional fields, saved decision feedback
  - Evidence: UI screenshots, functional tests

- **PBI-072 — Do implement decision access control, audit logging, and invalid-state prevention**
  - Depends on: `PBI-037`, `PBI-070`
  - Covers: `PBI-037 AC1, AC2`
  - Key output: reviewer-only decision action, audit trail, blocked invalid transitions
  - Evidence: audit samples, negative test results

- **PBI-073 — Do execute decision-flow validation, documentation updates, and demo evidence**
  - Depends on: `PBI-037`, `PBI-070`, `PBI-071`, `PBI-072`
  - Covers: `PBI-037 AC1, AC2`, DoD
  - Key output: validated approval/reject/conditional paths and updated docs
  - Evidence: test run IDs, screenshots, acceptance evidence

### Story PBI-038 — View approval status and decision history

- **PBI-074 — Do define status-history query model and review progression data contract**
  - Depends on: `PBI-038`, `PBI-069`
  - Covers: `PBI-038 AC1, AC2`
  - Key output: query contract, timeline model, current-status derivation rules
  - Evidence: reviewed query model and mapping rules

- **PBI-075 — Do implement status-history API and current-status query service**
  - Depends on: `PBI-038`, `PBI-074`, `PBI-070`
  - Covers: `PBI-038 AC1, AC2`
  - Key output: read service for current status and prior actions
  - Evidence: API tests, intermediate-state query tests

- **PBI-076 — Do implement coordinator status-history UI and empty/intermediate-state handling**
  - Depends on: `PBI-038`, `PBI-074`, `PBI-075`
  - Covers: `PBI-038 AC1, AC2`
  - Key output: status/history screen, decision summary, no-decision-yet handling
  - Evidence: UI screenshots, functional tests

- **PBI-077 — Do implement view permissions, audit read logging, and response hardening for history access**
  - Depends on: `PBI-038`, `PBI-075`
  - Covers: `PBI-038 AC1, AC2`
  - Key output: authorized-read checks, read audit logs, response shaping for incomplete histories
  - Evidence: permission test results, log samples

- **PBI-078 — Do execute status-history validation, regression checks, documentation updates, and demo evidence**
  - Depends on: `PBI-038`, `PBI-075`, `PBI-076`, `PBI-077`
  - Covers: `PBI-038 AC1, AC2`, DoD
  - Key output: validated history flow, updated user guidance, demo-ready transparency flow
  - Evidence: test run IDs, screenshots, acceptance material