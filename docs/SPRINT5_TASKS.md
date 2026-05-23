# Sprint 5 Tasks

Status: Draft execution sheet
Source of truth: backlog/backlog.csv
Last updated: 2026-05-23

## Sprint objective

Sprint 5 runs the current planned work with PBI-253 as a pre-merge platform gate before the three active feature branches are merged.

## Branches

| Order | Branch | Scope |
|---|---|---|
| 1 | feature/PBI-253-auth-session-management | Platform actor-context gate |
| 2 | feature/PBI-005-immutable-audit-trail | Immutable audit trail |
| 3 | feature/PBI-002-kyc-aml-onboarding | KYC and AML onboarding |
| 4 | feature/PBI-017-role-based-ui-dashboards | Role-based UI and dashboards |

## References

- docs/architecture/adr/ADR-001-dashboard-auth-boundary-and-state-flow.md
- docs/architecture/adr/ADR-002-auth-session-management-boundary.md
- docs/contracts/AUTH_SESSION_CONTRACT.md
- backlog/backlog.csv

## PBI-253 gate tasks

- PBI-254
- PBI-255
- PBI-256
- PBI-257
- PBI-258
- PBI-259
- PBI-260
- PBI-261
- PBI-262

## Team A tasks for PBI-005

- PBI-145
- PBI-164
- PBI-165
- PBI-166
- PBI-167
- PBI-168
- PBI-169
- PBI-170
- PBI-171
- PBI-149

## Team B tasks for PBI-002

- PBI-152
- PBI-153
- PBI-154
- PBI-155
- PBI-156
- PBI-157
- PBI-158
- PBI-159
- PBI-160
- PBI-161
- PBI-162
- PBI-163
- PBI-184
- PBI-185
- PBI-186
- PBI-187

## Team C tasks for PBI-017

- PBI-172
- PBI-173
- PBI-174
- PBI-175
- PBI-176
- PBI-177
- PBI-178
- PBI-179
- PBI-180
- PBI-181
- PBI-182
- PBI-183
- PBI-188
- PBI-189
- PBI-190
- PBI-191

## Merge rule

Do not merge PBI-005, PBI-002, or PBI-017 before PBI-253 unless a new ADR explicitly changes this rule.
