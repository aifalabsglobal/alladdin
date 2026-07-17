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

## Phase 2 — Dashboard UI Shells, Stitch dark template (2026-07-17)

### Created

- `public/logo.png` — copied from `logo/logo.png` (Alladdin lamp mark), used in sidebar and home hero
- `src/components/ui/` — `Card`, `PageHeader`, `KpiTile`, `HealthBadge`, `DirectionChip`, `SentimentChip`, `EmptyState`, `ImpactBarList`, `SyntheticTag`
- `src/components/charts/` — `Sparkline`, `ScoreDonut`, `PriceHealthChart` (client Recharts islands)
- `src/lib/format.ts` (+ tests) — INR/percent/crore/date formatting helpers
- `src/lib/queries/` — `parsers.ts` (Zod for breakdown/model-metrics JSON, + tests), `market.ts`, `stocks.ts`, `sectors.ts`, `influencers.ts`, `watchlist.ts` (server-only view models)
- Routes: `src/app/dashboard/page.tsx`, `src/app/stocks/page.tsx`, `src/app/stocks/[symbol]/page.tsx` (+ `not-found.tsx`), `src/app/sectors/page.tsx`, `src/app/sectors/[id]/page.tsx` (+ `not-found.tsx`), `src/app/watchlist/page.tsx`, `src/app/influencers/page.tsx`

### Modified

- `src/app/globals.css` — Stitch dark terminal tokens (`#0A0E14`/`#10141A` surfaces, `#00E676` green, `#FF5252` red, `#7C4DFF` AI purple), glass cards, focus-visible styling
- `src/components/AppShell.tsx` — fixed left sidebar (desktop) + mobile top bar with drawer, active nav states, logo, compliance note
- `src/components/Disclaimer.tsx` — dark theme styling
- `src/app/page.tsx` — dark hero with logo, neutral language
- `src/lib/format.ts` — sign fix for negative crore values

### Notes

- Buy/sell/candlestick elements from the wireframes were intentionally excluded for compliance; neutral health/signal language only.
- Watchlist is a clearly labeled demo (seeded symbols) until Clerk auth is enabled.
- 365-day chart range omitted (seed has 90 trading days); ranges are 30/90 days.
- All synthetic data surfaces carry a "Synthetic seed data" tag.

### Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm test` | 19/19 pass (5 files) |
| `npm run lint` | Pass — no warnings or errors |
| `npm run build` | Pass — all 9 routes compiled |
| HTTP smoke (dev server) | `/`, `/dashboard`, `/stocks`, `/stocks/RELIANCE`, `/sectors`, `/sectors/[id]`, `/watchlist`, `/influencers` → 200; unknown symbol/sector → 404 |

### Stop point

Awaiting confirmation before Phase 3 (real ingestion adapters + cron jobs).

## Phase 3 — Ingestion adapters + cron jobs (2026-07-17)

### Created

- `prisma/migrations/20260717074537_add_macro_indicator/` — additive `MacroIndicator` model (`key`, `date`, `value`, unique `(key, date)`) for FII/DII and macro rows
- `src/lib/ingestion/types.ts` — pluggable `IngestionAdapter` interface + shared context
- `src/lib/ingestion/parse.ts` (+ tests) — pure bhavcopy CSV / NSE report-date parsers with Zod validation
- `src/lib/ingestion/yahooFinance.ts` — OHLCV (last ~10 sessions) + basic fundamentals per stock, throttled with retry/backoff
- `src/lib/ingestion/nseBhavcopy.ts` — official NSE sec_bhavdata_full CSV (EQ series, delivery %), walks back up to 7 days for latest published file
- `src/lib/ingestion/fiiDiiFlows.ts` — NSE FII/DII daily net figures → `fii_net` / `dii_net` MacroIndicator rows
- `src/lib/ingestion/macroIndicators.ts` — USD/INR, Brent, India VIX, 10Y, S&P 500, Nasdaq futures, Nifty, Sensex quotes
- `src/lib/ingestion/runner.ts` — sequential runner with per-adapter failure isolation + `IngestionRun` logging
- `src/lib/cron.ts` — `CRON_SECRET` check (Bearer or `x-cron-secret` header)
- `src/app/api/jobs/ingest-eod/route.ts` — POST-only cron-protected job route (optional adapter filter in body)
- `vercel.json` — weekday cron schedule for `/api/jobs/ingest-eod`
- `scripts/verify-ingestion.ts` — DB verification helper

### Modified

- `prisma/schema.prisma` — added `MacroIndicator` (additive only)
- `.env` — rotated `CRON_SECRET` to a random value
- `package.json` — pinned `yahoo-finance2@2.13.3` (2.14.x removed chart/quoteSummary modules)

### Verification

| Check | Result |
|-------|--------|
| Migration applied | Pass |
| Unauthorized POST to job route | 401 |
| Real EOD cycle | bhavcopy: 49/50 symbols upserted for 2026-07-16 (TATAMOTORS absent from EQ series that day); FII/DII: fii_net −4205.56 Cr, dii_net +2986.41 Cr |
| Synthetic rows superseded, not deleted | 4451 SYNTHETIC price bars retained; 49 real NSE_BHAVCOPY rows |
| yahoo_finance / macro_indicators | Rate-limited by Yahoo (429) from this network — adapters now retry with backoff and report FAILED when fully blocked; bhavcopy remains the primary EOD price source |
| `npm run typecheck` / `npm test` / `npm run lint` | Pass (24/24 tests) |

