## PBI-113 Progress Evidence — Validation Error Helper and Membership Proof

### Completed

- Extended shared validation error helper to support standardized `VALIDATION_ERROR` envelopes.
- Added support for optional `requestId`.
- Preserved backward-compatible `createValidationError(...)` calling patterns.
- Added `createApplicationValidationError(...)` for application-level validation failures.
- Preserved Fastify schema-validation mapping through `mapFastifyValidationError(...)`.
- Added focused helper tests covering default issues, custom issues, message-only compatibility, requestId inclusion/exclusion, Fastify mapping, application validation, and null requestId behavior.
- Updated membership route validation tests to assert the standardized error envelope for both schema-validation and application-validation paths.

### Verification

Targeted command:

```bash
node --loader ts-node/esm --test .\src\modules\shared\api\validation-error-helper.test.ts .\src\modules\membership\api\routes.test.ts