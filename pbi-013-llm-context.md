[comment]: <> (Please ignore this file)

`pbi-013-backlog-snapshot.md`
```md
ID: PBI-013\
Type: Task\
Title: Create PLS contract schema and persistence model\
Description: Implement database schema/model for MVP PLS contracts based on ADR-2026-001, including party roles, capital amount, profit-sharing ratios, restrictions, review status, and versioning fields.\
Acceptance Criteria:
- Given ADR-2026-001 required fields, when the migration is applied, then the system can persist a PLS contract with contract_id, procurement_reference_id, party roles, capital_amount, profit ratios, restrictions, review status, and timestamps.
- Given an invalid contract payload, when required fields are missing, then persistence is rejected with validation errors.

Req-IDs: R07\
NFR_Tags: Compliance, Shariah\
Story Points: 3\
Priority: P0\
Owner: Backend Dev\
Sprint: 2\
Status: New\
Dependencies: PBI-001\
Notes: Parent: PBI-007. Use restricted mudarabah MVP baseline from ADR-2026-001.
```

`pbi-007-backlog-snapshot.md`
```md
ID: PBI-007\
Type: Story\
Title: Basic PLS profit/loss calculation and recording\
Description: As a bank, I want to record a PLS contract and compute profit/loss for a financing so that the Shariah-compliant distribution is tracked.\
Acceptance Criteria:
- Given a PLS contract created with parameters (profit ratio, capital amounts), when an approved invoice has a manual settlement record posted, the system calculates profit share according to the ADR-2026-001 formula.
- Given a calculated profit, the system records it in the audit trail with contract ID, amounts, and timestamp
Req-IDs: R07\
NFR_Tags: Compliance, Shariah\
Story Points: 13\
Priority: P0\
Owner: Backend Dev\
Sprint: 2\
Status: Ongoing\
Dependencies: PBI-001\
Notes: Parent: Implementation based on ADR-2026-001.
```

`pbi-001-backlog-snapshot.md`
```md
ID: PBI-001\
Type: Spike\
Title: R07 requires a profit-loss sharing model compliant with AAOIFI/IFSB guidance. The team lacks detailed knowledge of the exact profit-split rules, loss allocation, and required audit trails. This Spike will research authoritative sources (Malaysia SC, AAOIFI), consult with the Shariah Board (if available), and propose a simplified but compliant model suitable for the 12-week MVP.\
Acceptance Criteria:
- Given research into AAOIFI and Malaysia SC guidelines, when the findings are compiled, then a documented summary of mandatory PLS elements is produced.
- Given the mandatory elements, when reviewed with the Shariah Board (or liaison), then a simplified PLS model for MVP is agreed.
- Given the agreed model, when documented in an ADR, then the ADR includes profit-split formulas, loss allocation rules, and data fields to be recorded.
Req-IDs: R07\
NFR_Tags: Compliance, Shariah\
Story Points: 5\
Priority: P0\
Owner: Tech Lead\
Sprint: 1\
Status: Completed\
Dependencies: Access to Shariah Board or qualified Islamic finance expert\
Notes:
```

`req-07-srs-snapshot.md`
```md
ID: R07\
Type: Functional/ Shariah Compliance\
Source: Regulatory + AAOFI/IFSB guidance\
Stakeholders: Banks, Shariah Board\
Acceptance: PLS contract deployable with parameters (profit ratio, loss allocation); ledger records distribution per contract.
```