### Stop point

Awaiting confirmation before Phase 4 (scoring engine on real data).

## Phase 4 — Real-data scoring engine + AI readiness (2026-07-17)

### Audit result

- Existing `computeHealthScore`, band mapping, 11 influencer definitions, and JSON breakdown parser were reusable.
- No real indicator math or scoring job existed; all prior readings/scores came from deterministic synthetic seed signals.
- One real EOD session was insufficient for RSI/50DMA/200DMA, so an official NSE history backfill was required.

### Created

- `scripts/backfill-bhavcopy.ts` — idempotent official NSE bhavcopy backfill; supersedes same-date synthetic bars without deleting unrelated synthetic history
- `src/lib/scoring/indicators.ts` (+ tests) — pure bounded math for SMA, Wilder RSI, median, z-score, decay weighting, percent changes
- `src/lib/scoring/influencers.ts` (+ tests) — deterministic normalizers for all 11 v1 influencers, each returning raw value, normalized score, reason, provenance, fallback flag, and data quality
- `src/lib/scoring/sensitivity.ts` — conservative sector sensitivity map for USD/INR, crude, and FII flow
- `src/lib/scoring/engine.ts` — point-in-time, idempotent scoring pass (`date <= asOf`) that writes COMPUTED readings/scores, sector averages, and AI-ready `FeatureSnapshot` vectors
- `src/app/api/jobs/score/route.ts` — cron-protected scoring endpoint with optional date
- `scripts/verify-scoring.ts` — validates row counts, score bounds, breakdown shape, provenance, and feature snapshots

### Modified

- `vercel.json` — score job scheduled 15 minutes after EOD ingestion
- `src/lib/queries/parsers.ts` — validates optional scoring metadata (`rawValue`, `dataQuality`, `provenance`, `isFallback`, `engineVersion`)
- `src/lib/queries/stocks.ts` and stock detail UI — derive and display weighted data confidence
- Page provenance tags — distinguish real NSE computed scores from synthetic market snapshots

### Real-data results

- Backfilled 220 official NSE sessions: 10,810 stock-day price bars.
- Scored 50 active stocks as of 2026-07-16.
- Wrote 50 COMPUTED HealthScores, 550 COMPUTED InfluencerReadings, and 50 leakage-safe FeatureSnapshots.
- Score range: 36.28–59.96; average weighted data confidence: 43.1%.
- Technical factors use real NSE history. Missing Yahoo fundamentals, real news, VIX, and USD/INR/crude stay neutral with explicit `dataQuality=0`; one-day FII and market-proxy sector momentum are marked lower-quality fallbacks.
- FeatureSnapshot labels remain null until future prices mature; no same-day target leakage is introduced.

### Verification

| Check | Result |
|-------|--------|
| Bhavcopy backfill | 220/220 sessions, 10,810 stock-days |
| Unauthorized score POST | 401 |
| Two consecutive score runs | Identical summaries; no row-count growth |
| Computed output | 50 scores, 550 readings, 50 feature snapshots; 11 breakdown entries per stock |
| HTTP dashboard smoke | All six data pages 200 and show real/computed provenance |
| `npm run typecheck` / `npm test` / `npm run lint` | Pass (33/33 tests) |
| `npm run build` | Pass; score and ingestion routes compiled |

### Stop point

Awaiting confirmation before Phase 5 (OpenAI news sentiment, baseline predictions, and feature-store jobs).

## Interim — Live ticker tape with intraday streaming (2026-07-17)

### Created

- `src/lib/queries/market.ts#getTickerTape` — indices (NIFTY 50, SENSEX, India VIX) plus active-stock closes with day-over-day change for the header tape
- `src/app/api/ticker/route.ts` — no-store JSON endpoint used as EOD baseline and polling fallback
- `src/components/TickerTape.tsx` — scrolling marquee mounted in `AppShell`; pauses on hover, links stocks to detail pages, respects reduced motion
- `src/lib/live/yahooStream.ts` (+ tests) — dependency-free protobuf (yaticker) decoder and NSE/index symbol mapping for Yahoo Finance's public streaming WebSocket
- `src/hooks/useLiveQuotes.ts` — browser WebSocket client with exponential-backoff reconnect and 1s-batched state updates
- `scripts/smoke-yahoo-stream.ts` — Node smoke test for the stream + decoder

### Behavior

- During NSE market hours the tape overlays real-time intraday prices/percent changes from the stream (green dot, "Live"); connected but idle shows "Live·idle"; otherwise it falls back to latest EOD closes ("EOD") refreshed every 60s via `/api/ticker`.
- No server-side socket infrastructure — the browser connects directly to Yahoo, so it deploys unchanged on Vercel.

### Verification

