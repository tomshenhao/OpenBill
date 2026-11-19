# Task 007 — NZ mortgage calculator and bank rate research

The English and Simplified Chinese tools are at `/mortgage/` and
`/zh/mortgage/`. They estimate weekly, fortnightly and monthly repayments,
interest, total payments and the remaining balance. The optional balance table
shows annual balances, the end of the interest-only phase and the final balance.
The calculator and extra-repayment scenario use temporary browser state.

## Calculation convention

- The model uses a nominal annual percentage rate divided by 52, 26 or 12.
  Each period accrues interest on the opening balance with payment at the end.
  Principal-and-interest payments use (P r / (1 - (1+r)^{-n})), or (P/n)
  at zero interest. Input terms are 0.5–40 years in half-year steps so each term
  has a whole number of periods in all three frequencies.
- Payments and periodic interest round to cents. The final amortising payment
  clears the outstanding principal plus that period's interest. A very small
  loan can have a small or zero rounded regular payment and a final adjustment.
- A blank interest-only period models interest-only payments across the
  selected term with all principal outstanding. A specified period must be
  shorter than the loan term by at least half a year. The next payment is
  calculated from the unchanged principal over the remaining term. Lenders
  determine whether interest-only is available and for how long.
- A constant rate is an illustration. Real loans can accrue interest daily,
  have irregular payment dates, use different rounding and charge fees. A
  short fixed offer expires. The estimate excludes refixing, break fees, rate
  changes, cashback, and other loan costs.
