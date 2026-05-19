# PBI-136 Missing and Incomplete Sequence Hardening Evidence

## 1. Purpose

This evidence closes PBI-136 by proving that missing event, incomplete sequence, and limited-chain scenarios are handled safely without misleading investigators. It demonstrates that auditors can inspect access audit events and sequences without encountering crashes, misleading completeness claims, or unauthorized access.

## 2. Scope

This evidence covers:
- missing event detail behavior
- incomplete sequence behavior
- limited evidence chain behavior
- stable response semantics
- non-misleading response behavior
- auditor authorization boundary
- regression coverage for PBI-134 and PBI-135

## 3. Out of Scope

This evidence explicitly excludes:
- new sequence retrieval capabilities beyond PBI-135
- new evidence semantics beyond PBI-133
- cryptographic chain verification
- cryptographic key management
- external export
- analytics
- UI presentation
- new audit recording behavior

## 4. Existing Behavior Hardened

PBI-136 did not require production behavior changes because PBI-134 and PBI-135 already implemented the required response semantics. The implementation correctly handles missing events, incomplete sequences, and limited evidence chains according to the established contracts.

PBI-136 added focused validation through targeted tests to prove that limited-chain behavior works correctly without requiring implementation changes.

## 5. Missing Event Behavior

Missing event behavior is correctly implemented:
- `getAccessAuditEventDetail(...)` returns null for missing event IDs
- `GET /api/v1/access-history/events/:eventId` returns 404 NOT_FOUND
- Missing event response does not include data.event
- No fabricated event payload
- No partial success response

## 6. Incomplete Sequence Behavior

Incomplete sequence behavior is correctly implemented:
- Sequence endpoint returns available evidence without error
- Empty actor/target sequence returns 200 OK with items = []
- Single-event sequence returns 200 OK with one item
- completeness.status = unknown
- completeness.reason = completeness_not_proven
- Response does not imply full historical completeness

## 7. Limited Evidence Chain Behavior

Limited evidence chain behavior is correctly implemented:
- Events without evidence.previousEventHash are accepted
- payloadHash is preserved
- canonicalization is preserved
- previousEventHash is optional and absent/undefined when not present
- Sequence still returns available events
- Completeness remains unknown
- No cryptographic chain verification is attempted

## 8. Authorization Behavior

Authorization behavior is correctly implemented:
- Event detail inspection requires auditor role
- Sequence inspection requires auditor role
- Non-auditor receives 403 FORBIDDEN

## 9. Regression Coverage

Regression coverage confirms:
- PBI-134 event-detail retrieval still works
- PBI-135 actor sequence retrieval still works
- PBI-135 target sequence retrieval still works
- PBI-121 access-history query remains unaffected

## 10. Test Evidence Matrix

| Behavior | Test File | Test Name / Evidence |
|---------|-----------|---------------------|
| Missing event detail returns null | `src/modules/shared/application/access-audit-event-detail.test.ts` | `returns null when eventId does not exist` |
| Missing event API returns 404 NOT_FOUND | `src/modules/shared/api/access-history.routes.test.ts` | `should return 404 NOT_FOUND for missing eventId` |
| Authorized event detail retrieval still works | `src/modules/shared/api/access-history.routes.test.ts` | `should return event detail for authorized auditor with valid eventId` |
| Actor sequence retrieval still works | `src/modules/shared/api/access-history.routes.test.ts` | `should return actor sequence for authorized auditor` |
| Target sequence retrieval still works | `src/modules/shared/api/access-history.routes.test.ts` | `should return target sequence for authorized auditor` |
| Empty sequence returns 200 with [] | `src/modules/shared/application/access-audit-event-sequence.test.ts` | `returns empty array when no events match` |
| Single-event sequence returns one item | `src/modules/shared/application/access-audit-event-sequence.test.ts` | `returns single event when only one matches` |
| Limited-chain application sequence returns available evidence without claiming completeness | `src/modules/shared/application/access-audit-event-sequence.test.ts` | `returns limited evidence chain without claiming completeness` |
| Limited-chain API sequence returns available evidence without claiming completeness | `src/modules/shared/api/access-history.routes.test.ts` | `should return limited evidence chain without claiming sequence completeness` |
| Non-auditor denied for event detail | `src/modules/shared/api/access-history.routes.test.ts` | `should deny access for non-auditor user requesting event detail` |
| Non-auditor denied for sequence retrieval | `src/modules/shared/api/access-history.routes.test.ts` | `should deny access for non-auditor user requesting sequence` |
| Existing access-history query remains working | `src/modules/shared/api/access-history.routes.test.ts` | `should not break existing access-history list endpoint after adding event detail endpoint` |
| Existing event-detail route remains working | `src/modules/shared/api/access-history.routes.test.ts` | `should not break existing access-history routes after adding sequence endpoint` |

## 11. Validation Commands

Validation commands executed:
```bash
npm run build: passed
npm test: passed
git diff --check: clean
```

## 12. Risks and Follow-Up Notes

Identified risks and follow-up considerations:
- Completeness remains unknown because the repository cannot prove full historical completeness.
- PBI-136 does not implement cryptographic chain verification.
- PBI-137 should package parent-story closure evidence for PBI-122.
- Future persistence/indexing may optimize lookup and sequence retrieval behind the same contract.

## 13. Acceptance Criteria Mapping

Acceptance criteria mapping:
- Given an investigation sequence is incomplete or limited by current scope, inspection returns available evidence without crashing or implying unsupported completeness.
- Given a requested event does not exist, inspection returns correct not-found behavior.

## 14. Closeout Verdict

PBI-136 is ready for review/acceptance.
