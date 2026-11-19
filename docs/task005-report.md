# Task 005 — real tariff acquisition readiness

Prepared 19 November 2026 (NZ). **Engineering readiness is implemented; real
supplier comparison remains blocked. Zero official production tariffs imported,
zero independently verified eligible offers, zero requests sent.** No commits,
pushes, deployment, accounts or paid services were created.

## Repository and architecture

Fetched `origin/main` at `d00415b` and created `feature/task005-real-tariffs`.
Preserved the pre-existing untracked file. Next.js, bilingual routes, local-only
bill calculation, archived benchmarks, recommendations and the wider roadmap remain.

Official files -> ignored immutable receipt archive -> pending structured candidate
-> manual scope/component mapping -> hashed source/screenshot evidence -> immutable
tariff record -> independent price review -> independent rights review -> local
publication staging -> approved consumer bundle. Browser comparisons use the
consumer boundary and pure domain functions; household inputs never enter Node tools.

## Current official requirements and contact research

Rechecked the Authority's [consumer-data guidance](https://www.ea.govt.nz/industry/consumer-data/),
[EIEP index](https://www.ea.govt.nz/industry/retail/eieps/),
[v1.1 specification](https://www.ea.govt.nz/documents/9797/EIEP14A.pdf) and
[30 October amendment notice](https://www.ea.govt.nz/news/general-news/minor-amendments-to-eiep14a/).
The amendment extends field lengths. JSON is the primary structure; the appendix
has inconsistencies, so ambiguous aliases are not silently repaired.

The [procedures](https://www.ea.govt.nz/documents/9748/Requests_for_retailer_product_information_-_Procedures.pdf)
and [amendment replacing Code 11.32G](https://www.ea.govt.nz/documents/9378/EIPC_Improving_Access_to_Product_Information_Amendment_2026.pdf)
allow any person to request current generally available and active legacy product
information, ordinarily within five business days, without a standard-format fee.
Phone/email/post are request routes; electronic facilities may also be supplied.
Alternative arrangements require agreement. Direct requests do not first require
EIE integration; transfer-system access has separate approval/agreement/identifier
requirements. No such registration is made here. No open redistribution licence
was established. EIEP13 consumption and EIEP14B individual plan information are
personal-data routes and are outside this workflow.

All six verified **general** routes and official supporting links are in
[the request index](retailer-requests/README.md): Genesis 0800 300 400; Mercury
customerservice@mercury.co.nz / 0800 10 18 10; Contact 0800 224 424;
Meridian hello@meridian.co.nz / 0800 496 496; Electric Kiwi's official contact
facility; 2degrees power@support.2degrees.nz / 0800 022 022. Dedicated EIEP14A
receiving inboxes are not confirmed. Genesis and Contact require routing confirmation;
Electric Kiwi has a protected form, never automated. No customer login is needed
or authorised for these general product requests.

Existing Genesis/Mercury/Contact drafts were improved; Meridian/Electric Kiwi/
2degrees drafts were added. Each is ready for sender details and approved routing,
requests nationwide coverage with all applicable Auckland networks identified,
complete components/units/GST/conditions/dates, and separately asks about normalised
data, public Git redistribution, attribution, history, raw files, screenshots and updates.

## Importer compatibility and data operations

Added optional JSON header support without fabricated timestamps/version/status;
missing metadata must be confirmed before mapping. Supported enum values and
schedule selectors are case insensitive. UTF-8 BOM and explicit hour-only ISO
offsets are accepted. Malformed UTF-8 is refused. Rates with excess nonzero
precision are rejected, including original JSON tokens that floating-point parsing
would otherwise round into an apparently valid rate. Raw evidence bytes/hashes remain unchanged.

`data:eiep14a -- <request> --check` provides a non-writing inventory with actual
source hash, per-plan fixed/variable component counts and outstanding work. Missing
components require clarification, never an assumed zero price. Normal import still
archives a pending, local-only candidate by source hash using exclusive creation.
All six registered retailers can use manual evidence archiving, subject to reviewed
terms and source allowlists. Mercury's written image-permission rule remains.

The importer is a **bounded normative v1.1 JSON subset**, not full EIEP certification:
CSV, R/X application, ambiguous appendix aliases, unsupported pricing structures
and automatic GST/eligibility/network inference are excluded. File parsing does
not prove complete components, authenticity, independent verification or rights.

The [receipt runbook](task005-tariff-workflow.md) gives exact commands and file
shapes for receipt, dry run, archive, mapping, errors, record/review import, rights,
staging and historical updates. It reuses existing JSON schemas and tools; no new
dependencies, database, backend or service were introduced.

## Consumer-facing functionality

Prepared a bilingual supplier panel for eligible single-register unconditional
flat plans. It requires an explicit matching region/network/meter/category/register
selection. Each offer displays retailer/plan, GST-inclusive equivalent-period cost,
important conditions, official source and independent review date. Differences
appear only against a user-selected eligible independently verified current plan.
Costs use exact integer arithmetic and one final cent rounding.

Current prices are applied to the same bill days and measured kWh, not represented
as historical prices. Partial coverage is explicit; offers are listed by retailer/
plan, not labelled a whole-market ranking. No short bill becomes an annual savings
forecast. The existing measured-year annual/TOU engine is preserved and shares the
same applicability gates; this simple form does not supply that profile.

With the actual empty dataset, the honest unavailable explanation and external
Billy link remain. No synthetic offer is placed in production. The populated
consumer path is prepared and unit-tested with labelled synthetic domain fixtures;
real-data acceptance and independent applicability review are still required.

## Verification results

| Command | Result |
| --- | --- |
| `npm run check` | Passed: lint, strict TypeScript, 230 unit tests in 14 files, tariff/benchmark/publication validation |
| `npm run build` | Passed: static English/Chinese home and electricity routes |
| `npm run test:e2e` | 46 desktop/mobile Chromium tests passed on the final build |
| `npm run data:eiep14a -- tests/fixtures/eiep14a-request.json --check` | Passed, synthetic-only inventory, no files written |
| `node scripts/roadmap.ts` | Regenerated; no semantic roadmap change |
| `git diff --check` | Passed |

Data validation: zero records, zero eligible prices, no catalogue issues; the 320
archived regional mean observations and 320 matching distribution observations
remain valid. Empty validation success is not supplier coverage. Tests cover
precision, header compatibility, missing components, GST, scope, TOU exclusion,
contracts, stale/expired/rejected data, supersession, price/rights bindings,
partial/empty coverage, both languages, responsive layouts and privacy. Existing
actual half-hour TOU/DST and evidence/publication tests remain passing.

The first sandboxed unit run hit `spawn EPERM`; rerunning with process permissions
passed without weakening checks. Chromium tests include the requested Auckland
June 2026 / 30 days / 223 kWh / NZ$132 regression, no input requests/storage/URL
changes, accessibility checks and strict production CSP. No LAN/HMR configuration
was changed. Chromium is the tested browser; wider-browser and human language/
screen-reader review remain useful.

## Files and local review

- Domain/UI: `src/domain/electricity/comparison.ts`, new
  `src/components/supplier-comparison.tsx`, `electricity-analysis.tsx`, both
  `src/i18n/electricity-*.ts` dictionaries.
- Tools/tests: EIEP14A adapter/importer, manual evidence adapter selection;
  `tests/eiep14a.test.ts`, new `tests/period-comparison.test.ts`,
  `tests/e2e/task005.spec.ts`.
- Documentation: README, electricity data/research guides, three improved and
  three new retailer drafts, request index, receipt runbook and this report.
- No pricing records, original benchmark CSV bytes, source hashes or live offers changed.

```sh
npm ci
npm run check
npm run build
npm run test:e2e
npm run dev
```

Use `http://127.0.0.1:3000/electricity/` and `/zh/electricity/`. Enter synthetic
30-day / 223 kWh / NZ$132 values, select Auckland and June 2026 as a complete
calendar month, or use inclusive 1–30 June dates. Regional mean 678 kWh and
middle-50% range 363–884 kWh appear; supplier availability remains honest. Expand
comparison limits to see profile requirements. Do not enter real household data
into screenshots, test artifacts or supplier tools. Chromium may need a one-time
`npx playwright install chromium` on a new machine.

## External actions still required

Obtain approval to send the first-priority drafts and confirm product-data routing;
receive actual complete files and explicit rights terms; obtain permitted evidence;
source-review Auckland network/meter mappings; independently review prices and
rights; stage and inspect an eligible bundle; then obtain explicit approval for any
tracked publication, commit, push or deployment. Review the first real flat plan
against independently calculated bills before broader rollout. CSV/replacement,
conditional/bundled offers and richer measured profiles are later tested extensions.
