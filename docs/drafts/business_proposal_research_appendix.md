BUSINESS PROPOSAL RESEARCH APPENDIX
Digital Procurement + PLS Seedbed MVP
Prepared for Ikrima Tech
Date: 9 March 2026

====================================================================
1) CLAIM-TO-SOURCE LEDGER
====================================================================

A. Proposal structure and section ordering
- Source: San Jose State University Writing Center, "Business Proposals" handout.
- Key use in proposal:
  * Title Page
  * Table of Contents
  * Executive Summary
  * Problem Statement
  * Proposed Solution
  * Qualifications
  * Timeline
  * Pricing / ROI framing
  * Terms and Conditions
  * Agreement

B. Procurement problem size and strategic importance
- Source: OECD, Government at a Glance 2025.
- Claim used:
  * Public procurement represented 12.7% of GDP and 29.9% of total government expenditure across OECD countries in 2023.
- Why included:
  * Supports investor/sponsor rationale that procurement is economically material.

C. Digital procurement transformation drivers and pain points
- Source: OECD, Digital Transformation of Public Procurement: Good Practice Report, 2025.
- Claims used:
  * Digital transformation requires end-to-end integration.
  * Key barriers include siloed systems, outdated infrastructure, limited interoperability, and weak data-driven oversight.
- Why included:
  * Supports the problem statement and the need for workflow integration.

D. Procurement integrity risk
- Source: OECD, Integrity in Public Procurement: Good Practice from A to Z, 2007.
- Claim used:
  * Procurement is highly vulnerable to corruption and integrity failures across the full cycle.
- Why included:
  * Supports the need for auditability and evidence controls.

E. Mudarabah and PLS governance baseline
- Sources:
  * Securities Commission Malaysia, Guidelines on Islamic Capital Market Products and Services, revised 2024.
  * Bank Negara Malaysia, Shariah Standard on Mudarabah (public mirror used for accessible review).
  * IMF, An Overview of Islamic Finance, 2015.
- Claims used:
  * Profit-sharing ratio must be agreed in advance.
  * In mudarabah, loss is borne by the capital provider unless negligence, misconduct, or breach is established.
  * Principal and profit must not be guaranteed.
- Why included:
  * Supports the restricted mudarabah MVP scope and risk controls.

F. Shariah governance expectations
- Source: IFSB-10, Guiding Principles on Shariah Governance Systems for Institutions Offering Islamic Financial Services.
- Claim used:
  * Independence and competence in Shariah governance are material governance concerns.
- Why included:
  * Supports manual governance workflow and sponsor review gates.

G. Timestamping and non-repudiation
- Source: IETF RFC 3161.
- Claim used:
  * Timestamping provides proof that data existed before a given time and supports non-repudiation services.
- Why included:
  * Supports the audit evidence pipeline.

H. WORM retention logic
- Source: AWS S3 Object Lock documentation.
- Claims used:
  * Object Lock implements a WORM-style model.
  * Versioning is required.
  * Retention periods and legal holds prevent overwrite or deletion of protected object versions.
- Why included:
  * Supports immutable evidence retention design.

I. Quality management positioning
- Source: ISO, Quality Management Principles.
- Claims used:
  * Customer focus, leadership, process approach, improvement, evidence-based decision making, and relationship management are core quality principles.
- Why included:
  * Supports quality and maintenance framing.

J. Governance framing
- Source: PMI PMBOK standards overview.
- Claim used:
  * PMBOK uses a value-oriented performance-domain approach to project delivery.
- Why included:
  * Supports Stakeholders / Team / Development Approach / Uncertainty framing requested by the sponsor.

====================================================================
2) FORMAL SOURCE LIST
====================================================================

1. San Jose State University Writing Center. Business Proposals. Spring 2022.
   https://www.sjsu.edu/writingcenter/docs/handouts/Business%20Proposals.pdf

2. OECD Publishing. Government at a Glance 2025. 2025.
   https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/06/government-at-a-glance-2025_70e14c6c/0efd0bcd-en.pdf

3. OECD Publishing. Digital Transformation of Public Procurement: Good Practice Report. 2025.
   https://www.oecd.org/content/dam/oecd/en/publications/reports/2025/06/digital-transformation-of-public-procurement_90ace30d/79651651-en.pdf

4. OECD. Integrity in Public Procurement: Good Practice from A to Z. 2007.
   https://www.oecd.org/en/publications/integrity-in-public-procurement_9789264027510-en.html

5. Securities Commission Malaysia. Guidelines on Islamic Capital Market Products and Services. Revised 2024.
   https://www.sc.com.my/regulation/guidelines/islamic-capital-market-products-and-services

6. Securities Commission Malaysia. Guidelines on Islamic Capital Market Products and Services (PDF).
   https://www.sc.com.my/api/documentms/download.ashx?id=8698018f-e56c-4ddc-b20c-3fe46132e115

7. Bank Negara Malaysia. Shariah Standard on Mudarabah (public mirror used for accessible review).
   https://law.resource.org/pub/my/ibr/ms.bnm.shariah.mudarabah.2012.pdf

8. International Monetary Fund. An Overview of Islamic Finance. 2015.
   https://www.imf.org/external/pubs/ft/wp/2015/wp15120.pdf

9. Islamic Financial Services Board. IFSB-10: Guiding Principles on Shariah Governance Systems for Institutions Offering Islamic Financial Services.
   https://www.ifsb.org/wp-content/uploads/2023/10/IFSB-10-December-2009_En.pdf

10. IETF. RFC 3161: Internet X.509 Public Key Infrastructure Time-Stamp Protocol. 2001.
    https://www.ietf.org/rfc/rfc3161.txt

11. Amazon Web Services. Locking objects with Object Lock.
    https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-overview.html

12. Amazon Web Services. Configuring S3 Object Lock.
    https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-lock-configure.html

13. International Organization for Standardization. Quality management principles.
    https://www.iso.org/quality-management/principles

14. Project Management Institute. PMBOK Guide standards overview.
    https://www.pmi.org/standards/pmbok

====================================================================
3) TIMELINE VISUAL SNIPPET (MERMAID)
====================================================================

```mermaid
gantt
  title Digital Procurement + PLS Seedbed MVP (12 Weeks)
  dateFormat  YYYY-MM-DD
  axisFormat  %d %b

  section Mobilize
  Scope lock and governance kickoff          :a1, 2026-03-09, 5d
  Backlog calibration and environment setup  :a2, after a1, 5d

  section Workflow Foundation
  Supplier onboarding and RBAC               :b1, 2026-03-23, 10d
  Role-based dashboard baseline              :b2, 2026-03-23, 10d

  section Procure-to-Pay Core
  Purchase order and delivery flow           :c1, 2026-04-06, 10d
  Invoice submission and approval            :c2, 2026-04-06, 10d

  section Auditability
  Canonical audit events and hashing         :d1, 2026-04-20, 10d
  Manifest, timestamp, and export pipeline   :d2, 2026-05-04, 10d

  section PLS Seedbed
  PLS schema and validation                  :e1, 2026-04-20, 10d
  Manual settlement and PLS calculation      :e2, 2026-05-04, 10d
  Shariah workflow and final hardening       :e3, 2026-05-18, 10d

  section Acceptance
  UAT, sponsor review, and release readiness :f1, 2026-05-26, 5d
```

====================================================================
4) OPTIONAL POSITIONING LINE FOR PITCH DECKS
====================================================================

"A compliance-first procurement and financing seedbed that replaces fragmented records with verifiable workflow evidence and Shariah-governed PLS controls."

