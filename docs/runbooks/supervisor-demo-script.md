# Supervisor Demo Script

Status: Commercial-readiness planning baseline
Audience: Supervisor, Scrum Master, Product Owner, demo operator
Duration: 15 to 20 minutes

## Demo Objective

Show the Digital Procurement and PLS Seedbed MVP as a coherent, compliance-first procurement evidence platform. The demo should prove that mandatory actors can sign in, perform their core workflow, inspect evidence, and understand what is ready versus what remains post-MVP.

The core message:

```text
This MVP helps regulated procurement and financing stakeholders control supplier onboarding, procurement evidence, escrow visibility, blockchain proof, Shariah review, PLS seedbed scenarios, and regulator export.
```

## Prerequisites

- Repository dependencies are installed or can be installed with `npm install`.
- PowerShell is available for the local startup script.
- Backend API port: `3100`.
- Frontend port: `5173`.
- Optional PostgreSQL service is available through Docker Desktop.
- Optional Fabric live network prerequisites are available if demonstrating beyond chaincode build/test.
- Demo account password is `demo-password`.
- The normal demo path uses database-seeded backend accounts. Local in-browser fallback and guided demo mode are disabled unless the operator explicitly enables `VITE_ENABLE_LOCAL_DEMO_FALLBACK=true` or `VITE_ENABLE_GUIDED_DEMO=true`.

Demo accounts:

```text
admin.demo
buyer.demo
supplier.demo
compliance.demo
shariah.demo
financier.demo
auditor.demo
regulator.demo
security.demo
```

## Startup Steps

Install dependencies if needed:

```powershell
npm install
```

Start the local demo:

```powershell
.\scripts\start-local-demo.ps1
```

Open:

```text
Frontend: http://localhost:5173
Backend API: http://localhost:3100/api/v1
```

PostgreSQL note:

```text
The local runbook documents PostgreSQL migration and seed. For the production-extension hardening path, use the seeded backend account path. If PostgreSQL is not running, record the blocker instead of silently presenting local browser-only data as backend data.
```

Fabric note:

```text
Chaincode build/test is automated. Live Fabric local-network deployment depends on local Hyperledger Fabric sample prerequisites and may be shown as documented smoke path rather than live infrastructure.
```

## 15 to 20 Minute Demo Timeline

| Time | Segment | Outcome |
|---:|---|---|
| 0:00-1:30 | Product frame | Explain the compliance-first procurement evidence platform and seedbed boundary. |
| 1:30-2:30 | Landing and sign in | Show root page, sign-in requirement, and credential-only login. |
| 2:30-4:00 | Administrator governance | Show Members, Roles, organization status, and Access History. |
| 4:00-5:30 | Compliance review | Show safe KYC/AML metadata and eligibility decision. |
| 5:30-7:00 | Buyer order | Create or inspect procurement order for supplier. |
| 7:00-8:00 | Contract documents | Upload contract text and show checksum, extraction fields, and local signature state. |
| 8:00-9:30 | Supplier acknowledgement and delivery evidence | Accept assigned order and record safe delivery evidence metadata. |
| 9:30-10:30 | Buyer delivery review | Show evidence hash, lifecycle event, and proof state on the order detail. |
| 10:30-12:00 | Escrow creation | Create escrow from accepted order and show escrow-created state. |
| 11:00-12:00 | Blockchain proof | Show proof panel and honest verification states. |
| 12:00-13:30 | Auditor verification | Verify proof or inspect audit/export evidence read-only. |
| 13:30-15:00 | Shariah review | Show checklist metadata and approval gate. |
| 15:00-16:30 | Financier PLS seedbed | Show approved PLS contract and distribution scenario. |
| 16:30-18:00 | Regulator export | Request export bundle and verify manifest integrity. |
| 18:00-19:00 | Evidence and validation | Point to UAT, authorization matrix, and release validation evidence. |
| 19:00-20:00 | Limitations | State what is deliberately post-MVP. |

## Step-by-Step Walkthrough

### 1. Landing Page

Action:

```text
Open http://localhost:5173
```

Show:

- product positioning
- workflow language
- sign-in path
- no backlog, sprint, or implementation labels in product UI

What to say:

```text
The product starts as an evidence workspace, not a developer dashboard. The root route presents the business value before any protected workflow is available.
```

### 2. Sign In

Action:

```text
Open Sign in and enter the issued demo username and password for the relevant actor.
```

Show:

- session-backed access
- role-specific dashboard after login
- sign out clears protected access

What to say:

```text
The product login path uses issued credentials only. Demo accounts are seeded in the database and documented in the runbook; protected actions depend on authenticated session context and backend authorization.
```

### 3. Administrator Governance

Sign in as `admin.demo`.

Show:

- Dashboard
- Members
- organization detail/status
- Roles
- Access History

What to say:

```text
The administrator controls the platform governance surface: organizations, role assignments, and access evidence.
```

### 4. Compliance KYC/AML Review

Sign in as `compliance.demo`.

Show:

- Compliance queue
- KYC case detail with safe metadata
- approve, reject, flag, or block decision
- eligibility status

What to say:

```text
Eligibility is a transaction gate. Pending, blocked, not eligible, and unknown states must not proceed into protected procurement actions.
```

### 5. Buyer Order

Sign in as `buyer.demo`.

Show:

- Orders
- create or inspect order for Barakah Supplies
- lifecycle metadata

What to say:

```text
Amanah Retail creates the order inside a governed workflow. The product is capturing business state and audit evidence together.
```

### 6. Supplier Acknowledgement

Sign in as `supplier.demo`.

Show:

- Received Orders
- assigned order detail
- accept/acknowledge action
- Delivery Evidence
- accepted order selection
- safe delivery evidence metadata form
- submitted evidence hash and lifecycle proof state

What to say:

```text
The supplier can act only on assigned accepted orders. Delivery evidence records a safe reference, notes, hash, and lifecycle event; it does not upload or render private documents.
```

### 7. Contract Documents

Sign in as `buyer.demo` or `supplier.demo`.

Show:

- Contract Documents
- Amanah-Barakah contract text upload
- checksum and storage reference
- extraction status and extracted parties/terms
- signature status with local metadata-only trust boundary

What to say:

```text
Document intake records metadata, checksum, extraction output, and signature state. It does not claim legal e-signature validation, OCR, malware scanning, or production document management.
```

### 8. Buyer Delivery Review

Return as `buyer.demo`.

Show:

- Orders
- selected order detail
- Delivery evidence panel
- evidence hash
- lifecycle event ID and hash
- proof panel with pending, failed, not anchored, or anchored state

What to say:

```text
The buyer can review delivery evidence metadata and proof state. A failed or unavailable proof is visible and is not treated as verified.
```

### 9. Escrow Creation

Return as `buyer.demo`.

Show:

- Escrow
- accepted order reference
- create escrow
- escrow-created status
- lifecycle event ID or hash metadata

What to say:

```text
Escrow is currently a first slice. It records escrow-created state and evidence; it does not execute payment settlement.
```

### 10. Blockchain Proof Panel

Show proof from escrow, audit event detail, or Blockchain Proof.

Show:

- anchored, pending, failed, or not anchored state
- verification result
- no fake transaction ID when proof is missing

What to say:

```text
The blockchain layer is proof infrastructure. Operational data stays off-chain, while selected event hashes can be anchored and verified.
```

### 11. Auditor Verification

Sign in as `auditor.demo`.

Show:

- Audit Trail or Blockchain Proof
- proof verification
- Export Bundle read path if useful

What to say:

```text
The auditor has read-only evidence tools. Verification states are explicit: verified, mismatch, not found, and unavailable are different outcomes.
```

### 12. Shariah Review

Sign in as `shariah.demo`.

Show:

- Shariah Review
- PLS review detail
- checklist metadata
- approve, conditional approve, or reject

What to say:

```text
The PLS seedbed is controlled by Shariah governance. Activation requires an approved reference and does not imply production Islamic finance certification.
```

### 13. Financier PLS Contract and Distribution

Sign in as `financier.demo`.

Show:

- Financing
- PLS contract detail
- Shariah approval reference
- profit and loss distribution scenario

What to say:

```text
The financier can inspect and simulate allocation scenarios. No external payments are executed and no profit or principal is guaranteed.
```

### 14. Regulator Export Bundle

Sign in as `regulator.demo`.