`design-constaint.md`
```md
Design Constraints
==================

The following constraints restrict the architecture, implementation approach, and scope of the MVP system. These constraints arise from project delivery limitations, infrastructure cost considerations, and stakeholder feedback regarding operational complexity.

1. C01 — Timebox constraint

   The MVP shall be deliverable within 12 calendar weeks, including development, testing, and demonstration.

2. C02 — Low-cost deployment constraint

   The MVP shall use infrastructure and deployment patterns that minimize upfront and recurring operational cost.

3. C03 — Minimal operational complexity constraint

   The MVP shall avoid solutions requiring substantial node hosting, distributed ledger administration, or complex consortium governance in the first release.

4. C04 — Limited integration constraint

   ERP and accounting integration in the MVP shall be limited to lightweight API integration, mock services, or file-based exchange unless explicitly prioritized by stakeholders.

5. C05 — Centralized-first architecture constraint

   The default MVP architecture shall be centralized unless blockchain functionality is proven necessary for a specific requirement.

6. C06 — Hybrid blockchain constraint

   If blockchain is included in the MVP, it shall be limited to integrity verification, audit anchoring, or selective proof recording, while operational data and workflows remain primarily off-chain.

7. C07 — Scope minimization constraint

   Requirements that significantly increase implementation time, hosting cost, or integration complexity may be deferred from the MVP to later system phases.
```
`appendix-a-selected-bibliography.md`
```md
Appendix A: Selected Bibliography
=================================

Below is a curated set of public-domain sources used to derive the candidate requirements. For each source, consult the original document for technical details and canonical field definitions.

1. OECD. "Digital Transformation of Public Procurement" (2025 report).

2. World Bank. "FundsChain" feature and other World Bank blockchain initiatives (2025).

3. World Economic Forum. "Inclusive Deployment of Blockchain for Supply Chains" (2019).

4. GS1 US. "Applying GS1 Standards for Supply Chain Visibility in Blockchain" (2020, EPCIS guidance).

5. NIST. "Manufacturing Supply Chain Traceability with Blockchain Related Technology" (2023 reference implementation).

6. Hyperledger Fabric documentation from IBM and the Hyperledger community.

7. Malaysia Securities Commission. "Guidelines on Islamic Capital Market Products and Services" containing musharakah and mudharabah guidance.

8. AAOIFI standards and IFSB guidance on Islamic finance products.

9. Deloitte. "Using blockchain to drive supply chain transparency" (industry article or whitepaper).

10. Oracle and Deloitte. "Value-driven supply chain: blockchain + IoT" (point-of-view briefing).

11. IBM Institute for Business Value. Whitepaper on blockchain for sustainable supply chains.

12. World Food Programme. "Building Blocks" case study on identity and cash transfer on blockchain.

13. Citrusxchange and SupplyChainDigital coverage on invoice-financing platforms.

14. Academic literature including:
    - Govindan et al. (2023)
    - Rakshit et al. (2022)
    - Alimohammadlou et al. (2023)
    - Ojo and Zhou (2020)
    - Pi (2026)

15. World Economic Forum publications on government procurement and blockchain, including IDB collaboration case studies.

16. ISO 20022 payment messaging guidance and SWIFT whitepapers.

17. W3C DID and Verifiable Credentials specifications.

18. White and Case LLP. Insights on tokenised Islamic finance products.

19. R3 Corda and Enterprise Ethereum platform documentation, including Besu and Quorum privacy and permissioning comparisons.

20. Various GitHub proof-of-concept repositories, including:
    - IBM Food Trust sample chaincode
    - MangoChain
    - Public repositories demonstrating invoice tokenisation

21. Industry articles from ISM Supply Management and SupplyChainDigital.

22. Selected McKinsey and PwC industry reports on blockchain in supply chains.

23. National fintech regulator guidance, including public tokenisation frameworks from Bahrain and the UAE where available.

24. FAO and UNECE reports on blockchain for agriculture and market access.

25. UN and IDB public reports summarising procurement pilots.

26. Research articles on Islamic fintech and blockchain, including literature reviews from 2022 and 2023.
```

