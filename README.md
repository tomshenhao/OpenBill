# OpenBill

Help ordinary New Zealand households reduce recurring bills through transparent,
accurate, independent comparisons. OpenBill is a public-interest, open-source
project, without advertising or commission-driven recommendations.

## What works now

- English at `/` and Simplified Chinese at `/zh/`, including metadata, errors,
  document language, and accessible labels.
- A mobile-friendly electricity usage form: enter kWh and billing days to see
  average daily usage. Zero consumption is valid. This is not a cost estimate.
- Calculations run entirely in browser memory. No upload, account, analytics,
  cookies, input persistence, API routes, or server actions.
- **No supplier prices, savings, or rankings.** The tariff catalogue is empty
  until public official-source evidence has been verified and reviewed.

## Run locally

Requires **Node.js 24.14 or later in the 24.x LTS line** and npm. `.nvmrc` records
the version used for verification. No account, credentials, or paid services are needed.

```sh
npm ci
```

Copy `.env.example` to `.env.local` to disable framework development/build telemetry:

```powershell
Copy-Item .env.example .env.local
```

On macOS/Linux, use `cp .env.example .env.local`. This file contains no secrets.
Then start the development server:

```sh
npm run dev
```

Open [English](http://127.0.0.1:3000/) or
[简体中文](http://127.0.0.1:3000/zh/). Stop with Ctrl+C. On Windows, if PowerShell
blocks npm/npx scripts, use `npm.cmd` and `npx.cmd` instead; no policy change is needed.

For a production-mode local preview:

```sh
npm run build
npm start
```

The build exports static files to `out/`. `npm start` serves them on loopback only,
with request logging off and a policy blocking browser connections and form
submissions. It is a local preview server, not a production hosting service.
The exported HTML also includes a connection-blocking policy. Development mode
allows Next.js live-reload traffic; household inputs still never leave component state.

## Checks

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

`check` runs ESLint, strict TypeScript checking, and Vitest unit tests. Playwright
starts/stops its own static preview on port 3100 and tests desktop/mobile Chromium:
both languages, validation and keyboard submission, clearing, fresh reloads,
language changes, overflow, automated WCAG checks with axe, and no requests/logs/
storage changes during input and calculation. Browser tests use synthetic numbers.
Traces, screenshots, and videos are disabled. The browser download is a one-time
development requirement; no browser installation is needed to run the site.

On Linux CI, install browser system dependencies with
`npx playwright install --with-deps chromium`. GitHub Actions runs the same checks;
it does not deploy. Automated accessibility checks do not replace manual keyboard,
screen-reader, zoom, or translation review.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/app/[[...locale]]/` | Statically generated `/` and `/zh/` pages and document metadata |
| `src/components/` | Responsive presentation and temporary usage input state |
| `src/i18n/` | English and Simplified Chinese copy |
| `src/domain/electricity/usage.ts` | Pure validation and daily usage calculation |
| `src/domain/electricity/tariff.ts` | Future verified flat-rate tariff contract |
| `src/data/electricity/tariffs.ts` | Public supplier catalogue, currently empty |
| `evidence/electricity/` | Future screenshots of official public pricing pages |
| `tests/` | Unit, privacy regression, accessibility, and browser tests |
| `scripts/serve.mjs` | Dependency-free local static preview |

Read [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), and
[data policy](docs/data-policy.md) before contributing. Code is MIT licensed;
supplier evidence remains subject to its original source's rights.

## Next steps

1. Review both languages with household users, including keyboard and screen-reader users.
2. Define geographic coverage, meter configurations, eligibility, GST, fees, and price
   freshness rules with electricity-domain reviewers.
3. Build and test an automated provenance/evidence validation gate **before** adding
   real tariffs or enabling comparisons. The initial TypeScript contract alone does
   not verify a supplier's price, source authenticity, screenshot, or freshness.
4. Add reviewed official-source records, then implement auditable exact-decimal cost
   calculations. Explain assumptions and coverage before showing any savings.
5. Extend the category boundaries to broadband, mobile, and insurance when their own
   evidence models and calculation rules are ready.

Setup follows the official [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation)
and [Tailwind CSS Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
No deployment, external registration, or purchase is part of this scaffold.
