# Governance Closure Note — PBI-001

## PBI
PBI-001 Shariah Review Questions

## Purpose
Record the governance outcome for the proposed MVP profit-loss sharing baseline and formally close the spike output item: **governance approval status recorded**.

## Scope of decision
This governance record applies to the MVP baseline described in:
- ADR-2026-001 — Adopt restricted single-venture mudarabah as MVP PLS baseline

This approval applies to the MVP scope only and does not constitute approval of future PLS variants beyond the stated baseline.

## Decision outcome
**Approved with conditions**

## Approved baseline
The approved MVP baseline is:
- restricted single-venture mudarabah
- one `rabb_al_mal`
- one `mudarib`
- one procurement reference per contract
- profit sharing by pre-agreed profit-sharing ratio
- no guarantee of principal or profit
- financial loss allocated to `rabb_al_mal` unless negligence, misconduct, or breach by `mudarib` is established through documented review

## Conditions of approval
1. Contract wording must not imply guaranteed principal, guaranteed profit, fixed yield, or assured payout.
2. Profit distribution must use an approved profit definition and approved deductible-cost policy.
3. Deductible costs must be explicitly governed by a documented policy version before any live distribution event.
4. Any loss reallocation to `mudarib` must require documented evidence and reviewer approval for negligence, misconduct, or breach.
5. Restriction scope must be clearly defined and tied to the identified procurement reference or equivalent venture reference.
6. Any security, collateral, or guarantee arrangement must be separately reviewed to avoid creating an impermissible guarantee.
7. Musharakah support may be deferred for MVP, but this deferral is a sequencing decision only and does not reject musharakah as a valid future model.

## Governance interpretation
The governance reviewers accept the use of restricted single-venture mudarabah as the MVP baseline because it is the most suitable option under the current project constraints:
- 12-week MVP delivery window
- low deployment and maintenance cost
- small implementation team
- need for simplified governance and reviewable controls

## Approval record
- Tech Lead — Accepted — 2026-03-07
- Product Owner — Accepted — 2026-03-07
- Shariah Representative — Approved with conditions — 2026-03-07

## Related artifacts
- ADR-2026-001
- PBI-001 Shariah Review Questions
- PBI-001-findings.md

## Closure statement
The governance approval status for PBI-001 has been recorded in this note and linked to ADR-2026-001.

Spike output status:
- [X] documented summary of mandatory PLS elements
- [X] draft simplified MVP model
- [X] draft ADR
- [X] Shariah review / liaison feedback recorded
- [X] governance approval status recorded