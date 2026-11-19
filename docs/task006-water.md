# Task 006 — Auckland Watercare water analysis

The English and Simplified Chinese tools are available at `/water/` and
`/zh/water/`. Enter household size, billed volume in litres or kilolitres and
billing days to see daily household and per-person usage. The optional context
disclosure covers meter reading type, outdoor watering, pool use and extra
guests or laundry. The tool links to Watercare's leak and conservation guidance.
All household inputs and results live in temporary browser component state.

## Research findings

Sources were retrieved and checked on 20 November 2026 New Zealand time.

| Question | Finding and source |
| --- | --- |
| Typical residential use | Watercare's [residential FAQ](https://www.watercare.co.nz/residents/help-and-support/faqs) gives a general range of 140–170 litres per person per day from an Auckland study. The FAQ provides no study date, sample definition or quantile cut-offs. The calculator divides litres by days and occupants and scales both ends of the reference by household size for the household view. Both endpoints count as within the range. |
| Efficiency targets and chart | Watercare's [efficiency plan page](https://www.watercare.co.nz/home/about-us/sustainability-and-community/water-efficiency-plan) states a network residential goal below 165 litres per person per day and describes using per-connection trends. A usage-target chart reproduced in the [26 February 2025 public board pack](https://assets.watercare.co.nz/media/watercare_combined_pack_for_the_public_session_of_26_february_2025_pdf_0e1bf4cf51.pdf), pp. 93–94, shows one-to-six-person bands. Upper bounds are multiples of 155 L/day. Its footnote ties the bands to 2021–2025 efficiency goals. The chart's marker places a daily volume in those bands. Current chart cutoffs and any changes since the example are unconfirmed. |
| Observed distributions | The [March 2026 Auckland Water Management Plan](https://assets.watercare.co.nz/media/AUTH_131259_01_02_C17_WMP_March_2026_5ddff898ca.pdf) reports aggregate Auckland measures and end-use research. [BRANZ SR469](https://www.branz.co.nz/design-build/publications/sr469-residential-water-use-in-new-zealand) reports observed distributions and seasonal summaries from 66 monitored households nationwide. The reviewed sources do not establish current representative Auckland percentiles by occupancy. OpenBill uses a neutral comparison with the FAQ range. |
| Meter readings | [Residential charging rules](https://www.watercare.co.nz/residents/accounts/how-residential-charges-work) explain the use of recent actual reads to estimate intervening mechanical-meter periods and later reconcile them. Smart meters generally support monthly actuals. [Higher bill than usual](https://www.watercare.co.nz/residents/accounts/higher-bill-than-usual) identifies A and E and explains why an actual read after estimates can produce a catch-up bill. |
| Savings and leaks | [Leak checks](https://www.watercare.co.nz/home/faults-and-outages/how-to-check-for-leaks), [saving water at home](https://www.watercare.co.nz/residents/learn/why-is-water-so-important/saving-water-at-home) and [garden guidance](https://www.watercare.co.nz/residents/learn/why-is-water-so-important/saving-water-in-the-garden) support the advice on meter checks, toilets, showers and taps, washing machines, dishwashers and outdoor watering. Shared and secondary meters have special billing rules described in the [water FAQ](https://www.watercare.co.nz/residents/help-and-support/water-faqs). |

## Residential tariff sources and local evidence

The [Watercare residential charging page](https://www.watercare.co.nz/residents/accounts/how-residential-charges-work)
links seven official annual schedules. The [revised 2026–2027 schedule](https://assets.watercare.co.nz/media/Residential_Water_Ww_IGC_Charges_Other_Charges_2026_2027_rev_0aa42cb042.pdf)
was reviewed on page 1 for the 1 July 2026 effective date, GST-inclusive water
and wastewater volume rates, annual fixed wastewater charge, and 78.5% standard
and 95% apartment factors. The earlier official PDFs and their date windows are
indexed in [watercare.json](../data/water/watercare.json). The walkthrough uses
the revised PDF linked by Watercare instead of the earlier filename surfaced
by search.

The ignored local archive under `.local-data/water/` holds original public-source
HTML and PDF bytes, annual rate-page PNGs and manifests with URLs, timestamps
and SHA-256 hashes. Archive directories have unique IDs and schedule renders
and records are created exclusively. Page captures contain official schedule
material. Watercare's [terms](https://www.watercare.co.nz/home/about-us/our-organisation/terms-of-use)
were reviewed for local informational use. The archive is local-only and retains
the source copyright. Screenshots and source copies require the existing rights
checks before any redistribution.

The official reference and billing rules were source-checked. The seven price
transcriptions remain local candidates, pending independent review of the
records and matching evidence. The consumer data boundary validates dated
official links, provider scope and reference metadata. It carries no price values.

## Bill-check scope and assumptions

- Once usage is assessed, enter the last day of the billing period. OpenBill
  derives the first day from the billed day count, selects the official
  July-to-June schedule, and links to the PDF for the user to enter its three
  GST-inclusive metered rates. Periods crossing 1 July or outside July 2020 to
  June 2027 receive guidance without an estimate. A total volume alone cannot
  establish consumption on each side of a price change.
- The calculator uses incoming volume for water and applies the confirmed 78.5%
  or 95% factor to determine chargeable wastewater volume. One directly billed
  meter with both services and a prorated fixed charge is supported. Other
  apartment factors, shared and subsidiary meters, irrigation meters,
  water-only service, tanks, unmetered arrangements and annual lump-sum
  wastewater billing are outside this calculation.
- The estimate prorates the fixed charge by the days in the schedule year
  (365 or 366). The residential sources establish day-based proration. The
  schedule-year divisor and line-by-line cent rounding are explicit OpenBill
  estimation assumptions. The GST share is 15/115 of the inclusive subtotal,
  rounded to cents. Differences can reflect billing conventions or adjustments.
- An entered comparison amount should include only the three recurring charges
  for that period. Previous balances, arrears, credits, catch-up adjustments
  and exceptional fees are outside the calculation. Estimated readings get
  a provisional notice. Actual readings can still include a reconciliation.
- Conservation tips carry no dollar projections. The form measures total billed
  volume and does not establish how much any action would reduce future usage.

## Maintainer decisions and data gaps

- Have a second contributor check each pending rate record against the official
  schedule and screenshot, bind the review to the exact record and evidence
  hashes and confirm applicable date, GST, scope and use rights before enabling
  automatic rates.
- With maintainer approval, ask Watercare for the current usage-chart
  methodology and thresholds, the FAQ study reference, and non-identifying
  Auckland percentiles by occupancy. Useful metadata would include sample
  sizes and suppression thresholds, seasonal splits, dwelling and meter types,
  occupancy and weighting methodology, and treatment of leaks and estimates.
- With maintainer approval, request official examples for leap-year proration,
  wastewater-volume rounding, rate-change periods, and catch-up adjustments.
  Request permission and confirm licence and attribution for any future
  redistribution before staging evidence. No outreach was sent.

## Validation

`npm run check`, `npm run build`, and `npm run test:e2e` passed, including
299 unit tests and 58 desktop and mobile browser tests. The water browser
tests cover both languages, keyboard focus on validation errors, WCAG axe
checks, mobile overflow, reading notes, billing-date selection, and the
absence of requests or persistent storage during calculation.