- The unit tests independently discount each payment and sum the present
  values for all three frequencies. For example, NZD 400,000 at 4% over
  20 years gives NZD 2,423.92 monthly before the final adjustment. Sorted's
  [refinancing guide](https://sorted.org.nz/guides/home-buying/how-to-refinance-your-mortgage/)
  presents the same monthly example to the nearest dollar, NZD 2,424. This
  cross-check covers the monthly amount. It does not establish equivalence
  with another tool's accrual, weekly conventions or total rounding.

## Bank coverage and evidence status

Sources were researched on 20 November 2026 (New Zealand time). Numeric offers
appear in the app only after an independent review and a separate rights review.
The production catalogue starts empty. The table provides official links where
website terms permit them and keeps manual calculation available.

| Bank and official source | Research findings and limits |
| --- | --- |
| [ANZ](https://www.anz.co.nz/rates-fees-agreements/home-loans/) | Seven fixed terms are listed with special and standard columns plus floating. The fetched table showed placeholders. The [website terms](https://www.anz.co.nz/comms/website-terms-of-use/) limit saving content to personal use. |
| [ASB](https://www.asb.co.nz/home-loans-mortgages/interest-rates-fees.html) | Seven fixed terms and Housing Variable listed. The public text showed empty numeric slots. The page lists minimum equity and distinguishes restricted top-ups and legacy products. Capture and reuse scope still need confirmation. |
| [BNZ](https://www.bnz.co.nz/personal-banking/home-loans/compare-bnz-home-loan-rates) | Review the public Standard table separately from offset, revolving credit and eligible-purpose top-ups. The less-than-20%-equity premium and account-only refix discounts need distinct treatment. [Website terms](https://www.bnz.co.nz/about-us/governance/terms-and-conditions) reserve intellectual-property rights. Evidence and reuse scope are pending. |
| Westpac · `https://www.westpac.co.nz/home-loans-mortgages/interest-rates/` | Choices fixed special and standard rates, floating products and low-equity margins are described. The clean rate-page capture was unavailable in this environment. Website terms call for prior permission for direct links and public reuse. |
| Kiwibank · `https://www.kiwibank.co.nz/personal-banking/home-loans/rates-and-fees/` | The retrieved view showed rate identifiers in place of numbers. The special fixed terms refer to 20% equity with specified Kāinga Ora exceptions. Website terms call for prior link permission and written permission for public use. |
| TSB · `https://www.tsb.co.nz/rates-fees-agreements/home-loan` | The public table lists seven fixed terms and variable rates. Its special and standard columns distinguish the 20% deposit threshold and note availability for low-deposit lending. Website terms require written consent before reproduction or linking. |
| SBS Bank | Local-only source and screenshot captured. There are 23 pending candidates across seven fixed terms in both rate categories and residential and investment floating rates. Special equity thresholds differ by property use. The website terms ask for permission before linking and require prior written consent for public use of site content. |
| [The Co-operative Bank](https://www.co-operativebank.co.nz/rates) | The public page separates owner-occupied and investment standard rates from the owner-occupied first-home-buyer special and Fresh Start products. The special has new-lending, equity and first-home conditions. The copyright policy page could not be read in the retrieved view, so capture and reuse remain pending. |

The links withheld above are recorded in the local source registry. The app does
not request login, quotes, property addresses, account details or personalised
offers. Rates seen in research carry no independent verification date. Bank
eligibility, fees and advertised interest are separate from actual borrowing cost.

## Manual intake and review

1. Confirm the bank's current website terms, public page access and scope for
   saving a copy. If permitted, save the original public HTML/PDF and a PNG
   screenshot showing the rate and conditions under
   `.local-data/mortgage/incoming/`. Keep source URLs clean and record capture
   time, collector, page revision and the terms basis. Verify that the sources
   contain no personalised or non-public data.
2. Create an incoming JSON request. It needs `dataKind: "official"`,
   `publicNonPersonalSourceConfirmed: true`, `localCapturePermitted: true`,
   `termsUrl`, `termsNotes`, `sourceUrl`, `collectedBy`, `collectedAt`,
   `sourceRevision`, `sourceFile`, `screenshotFile`, and `rate`.
   The rate object follows
   [the mortgage schema](../src/domain/mortgage/rates.ts) without provenance.
   Use separate rows when eligibility or effective dates differ. Record unknown
   equity or dates as null. Record source-stated loan-to-value criteria in the
   conditions and establish property use before import.
3. Run `npm run mortgage:evidence -- archive request.json`. The command prints
   the evidence ID and hashes and writes an exclusive pending record under
   `.local-data/mortgage/records/`. Source and screenshot bytes are hashed
   independently. Use `npm run mortgage:evidence -- inspect <id>` to recheck
   the archived bytes and recover binding hashes. Repeat an import only for
   a new capture or revision.
4. An independent contributor checks the actual page, screenshot, rate,
   eligibility, dates, and translations. Their `review.json` includes
   `recordSha256`, `evidenceManifestSha256`, `reviewer`, `verifiedAt`, and
   `decision: "verified"`. The reviewer must set `publicNewLendingConfirmed: true`
   after checking that eligible new borrowers can access the advertised rate.
   Personal quotes, private discounts, retention offers and legacy products are
   excluded. A rights review binds the same hashes and records
   `reviewer`, `reviewedAt`, `decision: "permission-granted"`, and a
   publishable `permissionReference`. It checks publication of normalised
   rates, source links and any intended evidence use against written permission.
   Append via `npm run mortgage:evidence -- review <id> review.json` and
   `npm run mortgage:evidence -- rights <id> rights.json`. The collector
   cannot review their own record.
5. Run `npm run mortgage:evidence -- stage <ids...>`. This verifies original
   archive bytes, approvals, timestamps and freshness and emits a candidate
   catalogue in the ignored staged directory. Maintain the publishable
   catalogue through an approved repository change. `npm run mortgage:validate`
   checks current bundle shape, source allowlist and record hash bindings.
   The website excludes future, expired or 30-day-old captures or price
   reviews. A new capture and review are needed as advertised terms change.

Use only the selected, current reviewed offer's annual rate in the calculator.
The selected source and fixed period stay visible next to the input. Fees and
eligibility remain available in the comparison table, and OpenBill does not
collect personal information to determine qualification.

## Saving tips and next steps

The recommendations cover extra repayments, shorter terms, fixed and floating
rates, offset, revolving credit, split loans, switching costs, break fees,
cashback clawbacks, refixing and interest-only transitions. The extra-payment
scenario estimates interest reduction and payment count at the same rate before
fees. Sources include Sorted's guides to [managing a mortgage](https://sorted.org.nz/guides/home-buying/managing-a-mortgage/),
[mortgage types](https://sorted.org.nz/guides/home-buying/mortgage-types/), and
[refinancing](https://sorted.org.nz/guides/home-buying/how-to-refinance-your-mortgage/).

Next, independently review the SBS captures and seek written permission to
publish normalised rates and the restricted links. Confirm permitted evidence for
the other banks and any low-equity margins before adding rows. A later task can
model refixing and switching costs once fee and cashback rules are reviewed.

## Validation

`npm run check`, `npm run build` and `npm run test:e2e` passed with 323 unit
tests and 66 desktop and mobile browser tests. The mortgage browser checks
cover both languages, repayments, the interest-only transition, the bank
filters, keyboard focus, accessibility, small-screen layout and browser-only
inputs. All 23 local SBS records passed the source and screenshot hash check.
An attempt to stage an unreviewed candidate was blocked.

See the [Task 007.1 follow-up](task007.1-mortgage-rates.md) for currency
formatting, the eight-bank source recheck and the ongoing review checklist.
