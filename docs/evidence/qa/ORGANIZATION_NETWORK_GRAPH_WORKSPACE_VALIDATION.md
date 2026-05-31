# Organization Network Graph Workspace Validation

Date: 2026-05-31
Branch: `codex/issue-14-evidence-contract-follow-up`
Related issue: GitHub Issue #14

## Scope

This evidence covers the Organization Network product workspace for PBI-467,
PBI-468, PBI-469, and PBI-470.

## Acceptance Review

| Requirement | Result | Evidence |
| --- | --- | --- |
| Current organization node renders | Passed | `src/frontend/pages/OrganizationNetworkPage.tsx`; browser smoke from `PBI-463_TO_PBI-472_ORGANIZATION_NETWORK_VALIDATION.md` |
| Connected organization nodes render | Passed | Seeded Amanah, Barakah, and Mabrur relationships from `scripts/db/seed-demo-data.ts` |
| Directional vectors render | Passed | Custom SVG graph in `OrganizationNetworkPage.tsx` |
| Channel/scope indicators distinguish shared, private, local-only, and unavailable scopes | Passed | CSS classes in `src/frontend/styles/components.css`; graph edge scope labels |
| Hover summaries exist for nodes and vectors | Passed | `nodeHoverSummary` and `edgeHoverSummary` in `OrganizationNetworkPage.tsx` |
| Left Blockchain Trail panel can open/close | Passed | `Show trail` / `Hide trail` panel toggle |
| Right Establish Network panel can open/close | Passed | `Show actions` / `Hide actions` panel toggle |
| Right panel can send network request | Passed | `POST /api/v1/organization-network/requests` frontend flow |
| Graph does not expose restricted payloads | Passed | Graph contract exposes safe metadata and proof hashes only |

## Graph Library Decision

No graph library was added. A custom SVG graph was selected because the current
workspace needs a compact deterministic relationship projection, proof-scope
edge styles, and click/hover summaries without a full graph-editor dependency.
The contract remains compatible with a future graph library if interaction
needs become more complex.

## Validation

Final validation commands and results are recorded in
`docs/evidence/qa/PBI-463_TO_PBI-472_ORGANIZATION_NETWORK_VALIDATION.md` and
the follow-up task ledger entry.

## Known Limitations

- Channel labels are proof/visibility-scope aliases, not production Fabric
  channel membership claims.
- Start-trade behavior currently prepares the user to move to governed order
  creation; it does not create payment, escrow release, or eligibility override.
- The graph is a compact workspace projection, not a full visual graph editor.