Show:

- Export Bundle
- request export
- bundle detail
- manifest hash verification

What to say:

```text
The regulator flow packages reviewable evidence with integrity metadata. Production signing and external regulator portal integration remain post-MVP.
```

### 15. Evidence, Runbook, and Validation

Show:

```text
docs/evidence/qa/PBI-424_ACTOR_UAT_SCRIPTS.md
docs/evidence/qa/PBI-425_AUTHORIZATION_REGRESSION_MATRIX.md
docs/evidence/qa/ACTOR_UAT_RESULTS.md
docs/evidence/qa/RELEASE_VALIDATION_RESULTS.md
docs/runbooks/local-demo.md
```

What to say:

```text
The demo is backed by documented UAT scripts, authorization checks, and validation evidence rather than a one-off walkthrough.
```

### 16. Known Limitations

Close by naming limits directly:

- not a production Fabric consortium
- not a production payment rail
- not full ERP or ISO20022 integration
- not production Islamic finance compliance
- not production document management, OCR, malware scanning, or legal signature validation
- not full DID/VC federation
- not a full arbitration module
- not a full tokenized receivables lifecycle

## What to Say to Supervisor

- "This is a supervisor-ready MVP demonstration of controlled procurement and financing evidence."
- "The strongest value is traceability: who acted, what changed, what evidence exists, and how proof can be verified."
- "Blockchain is used for proof anchoring, not as the application database."
- "PLS is shown as a restricted seedbed with Shariah approval gates, not as production financing automation."
- "Known limitations are deliberately visible so the release does not overclaim."

## What Not to Claim

Do not claim:

- production payment execution
- guaranteed profit or guaranteed principal
- production Islamic finance certification
- production Hyperledger Fabric consortium readiness
- external regulator portal integration
- external ERP/accounting integration
- ISO20022 payment processing
- raw KYC document review in the dashboard
- full settlement, release, dispute, or arbitration automation

## Troubleshooting

| Symptom | Likely cause | Action |
|---|---|---|
| Frontend does not open on port 5173 | Port already in use or Vite selected another port | Use the displayed Vite URL. |
| Backend unavailable | API process not running | Re-run `.\scripts\start-local-demo.ps1` or start backend from `docs/runbooks/local-demo.md`. |
| Login fails | Seed data not loaded or memory demo reset | Restart local demo and confirm demo credentials. |
| PostgreSQL fails | Docker not running or port conflict | Use memory-only demo path or follow `docs/runbooks/postgres-local-dev.md`. |
| Fabric proof unavailable | Local Fabric network not running | Use chaincode build/test evidence and show unavailable state honestly. |
| Delivery evidence submit fails | Order is not accepted or wrong supplier session is active | Accept the assigned order first, then retry from the supplier account. |
| Contract document extraction is unsupported | Binary PDF/DOCX extraction adapter is not connected | Use text/plain demo content or explain the explicit unsupported state. |
| Export verification mismatch | Wrong bundle hash submitted | Re-copy bundle hash from bundle detail and verify again. |
| Actor sees unexpected route | Wrong account session active | Sign out and sign in as the intended demo actor. |

## Acceptance Checklist

- [ ] Root route opens landing page.
- [ ] Sign in precedes dashboard access.
- [ ] Each mandatory actor reaches a role-specific dashboard.
- [ ] Administrator can inspect members, roles, and access history.
- [ ] Compliance reviewer can record eligibility decision with safe metadata only.
- [ ] Buyer can create or inspect order.
- [ ] Supplier can acknowledge assigned order.
- [ ] Supplier can submit delivery evidence metadata for an accepted order.
- [ ] Contract document upload shows checksum, extraction, and local signature state without raw content or legal signature overclaiming.
- [ ] Buyer can review delivery evidence hash, lifecycle event, and proof state.
- [ ] Buyer can create escrow from accepted order.
- [ ] Proof panel shows honest states and does not fabricate transaction IDs.
- [ ] Auditor can verify proof or inspect evidence read-only.
- [ ] Shariah reviewer can record decision.
- [ ] Financier can inspect approved PLS contract and distribution scenario.
- [ ] Regulator can request and verify export bundle metadata.
- [ ] Known limitations are stated before closing the demo.
