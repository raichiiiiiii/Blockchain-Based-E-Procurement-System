# PBI-001 Findings
## Investigate Shariah-compliant PLS contract model for MVP

- **PBI-ID:** PBI-001
- **Type:** Spike
- **ReqID:** R07
- **Status:** Draft findings
- **Timebox:** 5 days
- **Owner:** Tech Lead

## 1. Objective

Determine a simplified, Shariah-reviewable PLS contract model suitable for MVP implementation within a 12-week delivery window.

## 2. Source pack reviewed

### Regulatory / standards anchors
1. Securities Commission Malaysia, *Guidelines on Islamic Capital Market Products and Services*
2. Bank Negara Malaysia, *Shariah Standard on Mudarabah* (public mirror used during spike)
3. Islamic Financial Services Board (IFSB-10) and FAQ material on Shariah governance
4. AAOIFI public standards index for applicable standards:
   - SS (12) Sharikah / Musharakah
   - SS (13) Mudarabah

### Supporting contextual references
5. IMF overview material on profit-and-loss sharing structures

## 3. Non-negotiable rules extracted

### 3.1 Musharakah
- Must involve at least two partners.
- Profit distribution must follow a **pre-agreed profit sharing ratio (PSR)**.
- Losses must be allocated according to **capital contribution**.
- A manager may be appointed to manage the venture.

### 3.2 Mudarabah
- `rabb_al_mal` provides capital.
- `mudarib` manages the venture.
- Profit distribution must follow a **pre-agreed PSR**.
- Financial losses are borne by the `rabb_al_mal` **unless** loss is caused by misconduct, negligence, or breach of terms by the `mudarib`.
- The `mudarib` **must not guarantee capital or profit**.

### 3.3 Restricted mudarabah is useful for MVP
A restricted mudarabah may include limits such as:
- project / procurement reference
- period / tenure
- allowed use of funds
- commingling restrictions

This is suitable for a procurement-linked MVP because financing can be tied to a single procurement job, PO, or awarded tender.

## 4. MVP recommendation (provisional)

### Decision candidate
Adopt **single-venture restricted mudarabah** as the MVP baseline.

### Why this is the current best fit
- Simplest role model: one capital provider, one venture operator
- Easier loss logic than supporting multiple musharakah partners in MVP
- Clean traceability to a single procurement record
- Easier to review with Shariah advisor within sprint timebox

### Deferred scope
- full multi-party musharakah calculations
- diminishing musharakah variants
- portfolio-level pooling logic
- automated dispute attribution for negligence

## 5. Minimum contract schema for MVP

```text
PLSContract
- contract_id
- contract_type = mudarabah
- status
- procurement_reference_id
- rabb_al_mal_party_id
- mudarib_party_id
- capital_amount
- currency
- profit_sharing_ratio_rabb_al_mal
- profit_sharing_ratio_mudarib
- restriction_scope
- restriction_start_date
- restriction_end_date
- commingling_allowed (true/false)
- reporting_frequency
- profit_calculation_method
- loss_allocation_rule
- negligence_assessment_required (true/false)
- shariah_review_status
- shariah_review_reference
- template_version
- template_hash
- created_at
- approved_at
```

## Business rules for implementation

### Profit
- Profit may only be distributed using a pre-agreed ratio
- Profit must not be encoded as a fixed return or guaranteed percentage independent of realized outcome

### Loss
- Default rule for mudarabah:
	- financial loss -> borne by `rabb_al_mal`
	- unless proven misconduct/ negligence/ breach by `mudarib`

### Hard validation rules
- reject any contract that sets `guaranteed_principal = true`
- reject any contract that sets `guaranteed_profit = true`
- reject any PSR where the ratio total is not 100%
- reject funding outside declared restriction scope in restricted mudarabah

## 7. Audit-trail fields required
The system should record at least:
- contract version and template hash
- party identities and roles
- capital amount and contribution timestamp
- PSR values
- declared restrictions
- venture/ PO linkage
- profit calculation basis
- profit distribution events
- loss events and attribution outcome
- Shariah reviewer identity/ role/ date
- review decision and conditions
- amendment history

## 8. Open questions for Shariah review
1. Is a single-venture restricted mudarabah linked to one procurement reference acceptable for MVP?
2. What exact formula defines "realized profit" in this procurement setting?
3. Which expenses are deductible before distribution?
4. What evidence is sufficient to attribute loss to misconduct or negligence?
5. Are any collateral or security arrangements permissible, and under what boundaries?
6. Is a later musharakah variant acceptable if MVP starts with mudarabah only?

## 9. Exit criteria mapping

### Expected spike outputs
1. documented summary of mandatory PLS elements
- [X] documented summary of mandatory PLS elements
- [X] draft simplified MVP model
- [X] draft ADR
- [X] Shariah review/ liaison feedback recorded
- [X] governance approval status recorded

## 10. Recommended follow-up PBIs
- Implement PLS contract schema for restricted mudarabah
- Add validation rules for prohibited guarantees
- Add profit distribution calculation service
- Add Shariah review status and evidence fields
- Add loss attribution workflow

## 11. Source list
- SC Malaysia ICMPS Guidelines:
https://www.sc.com.my/api/documentms/download.ashx?id=8698018f-e56c-4ddc-b20c-3fe46132e115
- IFSB-10:
https://www.ifsb.org/wp-content/uploads/2023/10/IFSB-10-December-2009_En.pdf
- IFSB FAQ:
https://www.ifsb.org/wp-content/uploads/2023/10/FAQs-for-IFSB-10_En.pdf
- BNM Mudarabah standard (public mirror used in spike):
https://law.resource.org/pub/my/ibr/ms.bnm.shariah.mudarabah.2012.pdf
- AAOIFI standards index:
https://aaoifi.com/shariah-standards-3/?lang=en
- IMF PLS background:
https://www.imf.org/external/pubs/ft/wp/2015/wp15120.pdf