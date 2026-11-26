# Task 010.2 · Real electricity PDF parsing

## Reproduced failures

Both private selectable-text invoices reached PDF.js text extraction and failed
at the original layout stage.

- **Genesis.** The retailer and electricity heading matched.
  The usage and fixed-rate details were separate positioned text items. The
  electricity usage row named the charge and printed a quantity priced per
  unit. The old usage rule expected a kWh token alongside that quantity. The
  assembler also split currency fragments from labels across wider gaps. No
  detailed charge row or usable electricity total passed the original rules.
- **Mercury.** PDF.js exposed the retailer name within a
  longer text item and the electricity heading as its own text item. The old
  retailer rule required a standalone line, and visual reconstruction folded
  the heading into adjacent text. After those defects were corrected, a
  credit-card payment-fee line still entered the electricity adjustments.
  Excluding that account item made the printed charges and GST reconcile.

## Changes and results

Visual reconstruction preserves a separate electricity heading and joins
currency fragments on the same baseline. Genesis-specific charge patterns
interpret named usage and daily-rate rows inside the electricity section.
Account balances, gas and card fees stay outside that section's calculations.
An unfamiliar layout can retain explicitly identified electricity fields.

When GST treatment is missing, the parser accepts an exclusive basis only if
the printed fixed and usage amounts, subtotal, GST and electricity total agree
with the reconstruction. A conflict with available printed amounts prevents
verification success in PDF review mode. No rate or amount is changed to
produce a match.

Both private invoices reconciled in the local production build without manual
re-entry. The Genesis reconstruction excluded the combined amount due, gas and
unallocated credit. The Mercury reconstruction used the detailed billed usage
and excluded the rounded chart figure and historical payments. When billing
dates were unavailable, the result explained that arithmetic uses the billed
day count. Published fixtures use invented figures in the same layouts.

## Privacy and regressions

The local PDF diagnostics disclosure exposes fixed stage names, rule IDs and
unresolved-field codes only. It does not record the file name, source text,
text positions, charge values or identifiers. The private checks used the
locally served production build and reported only rule IDs and pass/fail flags.
The synthetic PDFs use independently positioned, deliberately out-of-order text
cells and exercise the browser's PDF.js pipeline in English and Simplified
Chinese. They cover asset-only network requests, empty storage, reset, reload,
and manual fallback.

The production build, 360 unit tests, 108 production browser tests, four
development browser tests, lint, TypeScript and all project data checks passed.
The two real-invoice checks also confirmed empty browser storage and cleared
inputs and diagnostics after reset and reload.