| Check | Result |
|-------|--------|
| `npm run typecheck` / `npm test` | Pass (37/37 tests incl. 4 new decoder/mapping tests) |
| Stream smoke test | Connected, subscribed, decoded live ticks (BTC-USD after IST market close) |
| `/api/ticker` | Returns indices + 24 stocks with change % |
| `/dashboard` | 200 with tape mounted |

## Phase 5 — Live AI enterprise dashboard prototype (2026-07-17)

### Live data and provenance

- Added shared `LiveMarketProvider` with deduplicated Yahoo subscriptions,
  reconnect/backoff, market-session status, tick timestamps and stale detection.
- Added explicit `Live`, `Delayed`, `EOD`, `Stale`, `Synthetic` and
  `Unavailable` states across ticker, stock quotes and operational UI.
- Added normalized 15-minute/hourly Yahoo candle API, timestamped
  `IntradayBar` storage, idempotent upserts, bounded ingestion and retention.
- Yahoo is labeled as an unofficial prototype source; official NSE EOD remains
  the durable fallback.

### Prediction and AI

- Extended horizons to M15, H1, EOD, D1, W1 and M1.
- Added leakage-safe feature builder, explainable rules handler, shadow
  nonlinear handler and ensemble probabilities/ranges/uncertainty.
- Added protected prediction and outcome-label jobs; accuracy is derived from
  matured outcomes rather than seeded values.
- Added structured OpenAI explanations with evidence-only prompts, Zod output
  validation, advice-language rejection, cache and daily token-budget controls.
- Added a deterministic local explanation fallback when OpenAI is unavailable.

### Enterprise UX

- Reworked dashboard hierarchy around market regime, freshness, service health,
  high-confidence outlooks, sector heatmap and explainable drivers.
- Upgraded stock details with sticky live context, true candlesticks and volume,
  multi-horizon probability bars, expected range, model trust and AI evidence.
- Added live overlays to stock/watchlist rows, global symbol search, skip link,
  keyboard ticker pause, mobile escape handling, loading skeletons and chart
  data tables.
- Corrected Vercel cron routes to support authenticated `GET`.

### Migration

- `20260717122500_live_ai_enterprise` applied successfully to Neon.

### Verification

- Prisma schema formatted/client regenerated.
- TypeScript strict check passed.
- 54/54 unit tests passed, including freshness, candle normalization,
  feature completeness, probability bounds and AI guardrails.
- Prediction job wrote 300 computed records: 50 stocks × six horizons, with
  normalized probability sums and confidence range 37.58%–98.73%.
- Outcome job matured 196 historical D1 predictions and replaced seeded
  accuracy metadata with realized-outcome metrics.
- AI explanation smoke produced a schema-valid, advice-safe local fallback;
  one cached explanation record was persisted.
- Intraday ingestion failure drill attempted two symbols, recorded both Yahoo
  failures, and preserved functional EOD fallback without breaking the UI.
- `/dashboard`, `/stocks`, `/stocks/RELIANCE` and `/api/market/intraday` all
  returned HTTP 200.
- ESLint, strict typecheck and production Next.js build passed; all new API/job
  routes compiled.

## Phase 6 — Global multi-asset research foundation (2026-07-17)

### Global identity and terminal

- Added canonical `Instrument`, `Venue`, `ProviderInstrument`, `InstrumentQuote`,
  `InstrumentBar`, and provider-budget models with additive Neon migrations.
- Migrated existing NSE/BSE stocks through an optional compatibility link and
  seeded a curated global equity, ETF, index, FX, crypto and proxy universe.
- Added `/assets`, stable `/assets/[assetId]`, global autocomplete search,
  currency-aware formatting, route loaders, provider cards, session state, and
  a global dashboard quote strip.

### Free-first providers and data truth

- Added quota-aware CoinGecko crypto and Frankfurter central-bank reference FX
  ingestion plus authenticated `/api/jobs/ingest-global`.
- Added `Degraded` freshness semantics, hot/warm/cold coverage policy, provider
  display-right metadata, daily budget accounting, and failure recording.
- Yahoo remains an explicitly unofficial, removable prototype overlay.

### AI decision safety and paper risk

- Added a single decision-support gate for stale/delayed data, calibration,
  sample size, completeness, ensemble disagreement, and after-cost expected
  value. Unsafe outputs default to `Stand aside`.
- Added Brier score and conformal interval primitives and a paper-only
  risk-sizing simulator with loss budgets and fractional-Kelly caps.
- Fixed M15/H1/EOD prediction features to consume intraday bars rather than
  daily closes, added session-aware NSE target resolution, intraday outcome
  labeling, and explanation cache invalidation.
- Renamed the deterministic nonlinear shadow voice so it is never represented
  as a trained GBM.

### Verification

- Both additive migrations deployed successfully to Neon.
- Seed collision handling now preserves real observations with idempotent
  `skipDuplicates`.
- Global ingestion persisted 3 crypto and 4 reference-FX quotes.
- `/assets`, canonical BTC detail, `/dashboard`, and asset search returned 200.
- Strict typecheck, ESLint, 64/64 unit tests, and production build passed.
