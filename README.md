# OpenBill

**Less on bills. More for life.**

**让账单更轻，让生活更自由。**

OpenBill is a free, open-source, privacy-first household expense project, initially
serving New Zealand. We aim to help households understand recurring expenses,
identify unnecessary costs and make informed decisions. The project is independent
and public-interest oriented, without advertising or supplier commissions.
Electricity is our first working tool, not the limit of the vision.

v0.2 adds [official electricity data infrastructure](docs/electricity-data.md):
strict schemas, exact money/unit primitives, append-only JSON records/reviews,
SHA-256 evidence validation, a manual Mercury adapter and a permission-gated
Playwright helper. No live retailer automation or actual tariff is enabled. Read
the [official-source research](docs/official-source-research.md) before collecting.

## What works now

Task 004.2 puts regional comparisons directly after the bill breakdown, adds inclusive
billing dates and opt-in approximate dated references, and links to Billy as an external
service. See the [consumer results and unsent retailer request drafts](docs/task004-2.md).

Task 004.1 improves monthly selection, regional middle-50% context and nonblocking
price-unit warnings. Household-size peers remain unavailable. See the
[research, pilot retailer request template and intake workflow](docs/task004-1.md).

Task 004 adds **[electricity bill analysis, official monthly benchmarks and tips](docs/task004-electricity.md)**
at `/electricity/` and `/zh/electricity/`. Inputs stay in browser memory. The
benchmark contains 320 official aggregate observations across 16 regions for
January 2025–August 2026; only exact whole-month matches are compared. No invented
household-size peers or percentile rankings. The comparison engine is tested with
synthetic fixtures; the actual supplier catalogue remains empty.

任务 004 新增 `/zh/electricity/` 电费分析、同期官方地区用电均值及实用建议，全部在浏览器内处理。
基准覆盖 16 个地区、2025 年 1 月至 2026 年 8 月。真实供应商比价仍未开放。
参阅[双语功能说明](docs/task004-electricity.md)及 [EIEP14A 研究与导入](docs/eiep14a-research.md)。

The [Task 004 implementation report](docs/task004-report.md) records the architecture,
file inventory, validation results, commands and remaining verification work.

- English at `/` and Simplified Chinese at `/zh/`, including metadata, errors,
  document language, and accessible labels.
- A household-wide mission, six core category cards, nine progressively disclosed
  future ideas, a typed public roadmap and a public GitHub community invitation.
- A mobile-friendly electricity usage form: enter kWh and billing days to see
  average daily usage. Zero consumption is valid. This is not a cost estimate.
- Calculations run entirely in browser memory. No upload, account, analytics,
  cookies, input persistence, API routes, or server actions.
- **No supplier prices, savings, or rankings.** The tariff catalogue is empty
  until public official-source evidence has been verified and reviewed.

## Complete vision, incremental delivery

The six core categories are **electricity, water, mortgage, insurance, broadband
and mobile**. Electricity analysis, usage benchmarks and tips are available; the remaining core
tools are labelled “Coming soon / 即将推出”, with no fake comparison links.

Nine longer-term categories are gas/LPG, council rates, rent, transport/vehicles,
waste/recycling, subscriptions/memberships, education/childcare, healthcare/dental,
and groceries/essentials. They are plans, not working functionality. Useful future
guidance may address usage, payment options or unnecessary costs when switching
providers is not possible or meaningful. No savings are promised without evidence.

See the [product vision](docs/product-vision.md) for the full scope and expense
ownership rules, and [ROADMAP.md](ROADMAP.md) for bilingual progress. Category and
milestone configuration are typed and shared with the homepage. Completed v0.2
means its data foundation is implemented/tested, not that prices are verified or
comparisons are available. There are no invented launch dates or percentages.

## Help shape OpenBill

Share general needs through the existing [GitHub Issues page](https://github.com/tomshenhao/OpenBill/issues).
GitHub is a separate public website; posting requires an account and contributions
are public. Do not include personal financial details, account numbers, addresses,
uploaded bills or calculator entries. Nothing from the calculator is attached.
The bilingual issue template requests general needs without household information.
See [CONTRIBUTING.md](CONTRIBUTING.md) for English/Chinese participation guidance.

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
| `src/app/[[...locale]]/` | English/Chinese home and electricity pages with document metadata |
| `src/components/` | Responsive presentation and temporary browser input state |
| `src/i18n/` | English and Simplified Chinese copy |
| `src/config/` | Category capabilities, genuine roadmap statuses and static community destination |
| `src/domain/categories.ts` | Product category IDs, separate from implemented tariff schemas |
| `src/domain/electricity/usage.ts` | Pure validation and daily usage calculation |
| `src/domain/electricity/` | Bill, benchmark, tips, guarded comparison, tariff checks and exact money |
| `src/domain/provenance.ts` | Shared source, evidence and hash contracts |
| `data/electricity/` | Registries, immutable records/reviews, official aggregate benchmark and empty supplier catalogues |
| `tools/electricity/` | Node-only archive/review, EIEP14A import, benchmark reproduction and publication gates |
| `.local-data/` | Ignored evidence, source captures and permission reviews |
| `tests/` | Unit, privacy regression, accessibility, and browser tests |
| `scripts/serve.mjs` | Dependency-free local static preview |
| `scripts/roadmap.ts` | Generates/checks the bilingual public roadmap from shared configuration |

Read [AGENTS.md](AGENTS.md), [architecture](docs/architecture.md), and
[data policy](docs/data-policy.md) before contributing. Code is MIT licensed;
supplier evidence remains subject to its original source's rights.

## Next steps

1. Review both languages with household users, including keyboard and screen-reader users.
2. Define geographic coverage, meter configurations, eligibility, GST, fees, and price
   freshness rules with electricity-domain reviewers.
3. Use the implemented provenance/evidence gate with permitted official sources and
   independent reviewers. Schema validation never verifies a price. No complete
   privacy-compatible rate card was obtained in the initial six-retailer research.
4. Add permitted, reviewed official-source records and independently validate the
   tested exact-money comparison engine on real coverage, then implement and review
   consumer profile entry/results. Explain assumptions before showing any savings.
5. Introduce water, mortgage, insurance, broadband and mobile one category at a time,
   with their own evidence/calculations and community priorities. Keep wider plans
   separate from implemented functionality.

Setup follows the official [Next.js installation guidance](https://nextjs.org/docs/app/getting-started/installation)
and [Tailwind CSS Next.js guide](https://tailwindcss.com/docs/installation/framework-guides/nextjs).
No deployment, external registration, or purchase is part of this scaffold.

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

After changing category/roadmap configuration or translations, run
`node scripts/roadmap.ts` to regenerate ROADMAP.md. `node scripts/roadmap.ts --check`
and the unit suite detect drift. New product scope does not change the v0.2
tariff schemas or allow a universal calculator for unrelated expenses.
