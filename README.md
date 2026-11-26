# OpenBill

**Less on bills. More for life.**

**让账单更轻，让生活更自由。**

OpenBill is a free, independent, non-commercial open-source project that helps
households understand recurring bills, compare suitable options as reliable data
becomes available, and cut avoidable costs. It starts with Aotearoa New Zealand.
Communities elsewhere can fork the MIT-licensed code and adapt it to their own
languages, providers and official sources.

OpenBill has no advertising, paid placement or supplier commissions. Calculations
run in temporary browser memory. OpenBill does not save or send household entries
and has no account, bill upload or tracking.

## Core modules

The tools below describe the features implemented in this repository. A production
build can serve the listed routes. Public deployment, independent evidence review
and permission to redistribute source material each have their own approval steps.

<!-- BEGIN GENERATED MODULE STATUS -->

| Module | Status | Purpose | What works | Next milestone |
| --- | --- | --- | --- | --- |
| Electricity | Available in this build | Understand what you use, find ways to use less and eventually compare suitable retail plans. | Check charges manually or read recognised digital PDF bills in the browser. Explore ways to save and compare rates you enter. | Find reliable household-size data, starting with BRANZ HEEP2. Plan comparisons need official rates from retailers such as Genesis, Mercury and Contact, independent review and permission to publish. |
| Water | Available in this build | Understand water use, look for leaks and check how charges add up. | Auckland Watercare only. See daily household and per-person use, a general reference of 140–170 litres per person per day, leak checks and saving tips. Estimate water and wastewater charges with rates you enter. | Independently review seven archived schedules and seek Auckland usage statistics by household size. The general reference gives no household-size percentiles. Other regions are planned. |
| Mortgage | Available in this build | Compare interest rates, repayment costs, refinancing options and fees. | Estimate repayments and interest locally, compare payment frequencies and explore practical ways to reduce interest. The bank-source directory has no independently reviewed rates yet. | Confirm lender conditions, obtain publication permission and independently review mortgage rate records before displaying them. |
| Insurance | Available in this build | Understand your cover and review the terms of your policy. | Six insurance guides, plus manual house policy review and a comparison of quotes you enter. | Check evidence and reuse rights for house benchmarks. Build the other tools independently. |
| Broadband | Planned | Compare speed, cost, service availability and contract conditions. | — | Identify official sources for plan terms, typical speeds and service availability. |
| Mobile | Planned | Find plans that suit your data and calling needs at a reasonable cost. | — | Identify official sources and define a comparison based on data, calls and recurring cost. |

<!-- END GENERATED MODULE STATUS -->

