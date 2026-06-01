# API / OpenAPI Tree

OpenAPI contract: `docs/contracts/openapi/openapi.yaml`.

The OpenAPI document currently declares 36 paths focused on auth, organizations, organization network, company ledger, productivity, source-to-award, invoices, closeout, notifications, and blockchain proof.

| API group | OpenAPI documented? | Backend route exists? | Route tested? | Frontend uses it? | Auth required? | Scope/role required? | Response envelope consistent? | Notes |
|---|---|---|---|---|---|---|---|---|
| Auth | Yes | Yes | Yes | Yes | login public, logout bearer | Session-owned | Yes | OIDC callback is readiness boundary. |
| Organizations/company profile | Yes | Yes | Yes | Yes | Yes except registration | Org/platform scopes | Yes | Safe profile only. |
| Organization Network | Yes for core graph/requests/ledger | Yes | Yes | Yes | Yes | Actor organization-scoped | Yes | Claim-boundary nodes are informational. |
| Productivity | Yes | Yes | Yes | Yes | Yes | Company actor | Yes | Fallback calculations are labeled. |
| Source to Award | Yes | Yes | Yes | Yes | Yes | buyer/procurement/source roles | Yes | PostgreSQL persistent after Issue 27. |
| Invoices | Yes | Yes | Yes | Yes | Yes | supplier/buyer/finance/financier as scoped | Yes | No real payment execution. |
| Procurement Closeout | Yes | Yes | Yes | Yes | Yes | buyer/closeout manager/admin read | Yes | Supplier performance read supported. |
| Notifications/email outbox | Yes | Yes | Route coverage through organization/productivity evidence | Yes | Yes | Organization-scoped | Yes | Local outbox only. |
| Blockchain proof | Yes | Yes | Yes | Yes | Yes | auditor/regulator/security/admin per route | Yes | No fake proof data. |
| Membership/RBAC | Not fully in OpenAPI | Yes | Yes | Yes | Yes | admin/org admin | Standard API envelope | Candidate OpenAPI expansion. |
| KYC/AML | Not fully in OpenAPI | Yes | Yes | Yes | Yes | compliance/admin/read roles | Standard API envelope | Candidate OpenAPI expansion. |
| Escrow | Not fully in OpenAPI | Yes | Yes | Yes | Yes | buyer/supplier/auditor scoped | Standard API envelope | Candidate OpenAPI expansion. |
| Documents/contracts/payments/integrations/reporting/security/ops | Partially or not in current OpenAPI | Yes | Yes | Partial frontend use | Yes | route-specific | Standard API envelope | Good next API contract completion area. |

## Undocumented Route Risk

The implementation surface is broader than the current OpenAPI contract. This is acceptable for the supervisor-demo/pilot-hardening baseline, but product-owner decisions should treat OpenAPI completion as a real integration-readiness task before external developers rely on the platform.

## Legacy Actor Header Risk

The auth contract says protected routes must derive actor identity from bearer sessions. Some tests still use actor-context scaffolding. Treat this as test compatibility, not product authorization behavior.