`ADR-2026-001`
```md
Title: Adopt restricted single-venture mudarabah as MVP PLS baseline
ADR-ID: ADR-2026-001
Status: Accepted

Context:
  - ReqID R07 requires a Shariah-compliant profit-loss sharing model for MVP implementation.
  - The project is constrained by a 12-week MVP delivery window, low deployment and maintenance cost, and a preference for simplified implementation with reviewable governance artifacts.
  - Key stakeholders are the Tech Lead, Product Owner, and Shariah liaison / Shariah Board representative.
  - The supporting spike reviewed SC Malaysia guidance, BNM mudarabah guidance, IFSB governance material, and the AAOIFI public standards index.
  - The spike also produced the following supporting artifacts:
    - documented-summary-mandatory-pls-elements.md
    - PBI-001-findings.md

Decision:
  - Adopt restricted single-venture mudarabah as the provisional MVP baseline, subject to formal Shariah approval of contract wording, profit-calculation rules, deductible-cost policy, and loss-allocation controls.
  - Each MVP contract shall:
    - support one rabb_al_mal and one mudarib
    - be bound to a single procurement reference
    - record profit sharing using a pre-agreed profit-sharing ratio
    - allocate financial loss to the rabb_al_mal unless negligence, misconduct, or breach is established against the mudarib
    - prohibit any structure that guarantees principal or profit to the capital provider
  - The MVP implementation shall use the following explicit profit-split formula:
    - distributable_profit = realized_profit - approved_deductible_costs
    - rabb_al_mal_profit = distributable_profit × profit_sharing_ratio_rabb_al_mal
    - mudarib_profit = distributable_profit × profit_sharing_ratio_mudarib
    - profit_sharing_ratio_rabb_al_mal + profit_sharing_ratio_mudarib = 100%
  - Formula interpretation and controls:
    - realized_profit must be determined using the approved profit definition for the contract template and distribution event
    - approved_deductible_costs must follow the approved deductible-cost policy version in force for the distribution event
    - no profit distribution may be made where distributable_profit is zero or negative
    - any negative outcome is not a profit distribution event and must follow the approved loss-allocation rule
  - The MVP implementation shall enforce the following controls:
    - the profit-sharing ratio must be agreed upfront
    - total profit-sharing ratios must equal 100%
    - no fixed or guaranteed return may be represented as profit
    - no principal guarantee may be represented for mudarabah
    - funding use must remain within declared restrictions
    - loss reallocation to the mudarib requires documented determination of negligence, misconduct, or breach
    - deductible cost categories must follow an approved policy before profit distribution
    - distribution events must follow documented approval requirements where the applicable template, rule version, or exception status requires review
  - Each MVP contract record should include, at minimum:
    - contract_id
    - procurement_reference_id
    - venture_description
    - permitted_use_of_funds
    - rabb_al_mal_party_id
    - mudarib_party_id
    - capital_amount
    - currency
    - profit_sharing_ratio
    - profit_sharing_ratio_rabb_al_mal
    - profit_sharing_ratio_mudarib
    - approved_profit_definition
    - deductible_cost_policy_version
    - restrictions
    - commingling_flag
    - profit_calculation_basis
    - loss_allocation_rule
    - distribution_period_start
    - distribution_period_end
    - evidence_bundle_id
    - distribution_approval_status
    - exception_flag
    - security_or_collateral_details
    - reviewer
    - review_status
    - review_date
    - shariah_pronouncement_reference
    - template_version
    - template_hash

Consequences:
  - Positive consequences (benefits):
    - reduced implementation scope
    - simpler data model
    - easier sprint delivery
    - clearer Shariah and governance review
    - explicit formula reduces ambiguity in implementation and review
  - Negative consequences (risks, trade-offs):
    - MVP prioritizes restricted single-venture mudarabah as the initial PLS baseline
    - musharakah support is deferred and not covered by the first implementation scope
    - negligence attribution is not fully automated
    - future expansion may require schema changes
  - Migration strategy (if applicable):
    - implement MVP on restricted single-venture mudarabah first
    - add musharakah and broader PLS variants in later increments
    - version the schema and contract template to support controlled expansion

Related PBIs:
  - PBI-001 (implementing this ADR)
  - PBI-### implement PLS contract schema
  - PBI-### implement PSR validation
  - PBI-### implement profit distribution service
  - PBI-### add Shariah approval workflow
  - PBI-### add loss attribution workflow

Related ReqIDs:
  - R07

Related Artifacts:
  - documented-summary-mandatory-pls-elements.md
  - PBI-001-findings.md
  - governance-closure-pbi-001.md

Decision Date: 2026-03-06
Author: Tech Lead
Reviewers: Product Owner, Shariah liaison / Shariah Board representative
Governance Required: Yes  # Shariah Board / Shariah representative review required

Links:
  - SC Malaysia guidance
  - BNM mudarabah guidance
  - IFSB governance material
  - AAOIFI public standards index
  - documented-summary-mandatory-pls-elements.md
  - PBI-001-findings.md
  - PBI-001 Shariah Review Questions and meeting outcome

Signature:
  - Tech Lead: Accepted (2026-03-07)
  - Product Owner: Accepted (2026-03-07)
  - Shariah Representative: Approved with conditions on contract wording, controls, and implementation (2026-03-07)
  ```

  `folder-tree.md`
  ```
  # a folder tree for pbi-001 '.\feature\PBI-001-pls-spike\'

  +---adrs
|       ADR-2026-001.md
|       
\---docs
    +---records
    |       documented-summary-mandatory-pls-elements.md
    |       shariah-review.tex
    |
    \---spikes
            governance-closure-pbi-001.md
            PBI-001-findings.md
            PBI-001-shariah-review-questions.md
  ```