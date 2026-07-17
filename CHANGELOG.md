# Changelog

## Phase 1 — Scaffold + Schema + Seed (2026-07-17)

### Created

- `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.example`, `README.md`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`
- `src/components/AppShell.tsx`, `src/components/Disclaimer.tsx`
- `src/lib/db.ts`, `src/lib/env.ts`, `src/lib/utils.ts`
- `src/lib/scoring/bands.ts`, `src/lib/scoring/compute.ts` (+ unit tests)
- `src/middleware.ts` (passthrough until Clerk keys are configured)
- `prisma/schema.prisma` — full Phase 1 domain model + additive helpers (`ApiUsage`, `IngestionRun`, `UserColumnPreference`, `DataSource`)
- `prisma/migrations/20260717055043_init_phase1/migration.sql`
- `prisma/seed.ts`, `prisma/seed-data.ts` (+ deterministic RNG / catalog tests)

### Modified

- `.env` — normalized to keyed variables (`DATABASE_URL`, `OPENAI_API_KEY`, budget/cron/Clerk placeholders) without changing secret values

### Verification

| Check | Result |
|-------|--------|
| `npx prisma migrate dev --name init_phase1` | Applied |
| `npm run db:seed` (1st) | OK — 50 stocks, 8 sectors, 11 influencers, 4500 price bars / health scores |
| `npm run db:seed` (2nd) | OK — identical counts, no duplicates |
| `npm run typecheck` | Pass |
| `npm test` | 10/10 pass |
| `npm run lint` | Pass — no warnings or errors |

### Seed counts (stable across re-runs)

- sectors: 8
- stocks: 50
- influencers: 11
- priceBars (SYNTHETIC): 4500
- healthScores (SYNTHETIC): 4500
- influencerReadings (SYNTHETIC): 49500
- marketSnapshots (SYNTHETIC): 90
- predictions: 750
- newsItems (SYNTHETIC): 100
- mlModels: 1 (`baseline_rules@1.0.0` ACTIVE)

### Intentionally deferred (later phases)

- Phase 2 Horizon Pro dashboard page shells wired to seed data
- Phase 3 real ingestion adapters + cron
- Phase 4 live scoring from real data
- Phase 5 OpenAI sentiment/narrative + ML registry baseline jobs
- Phase 6 trained ML handlers
- Clerk middleware protection (keys not yet configured)
- Application logo asset (`logo/` still empty — text mark used)

### Stop point

Awaiting confirmation before Phase 2.
