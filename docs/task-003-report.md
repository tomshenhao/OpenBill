# Task 003 — Product vision, homepage and community roadmap

Implemented locally on the existing `feature/v0.2-electricity-data` branch so the
uncommitted v0.2 work is retained. No commits, pushes, deployments, purchases or
new dependencies were introduced.

## Product and homepage

The mission is now **Less on bills. More for life. / 让账单更轻，让生活更自由。**
OpenBill is a free, independent household expense project, initially serving New
Zealand, with electricity as the first working tool rather than the entire product.

The homepage keeps the green identity, house illustration, typography and local
electricity form. Its main additions are:

1. The broader mission and clear explanation of gradual development.
2. Six core cards: electricity, water, mortgage, insurance, broadband and mobile.
   Only electricity links to a working usage check. Others say Coming soon / 即将推出.
3. More ways to save / 更多省钱方式, with nine future categories behind native
   keyboard-accessible disclosure. They are not shown as available tools.
4. A roadmap separating completed foundations from planned comparisons/categories.
5. Help shape OpenBill / 一起完善 OpenBill, with a real public feedback destination
   and account/publicity/privacy notices before leaving the site.

No prices, savings estimates, fake comparison interfaces, unsupported dates,
completion percentages or automatic collection were added.

## Typed category and roadmap configuration

`src/domain/categories.ts` defines product IDs. `src/config/categories.ts` contains
category tier, icon, genuine status, implemented locale route or null, supported
features, future scope, applicable source readiness, category-specific calculation
metadata or null, and expense ownership/exclusions. Names/descriptions are bilingual
dictionary entries keyed by category ID. All 15 categories are represented.

The config is descriptive, not a universal tariff or budget calculator. Different
categories retain different models and methods. Expense boundaries address vehicle
insurance, home/public EV charging, water/waste included in rates, mortgage interest,
bundles, subscriptions and net subsidised costs. v0.2 storage schemas are unchanged.

`src/config/roadmap.ts` is the milestone status source of truth. The homepage reads
it directly. `node scripts/roadmap.ts` generates bilingual ROADMAP.md from the same
configuration and translations; unit tests and `--check` detect drift. v0.1 and
the v0.2 data foundation are completed/tested work. Actual verified electricity
prices/comparisons and subsequent categories remain planned. Completion does not
claim a published GitHub release, approval to publish local work, or verified prices.
The status model supports in-progress without inventing an active phase.

## Community feedback

The existing public destination is
https://github.com/tomshenhao/OpenBill/issues, verified with a read-only HTTP 200
response on 13 November 2026, New Zealand time. The homepage uses this existing
page, with no template query or household parameters. No public issue was created.

`.github/ISSUE_TEMPLATE/feature_request.yml` supplies a bilingual idea form with
category, general need, practical value and a public-feedback acknowledgement.
It requests no contact details or bills. The template remains local until approved
changes are published to GitHub. GitHub controls its own accounts/attachments;
the template is guidance, not a technical prevention of accidental disclosure.
CONTRIBUTING.md explains participation in English and Simplified Chinese.

There is no feedback backend, automatic posting, tracker, embed or connection to
calculator state. Browser tests confirm that navigating to the feedback destination
does not attach inputs, a request body, query parameters or a referrer. The external
destination is fulfilled locally in tests, so they submit nothing to GitHub.

## Task-specific files

| Created | Purpose |
| --- | --- |
| `src/config/{categories,roadmap,community}.ts` | Category capabilities, milestone state and static public destination |
| `src/i18n/product-en.ts`, `product-zh.ts` | Complete bilingual product copy |
| `src/components/category-sections.tsx`, `roadmap-section.tsx`, `community-section.tsx` | Focused homepage sections |
| `scripts/roadmap-content.ts`, `roadmap.ts`, `ROADMAP.md` | Shared/generated bilingual roadmap |
| `.github/ISSUE_TEMPLATE/feature_request.yml`, `CONTRIBUTING.md` | General public ideas and bilingual participation guidance |
| `docs/product-vision.md` | Complete scope, category method, expense boundaries and phased delivery |
| `tests/product-config.test.ts`, `tests/e2e/product-home.spec.ts` | Truthful scope, document sync, navigation, disclosure, accessibility and feedback privacy |
| `docs/task-003-report.md` | This handoff report |

Modified: `src/components/home-page.tsx`, `icon.tsx`, `src/app/globals.css`,
`src/domain/categories.ts`, `src/i18n/en.ts`, `zh.ts`, `README.md`, `AGENTS.md`,
`docs/architecture.md`, `docs/data-policy.md`. The original home browser test's
Chinese heading expectation was updated to the requested new slogan; calculator
and privacy assertions were retained.

## Verification

| Check | Result |
| --- | --- |
| `npm run lint` / `npm run check` | ESLint and TypeScript passed |
| Unit tests through `npm run check` | **111 passed** across 5 files, including all v0.2 tests |
| `npm run build` | Passed; static English `/` and Chinese `/zh/` preserved |
| `npm run test:e2e` | **28 passed**, desktop/mobile Chromium, both languages |
| Expanded-category automated accessibility | No axe WCAG violations in tested states |
| Navigation and narrow layouts | Category anchors, roadmap links, Enter-key disclosure and 320px overflow checks passed |
| Public feedback privacy | No calculator data, body or referrer attached; no background GitHub requests observed |
| `node scripts/roadmap.ts --check` | Document matches typed configuration/translations |
| Issue template | Parsed as YAML with existing development tooling; 5 field types, 16 category options including another category |
| Data validation | Zero issues, zero records, zero eligible tariffs; comparisons remain disabled |
| Protected-file SHA-256 comparison | **26 files unchanged**, covering v0.2 data/tools/models/tests, the usage form and dependency/build configuration |
| Visual review | English desktop, Chinese mobile and expanded future-category list inspected |

Automated checks do not replace native-speaker usability and manual screen-reader
review. No new data sources or supplier verification are claimed by this task.

## Local review and next priorities

From the repository root:

```powershell
npm.cmd run dev
```

Open English at http://127.0.0.1:3000/ and Chinese at http://127.0.0.1:3000/zh/.
Check the core cards, electricity anchor/form, expandable future list, roadmap,
language switch and public-feedback notice. The idea template can be reviewed
locally; it has not been published to GitHub.

To reproduce checks:

```powershell
npm.cmd run check
node scripts/roadmap.ts --check
npm.cmd run build
npx.cmd playwright install chromium
npm.cmd run test:e2e
```

No dependency change is needed for an existing checkout. New checkouts should run
`npm ci` first and follow README.md for Node and local telemetry setup.

Next: review the bilingual experience with ordinary household users and screen-reader
users; obtain permitted complete official electricity rate cards and independently
validate coverage/calculations; use general community feedback to choose the next
core category. Mortgage and insurance need their own domain review, not an electricity
formula. Keep future tools unavailable until evidence, privacy and usability are ready.
