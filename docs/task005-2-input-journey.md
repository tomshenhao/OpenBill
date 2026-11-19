# Task 005.2 — simpler electricity inputs

## Completed experience

The electricity tool now has two explicit, progressive steps in English and
Simplified Chinese. Existing Task 005/005.1 work was preserved.

**1. Assess electricity usage.** The main panel asks only for kWh, region and
the period covered by those readings. Users choose one period-entry method:

- Exact first/last dates, inclusive; OpenBill derives the day count and identifies
  an exact full calendar month automatically.
- A calendar month plus explicit confirmation that the kWh covers the whole month;
  OpenBill derives its day count, including leap years.

Only the active method is used. Switching methods cannot combine stale dates with
a newly selected month; changing a selected month clears its confirmation. Users
do not enter a redundant billing-day count in the main journey.

The rating updates immediately, without a bill total, GST information, tariff
details or a submit button. A polite screen-reader status names the next missing
or invalid input. When inputs are complete but the official distribution is
unavailable, it explicitly identifies a **data limitation**, not an extra field.
Partial/cross-month dates remain neutral. Optional approximate mean references
remain available in the expanded regional details and never receive a rating.

The existing P75/P95 rules are unchanged: green ≤ P75; yellow > P75 and ≤ P95;
red > P95. No household-size peers or personal percentile rank is inferred.
Household size remains under optional household context with a clear explanation
that it does not affect the current all-size rating. Optional heating/hot-water,
reading and lighting answers still tailor practical tips.

**2. Compare electricity prices.** A “Next” button reveals the separate step and
moves keyboard focus to its heading. The usage inputs remain available for editing.
The step may also be opened directly from the two-step navigation.

With the current empty eligible catalogue, the step explicitly says no more input
is needed and that extra bill details cannot unlock a rating. It asks for no
retailer, plan, meter, rate, bill total or usage breakdown just to show this state.
The existing neutral price rating and clearly external Billy link remain.

When verified eligible offers exist, the UI distinguishes missing basic comparison
inputs from unsupported pricing structures or no matching scope. It reuses valid
kWh, region and derived billing days from step 1. Only the supported flat,
single-register path can ask for its exact scope; technical network/meter/eligibility
selection is in a labelled advanced disclosure. All existing independent baseline,
coverage and applicability gates still apply.

## Advanced features preserved

A closed-by-default **“Advanced: optional bill calculations and tariff details”**
section retains the original bill calculator. It clearly says this is separate
from the usage rating and cannot replace verified supplier prices. It includes:

- Bill total and GST basis; a read-only derived day count when a valid period exists.
- Manual billing days for legacy bill arithmetic only when no usable period is supplied.
- Optional plan labels, meter configuration, flat-rate diagnostic, separate component
  GST, measured usage breakdown, TOU context and representative-year confirmation.
- Existing exact-money arithmetic, component reconciliation, validation/error focus,
  annualisation warnings and expandable bill results.

Invalid optional bill inputs do not suppress a valid live usage rating. Manual
days never establish a full-month usage match. No bill total is invented as zero
to produce a usage result or a current-plan price baseline.

Regional means, quartiles, charts, source/licence information and original caveats
remain under “More regional comparisons and official sources”. The original
homepage tool, saving tips and wider roadmap remain available.

## Accessibility, privacy and boundaries

Native labelled inputs, a radio group with a fieldset/legend, native disclosures,
visible focus, a polite live status, and explicit step controls support keyboard
and screen-reader navigation. Step 2 announces its expanded state and receives
heading focus when opened. Clear resets the input state, period mode and price
step. A visible no-JavaScript notice explains that private calculations require JS.
Desktop pairs the usage inputs and result; mobile stacks them without overflow.
Native date controls follow the user's browser/OS date display convention.

Household inputs remain in temporary browser component state. No storage, URL
prefill, logs, analytics, uploads, requests, accounts or services were added.
The production CSP remains unchanged. The JavaScript-disabled browser test reveals
the dormant advanced form only inside the test harness, then retains the original
CSP-denied submission/no-network assertions.

**No independent data verification or tariff publication safeguards were modified.**
This task did not edit tariff records, benchmark data/CSV bytes, the P75/P95 rating
rules, the pricing calculation engine, source/evidence tools, independent price or
rights/coverage review logic, or publication validation. Supplier records and
eligible production offers remain zero. No retailer request was sent.

## Files changed for this task

- `src/components/electricity-analysis.tsx`: progressive inputs, live usage results,
  independent advanced bill submission and separated pricing step.
- `src/components/usage-rating.tsx`: accepts a specific missing-input/data explanation.
- `src/components/supplier-comparison.tsx`: differentiates data absence, missing
  inputs and unsupported structures; moves technical matching into a disclosure.
- New `src/domain/electricity/input-journey.ts`: active period normalisation and
  missing-input explanations, reusing existing validators.
- Both electricity dictionaries and small journey navigation CSS additions.
- New `tests/input-journey.test.ts`, `tests/e2e/progressive-inputs.spec.ts` and
  shared browser journey helpers; existing browser tests adapted to disclosures
  and live results while retaining calculation/privacy/security assertions.
- README, architecture notes and this completion report.

## Verification results

| Check | Result |
| --- | --- |
| `npm run check` | Passed: lint, strict TypeScript, **280 unit tests in 16 files**, tariff/benchmark/comparison data validation |
| `npm run build` | Passed: original English/Chinese home and electricity routes |
| `npm run test:e2e` | **54 passed**, desktop and mobile Chromium |
| `node scripts/roadmap.ts` / `--check` | Regenerated; no semantic roadmap change |
| `git diff --check` | Passed |

Tests cover both entry modes, stale inactive fields, confirmation resets, leap
years, missing data, exact rating boundaries, independent bill errors, keyboard
radio/Enter/focus behaviour, both languages, mobile layouts, accessibility,
existing arithmetic and source displays, storage/network/privacy and strict CSP.
The Auckland June 2026 / 223 kWh regression becomes green immediately with no bill
total. The optional 30-day / NZ$132 bill calculation remains correct.

The first browser run exposed old layout assumptions and a Chinese label collision.
The choice label was made distinct and tests updated to open the intended step/
disclosure. All affected checks and the full browser suite were rerun successfully.
No assertions about calculation accuracy, privacy or CSP were relaxed.

English desktop and Chinese mobile layouts were visually inspected with synthetic
QA values. Preview artifacts remain ignored under `.local-data/preview/`; the
owned preview server was stopped. Native screen-reader testing and wider-browser
coverage remain useful beyond the automated Chromium/axe checks.

## Local review and remaining dependencies

```sh
npm run dev
# http://127.0.0.1:3000/electricity/
# http://127.0.0.1:3000/zh/electricity/
```

Use synthetic 223 kWh, Auckland, 1–30 June 2026, or confirmed June 2026. The usage
rating appears immediately. Clear or change the period to see precise missing-input
messages. Continue to price comparison to see the supplier-data limitation without
any additional required fields. Expand advanced calculations only if desired.

Real supplier comparisons still require official files, evidence, independent
verification, redistribution rights and coverage review. Household-size-specific
official benchmarks remain unavailable in the current dataset. Those dependencies
were not replaced with guesses. No commits, pushes or deployments were made.
