# Production Fabric Consortium Architecture

Date: 2026-05-26
Owner: Blockchain Engineer / Platform Operator
Related PBIs: PBI-437, PBI-438
Readiness statement: production-extension plan and foundation only. This is not a live production Fabric consortium deployment.

## Purpose

This document defines the production-oriented Hyperledger Fabric consortium model for the Digital Procurement and PLS Seedbed. It extends the local `AuditAnchorContract` baseline while preserving the existing rule that PostgreSQL remains the operational system of record and Fabric stores only proof-level metadata, hashes, governance references, and selected private-data hashes.

The intended next state is a deployable internal pilot foundation. It does not claim production consortium operation, formal external governance, production CA lifecycle, payment settlement, or regulatory certification.

## Official References Reviewed

The plan uses the following Hyperledger Fabric documentation as reference material:

- Fabric introduction: https://hyperledger-fabric.readthedocs.io/en/latest/whatis.html
- MSP and membership: https://hyperledger-fabric.readthedocs.io/en/latest/membership/membership.html
- Chaincode lifecycle: https://hyperledger-fabric.readthedocs.io/en/latest/chaincode_lifecycle.html
- Endorsement policies: https://hyperledger-fabric.readthedocs.io/en/latest/endorsement-policies.html
- Private data: https://hyperledger-fabric.readthedocs.io/en/latest/private-data/private-data.html

Applied findings:

- Fabric is suitable for enterprise permissioned networks where participants are identified and the network is permissioned.
- MSPs map trusted certificate authorities and identities to organizations, roles, and permissions.
- Chaincode lifecycle requires organizations to package, install, approve, and commit chaincode definitions, with channel lifecycle endorsement separate from business endorsement.
- Endorsement policies decide which organization peers must endorse ledger writes.
- Private data collections keep private values with authorized organizations while other organizations and the ordering service see hashes.

## Consortium Participants

| Participant | Fabric organization | MSP ID template | Primary responsibilities |
| --- | --- | --- | --- |
| Platform operator | Platform Operator Org | `PlatformOperatorMSP` | Network operations, channel governance coordination, chaincode release packaging, proof service operations. |
| Buyer organization | Buyer Org | `BuyerMSP` | Procurement order proof endorsement, escrow governance participation, buyer-side private proof retention. |
| Supplier organization | Supplier Org | `SupplierMSP` | Order acceptance and delivery proof endorsement, supplier-side private proof retention. |
| Financier organization | Financier Org | `FinancierMSP` | PLS financing proof, escrow funding/release governance, financing private proof retention. |
| Auditor / regulator organization | Regulator Auditor Org | `RegulatorAuditorMSP` | Read-only audit node, export proof verification, governance observer endorsement where required. |

The template deliberately separates application roles from Fabric MSP identities. A platform user may be an administrator, auditor, buyer, supplier, financier, Shariah reviewer, or operator in the application, but Fabric transactions must still be submitted using scoped gateway identities issued by the relevant consortium organization.

## Channel Design

| Channel | Members | Purpose | Raw data rule |
| --- | --- | --- | --- |
| `procurement-proof-channel` | Platform, Buyer, Supplier, Financier, Regulator/Auditor | Shared lifecycle proof anchoring for procurement, escrow, delivery, Shariah/PLS, and export events. | Hashes and metadata only. |
| `regulated-export-channel` | Platform, Regulator/Auditor | Signed export manifest proof and regulator verification references. | Manifest hash, signature reference, certificate/key id only. |
| `pls-governance-channel` | Platform, Financier, Regulator/Auditor, optional Shariah board MSP later | PLS certificate and Shariah decision proof references. | Certificate hash, terms hash, decision status, version references only. |

The first production-extension implementation may deploy only `procurement-proof-channel` and keep the other two as templates. Adding a channel requires an ADR and runbook update.

## MSP and CA Policy

Minimum policy:

- Every Fabric organization must have a distinct MSP ID.
- Enrollment CA and TLS CA must be separated or explicitly documented if a shared CA is used in a pilot.
- Admin, peer, client, and orderer identities must use Node OU roles where supported.
- Application service identities must be client identities, not organization admin identities.
- Certificate rotation must be rehearsed before any external pilot.
- Revoked identities must be removed from the relevant MSP / CRL and blocked at the backend gateway configuration.

## Chaincode Modules

| Chaincode | First channel | Purpose | MVP status |
| --- | --- | --- | --- |
| `audit-anchor` | `procurement-proof-channel` | Append-only anchor of off-chain event hashes. | Existing local chaincode baseline. |
| `escrow-governance` | `procurement-proof-channel` | Proof of escrow state transitions: created, funded, release-ready, release-approved, disputed, cancelled. | Template only. |
| `export-proof` | `regulated-export-channel` | Signed export manifest proof references. | Template only. |
| `pls-certification-proof` | `pls-governance-channel` | Shariah certificate artifact hashes and PLS template/version proof references. | Template only. |

Only `audit-anchor` has current executable chaincode. Future modules require separate domain contracts and tests before deployment.

## Endorsement Policy Targets

