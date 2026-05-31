# 20-Company Consortium Seed Validation

Date: 2026-06-01
Branch: `feature/PBI-485-496-productivity-api-auth-hardening`

## Scope

Validates PBI-485 from GitHub Issue #24.

## Files Changed

- `scripts/db/seed-demo-data.ts`
- `README.md`
- `docs/runbooks/local-demo.md`
- `docs/demo/AMANAH_BARAKAH_MABRUR_CASE.md`
- `docs/runbooks/supervisor-demo-script.md`

## Seed Summary

The demo seed now validates 28 fictional organizations and 24 credential-capable demo users.

Organization coverage includes:

- 5 regulated/development buyers
- 10 SME suppliers, including one blocked and one pending onboarding example
- 3 financiers
- 2 logistics/support/integration partners
- regulator/reporting organization
- audit/compliance partners
- Shariah review organization
- security operations organization
- platform/operator organization

Proof-scope coverage:

- `sharedChannelA`
- `sharedChannelB`
- `privateChannelC`
- `localProofOnly`
- `unavailable`

Seeded records remain safe metadata only. The seed does not include raw KYC documents, raw commercial documents, payment credentials, private keys, or generated Fabric artifacts.

## Validation

- `npm run db:seed -- --dry-run` passed and reported 28 organizations and 24 demo accounts.
- `npx tsc --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --esModuleInterop --skipLibCheck scripts/db/seed-demo-data.ts` passed.

## Known Limitations

- Demo organizations are fictional.
- The dataset improves credibility for supervisor/pilot-hardening review, but it is not real customer data.
- Production Fabric channel membership is not claimed by proof-scope labels.
