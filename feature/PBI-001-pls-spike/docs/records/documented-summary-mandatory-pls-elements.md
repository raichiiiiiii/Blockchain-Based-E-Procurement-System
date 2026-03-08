# Documented Summary of Mandatory PLS Elements

## Purpose
Summarize the mandatory Shariah-relevant profit-loss sharing (PLS) elements identified during PBI-001 for MVP design, ADR drafting, and governance review.

## Scope
This summary is a working implementation and governance artifact for the MVP spike. It is not a formal Shariah pronouncement. Final approval remains subject to the designated Shariah reviewer or Shariah Board.

## Source basis
This summary is based on:
- `PBI-001-findings.md`
- `shariah-review.tex`
- the source pack reviewed during the spike:
  - Securities Commission Malaysia guidance
  - Bank Negara Malaysia mudarabah standard
  - IFSB governance material
  - AAOIFI public standards index

## 1. Mandatory PLS elements common to MVP review
The following elements must be treated as mandatory for any MVP PLS design review:

- the contract structure must be clearly identified
- the parties and their roles must be explicitly defined
- the capital contribution and business purpose must be recorded
- profit-sharing must use a pre-agreed profit-sharing ratio
- profit-sharing ratios must be agreed before distribution
- profit must not be represented as a fixed or guaranteed return
- the loss-allocation rule must be explicit
- restrictions, if any, must be documented clearly
- prohibited guarantees must be rejected by design
- review and governance records must be retained

## 2. Mandatory elements for musharakah
For musharakah, the following mandatory elements were identified:

- at least two partners must participate
- profit distribution must follow a pre-agreed profit-sharing ratio
- financial loss must be allocated according to capital contribution
- a manager may be appointed to manage the venture

## 3. Mandatory elements for mudarabah
For mudarabah, the following mandatory elements were identified:

- `rabb_al_mal` provides capital
- `mudarib` manages the venture
- profit distribution must follow a pre-agreed profit-sharing ratio
- financial loss is borne by the `rabb_al_mal` unless misconduct, negligence, or breach by the `mudarib` is established
- the `mudarib` must not guarantee capital
- the `mudarib` must not guarantee profit

## 4. Mandatory elements for restricted mudarabah in MVP context
For the MVP baseline, the following restricted mudarabah elements are required:

- the restriction scope must be explicitly defined
- the restriction may be linked to a single procurement reference, project, job, or awarded tender
- the allowed use of funds must be documented
- the applicable restriction period or tenure must be documented
- commingling permission or prohibition must be explicit
- the venture linkage must be auditable

## 5. Mandatory profit treatment rules
The following profit rules must be enforced:

- profit-sharing ratio must be pre-agreed
- total ratio allocation must equal 100%
- profit must not be encoded as a fixed percentage independent of realized outcome
- profit must not be described using guaranteed-return language
- realized profit must be calculated using an approved method
- deductible cost treatment must follow an approved policy before distribution

## 6. Mandatory loss treatment rules
The following loss rules must be enforced:

- for mudarabah, the default financial loss sits with `rabb_al_mal`
- loss may be reallocated to `mudarib` only where misconduct, negligence, or breach is established
- commercial underperformance alone is not sufficient to reallocate loss
- any loss reallocation requires documented evidence review and approval

## 7. Mandatory prohibitions
The following must be treated as prohibited in the MVP design:

- guaranteed principal in a mudarabah structure
- guaranteed profit in a mudarabah structure
- fixed return presented as mudarabah profit
- funding use outside the declared restriction scope
- collateral or guarantee wording that converts ordinary commercial risk into an impermissible guarantee

## 8. Mandatory governance and evidence controls
The following governance controls are required:

- Shariah review status must be recorded
- reviewer identity, role, date, and decision must be recorded
- contract version and template hash must be retained
- party identities and roles must be retained
- capital amount and contribution timing must be retained
- profit-sharing ratio values must be retained
- declared restrictions must be retained
- procurement or venture linkage must be retained
- profit calculation basis must be retained
- profit distribution events must be retained
- loss events and attribution outcomes must be retained
- amendment history must be retained

## 9. Mandatory review conditions emerging from Shariah response draft
The following conditions were identified for MVP acceptability:

- contract wording must not imply guaranteed principal or guaranteed return
- restriction scope must identify the permitted venture and use of funds clearly
- deductible-cost taxonomy must be expressly approved before first distribution
- negligence, misconduct, or breach must be determined through documented evidence review
- security, guarantee, or collateral arrangements require separate review
- musharakah may be deferred for MVP, but only as a sequencing choice, not as a rejection of its validity

## 10. MVP implementation consequence
Based on the mandatory elements above, the narrowest reviewable MVP baseline is:

- restricted single-venture mudarabah
- one `rabb_al_mal`
- one `mudarib`
- one procurement reference per contract
- profit-sharing by pre-agreed ratio
- no guaranteed principal or profit
- documented loss attribution workflow
- explicit Shariah review and governance record

## 11. Relation to ADR-2026-001
This summary supports:
- `ADR-2026-001 — Adopt restricted single-venture mudarabah as MVP PLS baseline`

This document provides the standards-oriented summary behind the ADR and makes the spike output `documented summary of mandatory PLS elements` explicit as a standalone artifact.