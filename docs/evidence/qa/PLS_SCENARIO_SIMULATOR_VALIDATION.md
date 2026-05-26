# PLS Scenario Simulator Validation

Date: 2026-05-26  
Branch: main  
Readiness statement: Supervisor demo ready, not pilot-ready or commercial-ready.

## Scope

Phase 11 added a read-only PLS scenario simulator to the financing workspace. The simulator compares a profit outcome and a loss outcome using the restricted seedbed rules already used by the financing service:

- profit is allocated using the pre-agreed financier/operator ratio
- loss is shown against the capital provider unless misconduct is established
- no distribution record is created by the simulator
- no payment execution is implied

## Files Changed

- `src/modules/financing/application/pls-scenario-simulator.ts`
- `src/modules/financing/application/pls-scenario-simulator.test.ts`
- `src/frontend/components/financing/PlsScenarioSimulator.tsx`
- `src/frontend/pages/FinancingDashboard.tsx`
- `src/frontend/styles.css`
- `docs/evidence/qa/PLS_SCENARIO_SIMULATOR_VALIDATION.md`

## Frontend Behavior

- The financier financing workspace displays a `PLS scenario simulator` panel for the selected contract.
- The simulator accepts capital amount, profit outcome, loss outcome, and financier profit ratio.
- The supplier/operator ratio is derived as the remainder to 100 percent.
- Profit and loss outcomes are shown side-by-side.
- The simulator is labeled as simulation-only and does not call the distribution-recording API.

## Claim-Safety Text

The product UI explicitly states:

- Simulation only.
- No payment execution is performed.
- No guaranteed profit or principal is implied.
- Not formal Shariah certification.

## Browser Validation

Validated with the in-app browser against the running local frontend:

- Financier sign-in succeeded.
- Financing navigation opened the financing workspace.
- One `PLS scenario simulator` region rendered.
- All four claim-safety notices rendered.
- Product UI label scan found no `PBI`, `Sprint`, `Backlog`, `Task list`, or `Feature lane` text.
- Browser error log check returned no console errors.

## Automated Validation

| Command | Result |
|---|---|
| `npm run frontend:build` | Passed. TypeScript frontend build and Vite build completed. |
| `npm run build` | Passed. Root TypeScript build completed. |
| `node --test --loader ts-node/esm src/modules/financing/application/pls-scenario-simulator.test.ts` | Passed. 4 tests passed, 0 failed. |
| `npm test` | Passed. 691 tests passed, 0 failed. |
| `git diff --check` | Passed. |

## Known Limitations

- The simulator is an explanatory MVP tool, not payment execution.
- The simulator does not create accounting entries, bank transfers, settlement instructions, or receivable tokens.
- The simulator does not provide formal Shariah certification.
- The loss scenario is intentionally simplified for the restricted seedbed and does not replace legal or finance review.

## Recommendation

Proceed to final release candidate hardening with the readiness statement unchanged: Supervisor demo ready, not pilot-ready or commercial-ready.
