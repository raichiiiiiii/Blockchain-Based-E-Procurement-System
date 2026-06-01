# Frontend Navigation Tree

The frontend is React/Vite with credential-only login. Navigation is role-derived from session state.

| Page/component | Actor served | Business goal | API calls | State shown | Limitations |
|---|---|---|---|---|---|
| LandingPage | Visitor | Explain product and route to sign in/register | none | Public overview | Must not imply production readiness. |
| LoginPage | Platform user | Credential sign-in | `/auth/login` | Username/password errors | No role shortcuts by design. |
| CompanyRegistrationPage | Company representative | Register organization | `/organizations/register` | Pending registration | No external registry verification. |
| Dashboard shell | All authenticated actors | Role-specific entry | session/dashboard state | Actor, organization, nav | Depends on backend session. |
| CompanyContextBanner | Company users | Show organization status/eligibility | company summary | Safe org context | No raw KYC details. |
| OrganizationNetworkPage | Buyer/supplier/financier/admin | Inspect relationships/proof vectors | graph/trail APIs | Nodes, edges, claim boundaries | Not production Fabric topology. |
| CompanyLedgerPage | Company users | View private deal projections | company ledger APIs | Deal projections | Projection/read model only. |
| CompanyProductivityPage | Company admins/finance | Money tracker/action inbox | productivity APIs | Record-backed or fallback label | Some saved state process-local. |
| SourceToAwardPage | Requester/approver/procurement/supplier | Run S2A case | source-to-award APIs | Requisition/RFQ/quote/award | No budget/catalog engine. |
| InvoiceWorkspacePage | Supplier/buyer/finance | Submit/review invoices | invoice APIs | Match and approval state | No real AP rail. |
| SupplierPerformancePage | Buyer/procurement | Closeout and scorecards | closeout APIs | Metrics and performance | Needs historical data for pilot. |
| AccountSettingsPage | Org admin | Profile settings | own-profile API | Safe profile data | No consent engine. |
| OrganizationUsersPage | Org/platform admin | Manage company users | users API | User/role list | No external IdP user lifecycle. |
| ContractNegotiationPage | Buyer/supplier | Machine-readable terms | contract APIs | Terms/offers/acceptance | Not legal signing. |
| DocumentWorkspacePage | Buyer/supplier | Upload/extract metadata | document APIs | Checksum/extraction/signature status | Local storage only. |
| EscrowOverviewPage / EscrowDetailPage | Buyer/supplier/auditor | Escrow create/release/dispute status | escrow and proof APIs | Status/proof | No payment movement. |
| ExportBundlePage | Regulator/auditor | Export and verify evidence | export APIs | Manifest/signature/proof | No portal integration. |
| FinancingDashboard | Financier/Shariah | PLS and scenario view | financing APIs | Contracts/distributions/simulation | Seedbed only. |
| SecurityDashboard | Security operator/admin | View alerts | security alerts API | Denied/proof/ops alerts | Read-only. |
| Access history/detail/sequence pages | Admin/auditor | Inspect audit events | access history APIs | Event detail/sequence | Sequence is limited evidence, not full legal chain. |
| API clients under `src/frontend/api` | Frontend modules | Typed backend access | REST APIs | Error envelopes | OpenAPI coverage is core but not every route. |
| `role-navigation.ts` | Authenticated shell | Show authorized nav | session role codes | Product labels only | UI hiding is not authorization. |

## Navigation Rule

Direct navigation must still rely on backend authorization. The frontend may hide unauthorized navigation, but protected API routes remain the authority.
