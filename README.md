# Alladin

Alladin is a free-first global multi-asset research terminal with an HFT-style
interface, explicit data provenance, calibrated-decision guardrails, and
paper-risk tools. It covers a curated catalog of equities, ETFs, indices, FX,
crypto, commodity proxies, and bond/rates proxies. India equity health remains
a first-class market profile.

> **Disclaimer:** Alladin is for informational and educational purposes only.
> It does not provide investment advice, buy/sell/hold recommendations, or
> SEBI-registered investment advisory services.

## Project status

Alladdin now includes a complete enterprise-dashboard prototype with durable
official NSE EOD history, an unofficial Yahoo browser stream for development,
point-in-time health scoring, multi-horizon ensemble predictions, outcome
tracking, guarded OpenAI explanations, and explicit data freshness/provenance.
It also includes a canonical global instrument master, `/assets` catalog and
asset workspaces, CoinGecko crypto observations, central-bank reference FX,
provider budgets, global session states, after-cost abstention gates, and a
paper position-risk simulator.

Implemented:

- Enterprise dashboard, stock workspace, sector, influencer and watchlist views
- Official NSE bhavcopy EOD backfill and deterministic health scoring
- Yahoo Finance prototype WebSocket quotes with EOD/stale/unavailable fallback
- Timestamped 15-minute/hourly bar storage and normalized candle API
- M15, H1, EOD, D1, W1 and M1 directional probabilities and expected ranges
- Realized-outcome labeling and model metrics (no seeded accuracy claims)
- Evidence-bound OpenAI narratives with Zod validation, caching and token budget
- Persistent provenance, quality and operational-health indicators
- Stable asset IDs with venue, MIC, currency, timezone and provider mappings
- Global asset search that disambiguates symbol, venue and asset class
- Quota-aware CoinGecko and Frankfurter ingestion with `Degraded` states
- Config-gated Twelve Data and Alpha Vantage adapters (inert without keys)
- Global instrument-level multi-horizon predictions and outcome labeling
  (`InstrumentPrediction`), independent of the equity path
- Model trust / calibration page: accuracy and three-class Brier by horizon,
  reliability histogram, stand-aside rate, and an ACTIVE-vs-SHADOW model bench
- Trained logistic shadow model evaluated on a holdout vs a majority baseline,
  registered as SHADOW and never used for live signals
- Operational alerts for ingestion failures, degraded providers, volatility
  regime stress, index shocks, and stand-aside dominance
- Config-gated Clerk auth with per-user watchlists (add/remove); falls back to
  the labeled demo watchlist when Clerk keys are absent
- Decision support that defaults to `Stand aside` on stale, uncalibrated,
  conflicted, thin-sample, or non-positive after-cost outputs

Important limitations:

- Yahoo is an unofficial prototype source and is not licensed for centralized
  public NSE/BSE redistribution. The UI labels it accordingly.
- The current ensemble combines explainable rules with a shadow nonlinear model;
  it is not represented as a production-trained trading model.
- Authentication and per-user watchlists activate only when both Clerk keys are
  configured; otherwise the app runs unauthenticated with the labeled demo.
- The trained logistic model is a SHADOW benchmark only and is not promoted to
  live signals until it beats the active ensemble and its baseline out of sample.
- This is not true HFT. It has no colocation, licensed L2 feed, broker
  connectivity, or live order execution. No AI can guarantee profitable trades.

## Product concept

Each stock receives a composite Health Score from 0 to 100. The score is
explainable: every stored result can include the individual factors, their
weights, normalized values, point impacts, and a short reason.

The Phase 1 scoring formula is:

```text
impact(i)   = normalizedScore(i) × weight(i) ÷ 2
healthScore = clamp(50 + Σ impact(i), 0, 100)
```

Normalized influencer values use a `-100..+100` scale. The division by two
means that a fully positive signal with a total weight of `1.0` can add 50
points to the neutral base score of 50.

### Health bands

| Score | Band |
| ---: | --- |
| 80–100 | Strong |
| 65–79.99 | Healthy |
| 45–64.99 | Neutral |
| 30–44.99 | Weak |
| Below 30 | Critical |

