# Task 010 · Electricity bill review and savings

See [Task 010.2](task010-2-electricity-pdf.md) for the later real-invoice checks
and layout fixes.

`/electricity/` and `/zh/electricity/` offer **Understand your bill** and
**Ways to save**. Manual entry and PDF corrections use the same arithmetic.
The existing regional references, usage ratings, legacy diagnostics and official
supplier comparison framework remain available where applicable.

## PDF scope

The reader supports English, selectable-text PDFs up to 8 MiB, 12 pages, 20,000
text items, 250,000 characters and a ten-second processing limit. Known Genesis
and Mercury labels, electricity section boundaries and explicit rate units drive
extraction. Review flagged fields and charges against the bill. The manual path
handles unfamiliar layouts, scanned pages, password-protected and malformed PDFs.
There is no OCR or password collection.

The reader can recognise billing dates and days, actual or estimated readings,
final-reading notes, billed kWh, fixed days and rates, separate usage rates,
printed fixed and usage charges, subtotal, GST and the current electricity
total. It can recognise labelled electricity fees, credits and GST adjustments.
Gas, previous balances, payments, unallocated transactions and amount due can
appear separately and cannot enter the electricity calculation. Ambiguous
values and unidentified money rows are flagged. No meter/account identifier,
address or original document text is shown or retained.

## Arithmetic and test scenarios

The model multiplies daily rates by charge days and each usage rate by its billed
kWh. It rounds each displayed line to the nearest cent, calculates 15% GST on
the subtotal of GST-exclusive lines, and treats GST as already included in
GST-inclusive lines. Explicit GST adjustments apply separately. This explicit
convention may differ from some retailer bills. The check allows a one-cent
difference and needs a supplied current electricity total. It verifies
arithmetic. Contractual rates and eligibility need separate evidence.

| Synthetic example | Detailed kWh | Days | Fixed | Usage | GST | Electricity total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Genesis, electricity plus gas | 211 | 31 | NZ$42.63 | NZ$57.69 | NZ$15.05 | NZ$115.37 |
| Mercury, low usage | 7.63 | 21 | NZ$57.96 | NZ$1.88 | NZ$8.98 | NZ$68.82 |

The Genesis account amount due of NZ$219.14, gas charges of NZ$111.22 and
unallocated credit of NZ$7.45 stay separate. The Mercury scenario uses billed
7.63 kWh in place of the rounded 8 kWh summary, excludes prior payments and
shows a final-reading note. Mercury fixed costs are NZ$66.65 including GST, or
96.8% of the NZ$68.82 current electricity total.

## Savings and comparisons

Savings scenarios reduce each billed usage band by 5%, 10% or 20%. Days, rates,
usage mix and adjustment amounts stay constant. The baseline is the
reconstructed current-period total. The Genesis fixture yields
reductions of NZ$3.33, NZ$6.64 and NZ$13.27 under those assumptions. Separate
7- and 30-day estimates show the fixed connection cost with zero usage and
without other fees or credits. Vacant and intermittently occupied properties
receive context-specific advice and no regional household comparison. The
existing all-household EMI comparisons retain their exact full-month rules.

Manual alternative rates apply to the same bill days and quantities. Fees and
credits are optional inputs and eligibility needs a separate check. The official
offer catalogue is empty. Automatic rates still require independent review,
applicability and publication rights. See the [retailer request records](retailer-requests/README.md).

## Privacy and scope limits

The production CSP continues to block network connections and form submission
from the app. The PDF worker is shipped as a same-origin static asset from the
pinned PDF.js dependency. OpenBill sends it file bytes through a browser message
and receives text in memory. No PDF bytes, paths or extracted values are used in
requests. Browser tests use synthetic PDFs and inspect request methods and
payloads, console output, storage, reset, reload, and accessibility in both
languages on desktop and mobile.

Both acceptance scenarios were exercised with synthetic PDFs. A private local
candidate returned the unsupported-layout message during a browser-only check.
Record further layout examples as synthetic fixtures with no customer metadata.
Those fixtures would help broaden coverage and test retailer-specific rounding
conventions. Scans, multiple distinct daily rates and net-credit electricity
totals require further work.

## Verification

The production static build and `npm run check` passed, including lint,
TypeScript, 358 unit tests and all data checks. The full Playwright suite
passed 108 desktop and mobile Chromium tests. The development suite passed
four LAN, hot reload and form-policy tests. The focused PDF checks cover both
languages, supported and rejected files, live corrections, manual parity,
network requests from page load, browser storage, reset and reload.
