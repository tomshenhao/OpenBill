# Task 005.1 — independent usage and price ratings

## Implemented behaviour

The electricity results now start with two separate cards, side by side on desktop
and stacked on mobile. Both include text labels as well as a colour indicator.
Usage and price cannot determine one another's status. Bill arithmetic remains
available in a closed-by-default “Bill breakdown and calculations” section.
Existing monthly mean/middle-50% comparisons, approximate dated references,
homepage, tips, bilingual routes and wider roadmap remain available.

### Usage: working with official data

The original [Electricity Authority residential consumption report](https://www.emi.ea.govt.nz/Retail/Reports/0YUCE0)
and already archived CSV include **75th and 95th percentile columns**. Task 005.1
extracts those exact columns into the new `regional-monthly-ratings.json`; no
percentiles are inferred from means or quartiles. The original CSV bytes/hash and
both previous JSON datasets are unchanged. The new derivation uses the same source
URL, collection timestamp, licence, population and 320 region/month cells.

For an exactly matched full calendar month and region:

| Label | Rule |
| --- | --- |
| Green | kWh ≤ published P75 |
| Yellow | published P75 < kWh ≤ published P95 |
| Red | kWh > published P95 |
| Unable to assess | No valid matched source/period or missing thresholds |

These bands are OpenBill's presentation policy. They do not rank the individual
household at an exact percentile, diagnose efficiency or identify waste. The source
is a cleaned residential **connection** sample, including holiday homes, across
all household sizes; not a census of occupied homes. Coverage varies and sample
counts are not published per cell. Household-size peers remain unsupported.
Seasonality is matched by actual month; data is not temperature-adjusted.
The source retains its honest **source checked; independent review pending**
label. A second human benchmark/methodology review remains useful; none was
invented by extracting another existing column.

The card shows the entered kWh, region/month, comparison population, P75/P95 values,
three labelled bars and official source. Yellow/red prioritise checking readings,
heating, hot water and major appliances according to optional context. Green offers
optional low-cost checks. All bands protect essential heat, health equipment,
ventilation, refrigeration and necessary household use. A high band is not a
claim that reducing use is appropriate for that household.

Cross-month approximate mean references still require opt-in and **never** receive
a traffic-light rating. Merely enabling that option does not disqualify an exact
full-month match. Missing/future months and invalid periods remain neutral.

Regression: Auckland, June 2026, 30 days, 223 kWh, NZ$132 -> usage **Green**;
published P75 **884 kWh**, P95 **1,529 kWh**. Price remains unknown. The previous
mean **678 kWh** and middle-50% **363–884 kWh** still appear separately.

### Price: implemented gates, blocked by real data

The existing verified tariff engine costs the same measured kWh/registers and
billing days using all supported daily and usage components, GST-inclusive prices
and a single final cent rounding. The current plan must itself be an applicable,
independently verified offer selected by the user. A free-text plan label, entered
bill total or short bill's blended rate cannot become that baseline.

Premium = (current comparable cost − lowest eligible comparable cost) ÷ lowest
eligible comparable cost × 100. Colour decisions use exact integer-cent ratios,
before display rounding. A zero denominator or missing baseline remains neutral.

| Label | OpenBill product-design threshold, not a regulatory standard |
| --- | --- |
| Green | 0–5% premium |
| Yellow | >5–15% premium |
| Red | >15% premium |

All underlying evidence, latest independent price review, rights, freshness,
effective-date, network, meter/register, eligibility, history and supersession gates
remain. Unresolved discounts/fees/contracts, TOU without measured intervals and
multi-register totals are excluded rather than silently assumed away. Only
unconditional flat single-register offers are supported by this simple form;
no fee-adjusted net saving is claimed for unsupported contracts. A short bill
never generates an annual supplier saving. The separate measured-year/TOU engine
remains tested but no invented yearly profile is passed to it.

**Coverage is an additional gate**, not just counting offers. An independent human
must review the exact limited catalogue, record a rationale/exclusions and bind
every comparable record ID/hash for the selected public scope. At least two
distinct eligible retailers (including the current baseline) are required. This is
a conservative OpenBill minimum, not a guarantee of market-wide adequacy. A second
record from the same retailer does not satisfy it. The review must postdate the
price/rights reviews, be independent of collectors and less than 30 days old.
Missing, stale, changed or incomplete coverage keeps the rating neutral.

Even a rated result explicitly says **within the reviewed catalogue**, not cheapest
in New Zealand. The offer list retains equivalent-period costs/differences,
conditions, source links and review dates. The price card can additionally show
the comparable premium and potential equivalent-period saving when all gates pass.

The production bundle and coverage index are both empty. **No real price rating,
supplier savings or recommendation is enabled.** The existing unavailable text
and clearly external Billy link remain visible.

## Local data and maintainer workflow

```sh
npm run benchmark:validate
npm run comparison:validate
npm run check
npm run build
npm run test:e2e
npm run dev
```

The benchmark validator now also reproduces the P75/P95 extraction from the pinned
CSV and rejects drift. The new file was created with exclusive creation:

```sh
node tools/electricity/benchmark-import.ts --ratings
```

Do not rerun without `--check` to overwrite it; the importer refuses replacement.
Refreshing the underlying snapshot requires a separately reviewed/versioned update
of the matching datasets, preserving old evidence and metadata.

After actual tariffs pass the [Task 005 receipt/evidence/rights workflow](task005-tariff-workflow.md),
a second contributor may prepare a **local** coverage receipt using
`docs/examples/price-coverage-review.template.json`. Its placeholders and `false`
attestation deliberately fail validation. Replace them only after doing the review;
do not treat a passing schema or this command as independent review.

```sh
npm run data:coverage-review -- .local-data/human-coverage-review.json .local-data/comparison-bundle.json
```

The command validates the bundle against the actual repository/evidence/rights,
checks scope and freshness, and exclusively archives one human-authored review in
`.local-data/coverage-reviews/<reviewId>.json`. It does not alter consumer JSON or
publish anything. A changed record needs a new review ID and receipt; retain old
files locally. With explicit publication approval, include only active reviews in
`data/electricity/price-rating-coverage.json`. `comparison:validate` checks them
against actual eligible published records **and** their archived receipts; missing
or altered originals fail closed. Back up the ignored receipt archive locally.
Review timestamps/handles remain human attestations, not a cryptographic identity service.

Open `/electricity/` or `/zh/electricity/`. Use synthetic QA inputs for local
review. No user inputs enter files, URLs, storage, requests, analytics or supplier
workflows. Screenshots used for visual QA contain synthetic entries only and stay
under ignored `.local-data/preview/`.

## Validation and remaining dependencies

New tests cover
P75/P95 inclusivity, exact price-premium boundaries, all-size fallback, missing and
approximate periods, source mismatch, tariff/coverage gates, missing fixed charges,
TOU, fees/discounts, both languages, desktop/mobile, accessibility and privacy.

Still required: actual retailer responses and publication rights; independently
reviewed eligible tariffs and coverage receipts; real-data acceptance testing;
household-size-specific official distributions if they become lawfully available;
and wider-browser/human screen-reader review. No requests, commits, pushes or
deployments were made for this task.

## Final checks and changed files

- `npm run check`: passed lint, strict TypeScript, **268 unit tests in 15 files**,
  tariff validation, all three benchmark derivations and comparison/coverage validation.
- `npm run build`: passed, preserving the four English/Chinese home/electricity routes.
- `npm run test:e2e`: **50 passed**, including existing calculations and the new
  rating boundaries, neutral pricing state, desktop/mobile geometry, accessibility
  and privacy checks. The four dual-rating cases were additionally rerun after
  clarifying the final population label.
- `node scripts/roadmap.ts` and `--check`: regenerated with no semantic roadmap change.
- `git diff --check`: passed. Original CSV and both prior benchmark JSON files unchanged.
- Local visual QA: English desktop and Chinese mobile inspected using explicitly
  synthetic values; ignored previews only, and the owned preview server stopped.

The first new browser run found an assertion expecting unformatted `1529` while
the interface correctly displayed `1,529`. The expected value was changed to the
same explicit locale number format and all cases rerun. Existing calculation tests
now open the bill disclosure before checking its values; arithmetic assertions and
privacy/accessibility checks were retained.

New files: `src/domain/electricity/ratings.ts`, `src/components/usage-rating.tsx`,
the P75/P95 derivation and empty price coverage JSON, `tools/electricity/coverage.ts`
and `coverage-review.ts`, coverage template, `tests/ratings.test.ts`,
`tests/e2e/dual-ratings.spec.ts`, and this guide/report.

Updated: analysis/supplier UI, CSS, both electricity dictionaries, consumer data
boundary, shared comparison scope matcher, contextual tips, benchmark importer,
publication validator, package scripts, README/architecture/data policy and the
existing calculation/benchmark browser tests. Earlier Task 005 work and the
pre-existing untracked file were preserved. No dependencies, accounts, services,
analytics, household persistence or external submissions were added.