The [English homepage](http://127.0.0.1:3000/) and
[简体中文首页](http://127.0.0.1:3000/zh/) link to the available tools and guides in a local preview.
Electricity analysis uses `/electricity/` and `/zh/electricity/`. Auckland water
analysis uses `/water/` and `/zh/water/`. Mortgage uses `/mortgage/` and
`/zh/mortgage/`. The insurance directory uses `/insurance/` and `/zh/insurance/`.
See the [insurance module roadmap](ROADMAP.md)
for the separate guides and planned work.

### Evidence and limits

- **Electricity usage.** Regional household comparisons are paused on the
  electricity page. The Electricity Authority EMI datasets and published P75
  and P95 thresholds remain archived for research and independent review.
  See the [archived rating rules](docs/task005-1-ratings.md) and
  [results-first electricity review](docs/task010-3-electricity-results.md).
- **Electricity prices.** The local comparison framework is tested with synthetic
  data. The production catalogue is empty. The repository records the Genesis,
  Mercury and Contact EIEP14A requests as drafts and has no verified tariff
  receipts. BRANZ HEEP2 is a lead for household-size statistics. The maintainer
  needs to confirm outreach status. See the [retailer requests](docs/retailer-requests/README.md),
  [tariff workflow](docs/task005-tariff-workflow.md) and [household-size research](docs/task004-1.md).
- **Auckland water.** The 140–170 L/person/day Watercare range is a general
  reference. Representative Auckland P25, P50, P75 and P95 data by household size
  are unavailable in the reviewed sources. Seven official schedules are archived
  locally for independent review. The bill check links to the applicable schedule
  and uses rates the user enters. See the [water module report](docs/task006-water.md).
- **NZ mortgage.** The browser calculator models principal-and-interest and
  interest-only weekly, fortnightly or monthly repayments. Eight bank sources
  have been researched. The rate catalogue awaits independent review and
  publication permission. See the [mortgage module report](docs/task007-mortgage.md).

Before OpenBill publishes a rate, it requires an official provider URL, a
verification date and a reviewed screenshot reference. An independent reviewer
checks the source, scope and price. Archive contents stay local pending any
applicable permission and independent rights review. See the [data policy](docs/data-policy.md).

## Roadmap and participation

The [bilingual roadmap](ROADMAP.md) lists milestones and the nine longer-term
categories: gas/LPG, council rates, rent, transport and vehicles, rubbish and
recycling, subscriptions, education and childcare, healthcare and dental, and
groceries and everyday essentials. See the [product vision](docs/product-vision.md)
for expense ownership and principles for expanding coverage.

Ideas, translation and accessibility reviews, official-source research and tested
code are welcome. Share general suggestions on [GitHub Issues](https://github.com/tomshenhao/OpenBill/issues).
Posting requires a GitHub account and your contribution is public. Keep names,
addresses, account numbers, bills and calculator entries out of posts. Read the
[bilingual contribution guide](CONTRIBUTING.md) for ways to help.

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

For access from another device on a trusted LAN, set `OPENBILL_DEV_ORIGINS` in
ignored `.env.local` to the **server's exact LAN IP/hostname used in the browser**
(no scheme, port, path or wildcard), then run `npm run dev:lan`. Restart after
changing the allowlist. Default `npm run dev` and the production preview remain
loopback-only. See [LAN troubleshooting and regression checks](docs/local-network.md).

局域网访问：在不入库的 `.env.local` 中设置 `OPENBILL_DEV_ORIGINS` 为浏览器使用的服务器实际 IP／主机名，
再运行 `npm run dev:lan`。不填写协议、端口、路径或通配符，修改后须重启。默认开发及生产预览仍仅监听本机。

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

## Google Search indexing

Set `OPENBILL_SITE_URL` to the public site's origin (for example,
`https://example.com`) before running `npm run build` for the public site. The
static export includes canonical URLs, English and Simplified Chinese language
links, and a `/sitemap.xml` advertised in `/robots.txt`. Builds with the variable
unset retain `noindex` for preview use.

Once the public build is live, verify the site in Google Search Console and submit
the public `/sitemap.xml` in the Sitemaps report. See
[Google's sitemap submission guide](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap#submit-your-sitemap-to-google).

## Checks

```sh
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
```

`check` runs ESLint, strict TypeScript checking, Vitest and data validation. Playwright
starts/stops its own static preview on port 3100 and tests desktop/mobile Chromium:
both languages, validation and keyboard submission, clearing, fresh reloads,
language changes, overflow, automated WCAG checks with axe, and no requests/logs/
storage changes during input and calculation. Browser tests use synthetic numbers.
Traces, screenshots, and videos are disabled. The browser download is a one-time
development requirement; no browser installation is needed to run the site.
The separate evidence-capture test creates and deletes a synthetic PNG in a
temporary directory; it never captures household inputs or a retailer site.

On Linux CI, install browser system dependencies with
`npx playwright install --with-deps chromium`. GitHub Actions runs the same checks;
it does not deploy. Automated accessibility checks do not replace manual keyboard,
screen-reader, zoom, or translation review.

## Project map

| Path | Responsibility |
| --- | --- |
| `src/app/[[...locale]]/` | Bilingual homepage, electricity and water routes with document metadata |
| `src/components/` | Responsive presentation and temporary browser input state |
| `src/i18n/` | English and Simplified Chinese copy |
| `src/config/` | Category capabilities, genuine roadmap statuses and static community destination |
| `src/domain/categories.ts` | Product category IDs, separate from implemented tariff schemas |
| `src/domain/electricity/usage.ts` | Pure validation and daily usage calculation |
| `src/domain/electricity/` | Bill, benchmark, tips, guarded comparison, tariff checks and exact money |
| `src/domain/water/` | Auckland household usage and metered charge estimates |
| `src/domain/provenance.ts` | Shared source, evidence and hash contracts |
| `data/electricity/` | Registries, immutable records/reviews, official aggregate benchmark and empty supplier catalogues |
| `data/water/` | Watercare source references and dated schedule links |
| `tools/electricity/` | Node-only archive/review, EIEP14A import, benchmark reproduction and publication gates |
| `.local-data/` | Ignored evidence, source captures and permission reviews |
| `tests/` | Unit, privacy regression, accessibility, and browser tests |
| `scripts/serve.mjs` | Dependency-free local static preview |
| `scripts/roadmap.ts` | Generates and checks the bilingual roadmap and README module table |

Read [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), and
[data policy](docs/data-policy.md) before contributing. Code is MIT licensed;
supplier evidence remains subject to its original source's rights.

Setup follows the official [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation)
and [Tailwind CSS Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).

## Data commands (official public sources only)

```sh
npm run data:validate
npm run data:query -- --retailer mercury
```

Expect zero records and no eligible prices. Validation success does not imply
market coverage. The [data guide](docs/electricity-data.md) explains `data:archive`,
`data:import`, `data:review`, `data:capture` and `data:stage-evidence`, including
templates, permission prerequisites, the 30-day freshness policy and v0.3 priorities.
Do not provide household data to these tools. Artifacts stay local and ignored;
screenshots are not redistributed by default.

After changing category or roadmap configuration or translations, run
`node scripts/roadmap.ts` to regenerate `ROADMAP.md` and the module table above.
`node scripts/roadmap.ts --check` and the unit suite detect drift.

To check the EIEP14A importer with synthetic data, use this non-writing command:

```sh
npm run data:eiep14a -- tests/fixtures/eiep14a-request.json --check
```