### Version 1 influencers

The initial weights total `1.0`:

| Influencer | Category | Scope | Weight |
| --- | --- | --- | ---: |
| Moving-average trend | Technical | Stock | 0.15 |
| RSI (14) | Technical | Stock | 0.10 |
| Volume and delivery | Technical | Stock | 0.10 |
| EPS growth | Fundamental | Stock | 0.12 |
| P/E valuation | Fundamental | Stock | 0.08 |
| Leverage | Fundamental | Stock | 0.05 |
| News sentiment | Sentiment | Stock | 0.12 |
| FII flow | Flow | Market | 0.10 |
| Sector momentum | Macro | Sector | 0.08 |
| India VIX | Macro | Market | 0.05 |
| USD/INR and crude | Macro | Market | 0.05 |

The schema supports `M15`, `H1`, `EOD`, `D1`, `W1`, and `M1` directional
outlooks with class probabilities, expected ranges, uncertainty and matured
outcomes. These are educational model outputs, not trading recommendations.

## Technology stack

- [Next.js 15](https://nextjs.org/) with the App Router
- [React 19](https://react.dev/)
- [TypeScript](https://www.typescriptlang.org/) in strict mode
- [Tailwind CSS 4](https://tailwindcss.com/)
- [Prisma 6](https://www.prisma.io/) and PostgreSQL
- [Clerk](https://clerk.com/) for authentication (currently passthrough)
- [OpenAI SDK](https://github.com/openai/openai-node) for guarded explanations
- [Yahoo Finance 2](https://github.com/gadicc/node-yahoo-finance2) for prototype
  quote/candle ingestion with official EOD fallback
- [Recharts](https://recharts.org/) plus accessible SVG candlesticks
- [Zod](https://zod.dev/) for runtime validation
- [Vitest](https://vitest.dev/) for unit tests

## Prerequisites

- Node.js 20 or newer is recommended
- npm
- A PostgreSQL database (Neon or another PostgreSQL-compatible provider)

The repository includes a dependency lockfile and additive Prisma migrations.

## Getting started

### 1. Install dependencies

```bash
npm install
```

The `postinstall` script automatically generates the Prisma client.

### 2. Configure the environment

Copy `.env.example` to `.env`:

```bash
# macOS/Linux
cp .env.example .env

# Windows Command Prompt
copy .env.example .env
```

At minimum, replace the example `DATABASE_URL` with a valid PostgreSQL
connection string.

```dotenv
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require"
```

Do not commit `.env` or expose server credentials through variables prefixed
with `NEXT_PUBLIC_`.

### 3. Initialize the database

Apply the committed migration history:

```bash
npx prisma migrate deploy
```

For local schema development:

```bash
npm run db:migrate -- --name init
```

Do not use `db:push` against shared/production databases.

### 4. Load synthetic data

```bash
npm run db:seed
```

The seed is deterministic and repeatable. It creates a representative dataset
for application development without requiring external market-data services.

### 5. Start the application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Purpose |
| --- | :---: | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection used by Prisma |
| `OPENAI_API_KEY` | No | Server-only key reserved for AI workflows |
| `OPENAI_DAILY_TOKEN_BUDGET` | No | Daily token budget; defaults to `500000` |
| `COINGECKO_API_KEY` | No | Demo key for higher-reliability crypto aggregation |
| `TWELVE_DATA_API_KEY` | No | Optional keyed prototype provider; honor plan display rights |
| `ALPHA_VANTAGE_API_KEY` | No | Optional low-frequency research fallback |
| `MARKET_BASE_CURRENCY` | No | Reporting base currency; defaults to `USD` |
| `ENABLE_YAHOO_PROTOTYPE` | No | Enables unofficial Yahoo overlay; defaults to `true` |
| `CRON_SECRET` | No | Reserved for protecting scheduled-job endpoints |
| `CLERK_SECRET_KEY` | No | Clerk server credential |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | No | Clerk browser credential |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | No | Sign-in route (default `/sign-in`) |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | No | Sign-up route (default `/sign-up`) |
| `TWELVE_DATA_API_KEY` | No | Enables the Twelve Data quote adapter |
| `ALPHA_VANTAGE_API_KEY` | No | Enables the Alpha Vantage fallback adapter |
| `NODE_ENV` | No | `development`, `test`, or `production` |

Server variables are lazily validated with Zod in `src/lib/env.ts`.
Authentication is config-gated: when both `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
and `CLERK_SECRET_KEY` are set, `src/middleware.ts` enables Clerk, the layout
wraps the app in `ClerkProvider`, a sign-in control appears, and the watchlist
becomes per-user. Without both keys the app runs unauthenticated with the
labeled demo watchlist. Twelve Data and Alpha Vantage adapters are likewise
inert until their keys are provided.

## Data truth and freshness

- `Live` means a recent browser-delivered Yahoo prototype tick.
- `Delayed` means connected or cached Yahoo data without a fresh tick.
- `EOD` means the latest durable close, normally official NSE bhavcopy.
- `Stale`, `Synthetic`, and `Unavailable` are never silently promoted to live.
- `Degraded` means a provider budget, circuit, or capability restriction reduced
  cadence; prediction panels abstain rather than treating it as live.
- Every prediction is tied to a model version, point-in-time feature vector,
  horizon, target timestamp and eventual realized outcome.

Yahoo availability is not guaranteed. It can rate-limit or change without
notice. A public production product requires a licensed redistribution feed.

## Scheduled jobs

Vercel Cron sends authenticated `GET` requests. Job routes also accept `POST`
for manual operations:

- `/api/jobs/ingest-eod` — official/delayed EOD adapters
- `/api/jobs/score` — deterministic health-score pass
- `/api/jobs/predict` — multi-horizon ensemble inference (equities)
- `/api/jobs/predict-global` — multi-horizon inference over the instrument master
- `/api/jobs/label-outcomes` — mature equity and instrument outcomes, refresh metrics
- `/api/jobs/train-shadow` — train and holdout-evaluate the logistic shadow model
- `/api/jobs/ingest-intraday` — bounded Yahoo prototype candle ingestion
- `/api/jobs/ingest-global` — quota-aware CoinGecko, reference FX, and keyed providers

All job routes require `Authorization: Bearer <CRON_SECRET>` or the
`x-cron-secret` header. Vercel Hobby cron timing is limited; frequent intraday
server ingestion requires a paid scheduler or persistent worker. Browser live
quotes remain independent of cron.

## Prediction methodology

The current active handler is an explainable ensemble. It uses only observations
available at the prediction timestamp: returns, trend, RSI, volatility, volume,
health score, market regime, institutional flow, sentiment and sector context.
Feature completeness caps confidence, and insufficient data returns an explicit
inconclusive state. OpenAI explains stored evidence; it does not generate the
directional prediction.

## Database design

The Prisma schema contains 16 models grouped around the following concerns:

### Market data

- `Sector` — sector identity, benchmark, and aggregate health
- `Stock` — NSE/BSE security metadata
- `PriceBar` — OHLCV, adjusted close, and delivery data
- `Fundamental` — periodic valuation, growth, profitability, and leverage data
- `MarketSnapshot` — Nifty, Sensex, India VIX, FII/DII, FX, and crude context

### Explainable scoring

- `Influencer` — scoring factor definition, category, scope, and weight
- `InfluencerReading` — normalized value and explanation for a stock/date
- `HealthScore` — composite score, band, summary, and leading drivers

### Predictions and features

- `MlModel` — versioned model metadata and evaluation metrics
- `Prediction` — horizon, direction, confidence, probabilities, and outcome
- `FeatureSnapshot` — point-in-time feature values used by a model

### User data and operations

- `Watchlist` and `WatchlistItem` — per-user stock collections
- `UserColumnPreference` — saved table-column configuration
- `NewsItem` — stock news, sentiment, and optional AI-generated summaries
- `ApiUsage` — provider usage and cost tracking
- `IngestionRun` — ingestion job status and diagnostics

The schema includes exchange, data-source, score-band, influencer-category,
prediction-horizon, direction, and model-kind enums. Unique constraints are
used to support repeatable time-series writes and prevent duplicate watchlist
entries.

## Synthetic seed data

The `phase1-synthetic-v1` seed creates:

- 50 NSE stocks across eight sectors
- 11 weighted influencer definitions
- 90 recent weekday trading sessions
- Price bars and fundamental snapshots
- Stock, sector, and market influencer readings
- Explainable Health Scores
- Market snapshots and synthetic news
- A baseline rules model
- Feature snapshots and D1/W1/M1 predictions for recent sessions

Synthetic records that support provenance are marked with
`DataSource.SYNTHETIC`.

Re-running the seed upserts reference records and rebuilds synthetic time-series
data for the seeded stocks. Be careful on a shared database: the current cleanup
also removes feature snapshots and predictions for those stocks because those
two models do not have their own data-source discriminator.

## Available scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Next.js development server |
| `npm run build` | Create a production build |
| `npm run start` | Serve the production build |
| `npm run lint` | Run the configured Next.js lint command |
| `npm run typecheck` | Run TypeScript without emitting files |
| `npm test` | Run all Vitest tests once |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run db:generate` | Generate the Prisma client |
| `npm run db:migrate` | Create and apply a development migration |
| `npm run db:push` | Synchronize the schema without a migration |
| `npm run db:seed` | Generate deterministic synthetic data |
| `npm run db:studio` | Open Prisma Studio |

## Testing and quality checks

Run the complete local validation set with:

```bash
npm run typecheck
npm test
npm run lint
npm run build
```

Current tests cover:

- Health Score calculation, clamping, and weight totals
- Health-band boundaries
- Seed stock count, sector coverage, and symbol uniqueness
- Deterministic pseudo-random seed behavior

Vitest runs in a Node environment and discovers tests under `src/**/*.test.ts`
and `prisma/**/*.test.ts`.

## Project structure

```text
alladdin/
├── prisma/
│   ├── schema.prisma        # PostgreSQL data model
│   ├── seed.ts              # Synthetic database generator
│   ├── seed-data.ts         # Stock catalog and deterministic helpers
│   └── seed-data.test.ts
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx         # Current landing page
│   ├── components/
│   │   ├── AppShell.tsx
│   │   └── Disclaimer.tsx
│   ├── lib/
│   │   ├── scoring/         # Score calculation, bands, and tests
│   │   ├── db.ts            # Development-safe Prisma singleton
│   │   ├── env.ts           # Server environment validation
│   │   └── utils.ts
│   └── middleware.ts        # Phase 1 passthrough middleware
├── stitch_indian_stock_ai_dashboard/
│   └── ...                  # Standalone design-reference prototypes
├── .env.example
├── next.config.ts
├── package.json
├── tsconfig.json
└── vitest.config.ts
```

The `stitch_indian_stock_ai_dashboard` directory contains static design
references and is not integrated into the Next.js application. Its branding and
recommendation-oriented prototype copy should not be treated as current Alladin
functionality.

## Production and deployment notes

No Docker image, CI workflow, or platform-specific deployment configuration is
included yet. A deployment should:

1. Provision a PostgreSQL database.
2. Configure `DATABASE_URL` and any optional service credentials.
3. Generate the Prisma client during installation or build.
4. Apply committed migrations before serving traffic.
5. Run `npm run build`.
6. Start with `npm run start`, or use a platform-managed Next.js runtime.

Do not rely on `prisma migrate deploy` for a fresh database until migration
files have been created and committed.

## Engineering guidelines

- Keep schema changes additive where practical and commit migration files.
- Validate external provider payloads with Zod before database writes.
- Keep OpenAI and other provider secrets server-side.
- Preserve source and timestamp metadata for ingested market data.
- Make score and prediction outputs explainable and reproducible.
- Use directional language; do not add buy/sell/hold recommendations.
- Label synthetic, delayed, estimated, and live data clearly.
- Add tests for scoring changes and deterministic seed behavior.

## Contributing

1. Create a focused branch.
2. Make the smallest coherent change.
3. Add or update tests.
4. Run type checking, tests, linting, and a production build.
5. Open a pull request describing the behavior change and validation performed.

## License

Licensed under the Apache License 2.0. See `LICENSE`.