| Chaincode | Suggested endorsement policy | Rationale |
| --- | --- | --- |
| `audit-anchor` | `OutOf(2, 'PlatformOperatorMSP.peer', 'BuyerMSP.peer', 'SupplierMSP.peer', 'FinancierMSP.peer', 'RegulatorAuditorMSP.peer')` | Any two relevant consortium peers can attest proof writes while avoiding single-operator control. |
| `escrow-governance` | `AND('PlatformOperatorMSP.peer', OutOf(1, 'BuyerMSP.peer', 'SupplierMSP.peer', 'FinancierMSP.peer'))` | Platform and at least one transaction-side organization endorse escrow state proofs. |
| `export-proof` | `AND('PlatformOperatorMSP.peer', 'RegulatorAuditorMSP.peer')` | Export manifest proof requires operator and regulator/auditor involvement. |
| `pls-certification-proof` | `AND('PlatformOperatorMSP.peer', 'FinancierMSP.peer', 'RegulatorAuditorMSP.peer')` | PLS certificate proof requires operator, financier, and regulated evidence visibility. |

These are templates. Final policy must be approved by consortium governance and load-tested before any external pilot.

## Private Data Collection Boundaries

Private data collections are optional for the first production-like deployment. They must never be used to hide raw private documents on-chain. Store raw documents off-chain and place only hashes/references in Fabric.

Template collections:

- `collectionEscrowTermsProof`: terms hash and state-transition proof metadata shared by buyer, supplier, financier, platform, and regulator/auditor.
- `collectionPlsCertificationProof`: certificate hash, template version, approval status, and expiry metadata shared by platform, financier, and regulator/auditor.
- `collectionExportManifestProof`: export manifest hash, detached signature reference, and signing profile id shared by platform and regulator/auditor.
- `collectionDeliveryProofHash`: delivery proof hash and verification status shared by platform, buyer, supplier, and regulator/auditor.

Collection-level endorsement policies should be equal to or stricter than chaincode-level policies when writes affect private namespaces.

## Data Placement Rules

Allowed on Fabric:

- event id
- case id hash
- payload hash
- terms hash
- certificate hash
- export manifest hash
- signing profile id
- channel name
- chaincode name
- schema version
- canonicalization version
- occurred/anchored timestamps
- verification status

Never write raw values to Fabric:

- KYC/AML documents
- personal data
- commercial documents
- invoice payloads
- payment credentials
- bank account details
- unrestricted escrow terms
- full delivery evidence attachments
- raw Shariah review rationale
- full contract text

## Chaincode Lifecycle Runbook

For each chaincode release:

1. Build and test the chaincode in the repository.
2. Package the chaincode with a human-readable label.
3. Install the package on every endorsing peer for participating organizations.
4. Record package IDs per MSP.
5. Approve the chaincode definition for each required MSP with matching name, version, sequence, endorsement policy, and collection configuration.
6. Run `checkcommitreadiness`.
7. Commit the definition when lifecycle endorsement is satisfied.
8. Submit a metadata-only smoke transaction.
9. Verify expected proof states: `verified`, `mismatch`, and `notFound`.
10. Record package id, sequence, endorsement policy, collection config hash, and smoke result in release evidence.

The skeleton script at `scripts/fabric/production-chaincode-lifecycle-skeleton.ps1` prints the planned peer lifecycle commands and can be adapted by an operator after real MSP material and peer/orderer endpoints are available.

## Operations and Rotation

Certificate rotation:

- Generate replacement identities from the owning organization CA.
- Add the new identity to the relevant wallet/gateway profile.
- Run a non-mutating query smoke.
- Switch submitter identity.
- Revoke the old identity only after query and submit smoke pass.
- Record the CRL / MSP update evidence.

Chaincode upgrade:

- Increment sequence for every endorsement or collection policy change.
- Increment version when chaincode binaries change.
- Keep old state schema readable by the new chaincode.
- Run cross-org smoke tests before application traffic is moved.

Incident handling:

- Fabric unavailable must surface as proof `unavailable` or anchor `failed/pending`, not as a fabricated verified proof.
- Base business events in PostgreSQL must remain queryable even when anchoring fails.
- Operators must record missing peer/orderer/MSP prerequisites in evidence rather than forcing local fallback.

## Foundation Artifacts

This phase adds:

- `fabric/production-consortium/channel-plan.json`
- `fabric/production-consortium/chaincode-definitions.json`
- `fabric/production-consortium/collections-config.json`
- `fabric/production-consortium/connection-profile-template.yaml.template`
- `scripts/fabric/check-production-consortium-prereqs.ps1`
- `scripts/fabric/production-chaincode-lifecycle-skeleton.ps1`

These are templates and checks. They do not create a production consortium, enroll identities, deploy peers, or start a live ordering service.

## Completion Boundary

PBI-437 is complete when this plan, templates, and runbook updates are reviewed and validation passes.

PBI-438 is staged, not fully production-complete, until at least one production-like environment supplies:

- real CA/MSP material for all organizations
- reachable peer/orderer endpoints
- channel artifacts
- package IDs and approvals per MSP
- successful lifecycle commit
- live cross-organization smoke evidence
