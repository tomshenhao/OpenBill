# Task 007.1 — Mortgage amount formatting and bank-rate review

## Why the table was empty

The production catalogue in [published.json](../data/mortgage/published.json)
contains zero offers. The 23 SBS candidates in the ignored evidence archive
have usable source and screenshot hashes. All 23 lack an independent price
review and a publication-rights review. The importer kept them local as
designed. The empty table is a publication gate, with separate source access
limitations across other lenders.

The calculator accepts ungrouped and correctly grouped NZD amounts in both
languages, including amounts pasted with an explicit NZ$ or NZD prefix. It
leaves the input text alone while typing and groups valid amounts on blur,
preserving typed cents. Repayment maths consumes integer cents. The comparison
table displays approved rates to two decimal places. Applying an approved rate
uses the recorded source precision. An expired offer is marked **Outdated**
and cannot be applied. A dash indicates an unavailable cell.

## Official source checks

Rechecked 20 November 2026 NZ time. The 23 local SBS candidates match the
rechecked public rate table. They include standard and special fixed rates
from six months to five years and separate residential and investment floating
rates. The special records retain the source’s different equity thresholds.
This source check preserves the original capture and does not create a review or
renew the capture date. The production catalogue remains empty.

| Bank | What the public source showed | Collection outcome |
| --- | --- | --- |
| [ANZ](https://www.anz.co.nz/rates-fees-agreements/home-loans/) | The HTML showed placeholders. The anonymous rendered view exposed fixed and floating values. Special fixed rates have equity and salary-credit requirements. | [Website terms](https://www.anz.co.nz/comms/website-terms-of-use/) limit saving page content to personal use. Project capture and publication permission are pending. |
| [ASB](https://www.asb.co.nz/home-loans-mortgages/interest-rates-fees.html) | The public text lists fixed terms and Housing Variable with empty numeric cells. The bank's [September rate notice](https://www.asb.co.nz/legal/notices.html) gives a dated floating-rate change. Product restrictions include low-equity margins and specific top-up and legacy products. | The robots endpoint returned HTTP 403. The dated notice cannot confirm the current table. Evidence capture and reuse require a permitted manual check. |
| [BNZ](https://www.bnz.co.nz/personal-banking/home-loans/compare-bnz-home-loan-rates) | The public page describes the Standard product and low-equity premium. The permitted rendered check produced no numeric cells. A private refix discount and promotional top-up are outside the ordinary rate table. | The robots policy excludes rate-feed and API paths. The browser did not follow them. Obtain permitted evidence from an ordinary public or bank-provided source. |
| Westpac · `https://www.westpac.co.nz/home-loans-mortgages/interest-rates/` | The clean rate URL timed out. A bank announcement lists all seven special and standard Choices fixed terms effective 11 November 2026 at `https://www.westpac.co.nz/about-us/media/westpac-nz-cuts-popular-fixed-home-loan-rates-2/`. It does not confirm the current floating rate. | The robots endpoint returned HTTP 403. Website terms call for prior permission for direct links and public reuse. Confirm the rates and conditions again before capturing an approved revision. |
| Kiwibank · `https://www.kiwibank.co.nz/personal-banking/home-loans/rates-and-fees/` | Static and permitted rendered views did not expose numeric rates. The public page describes special fixed-rate equity and Kāinga Ora conditions. | Direct link and public reuse permissions remain open. |
| TSB · `https://www.tsb.co.nz/rates-fees-agreements/home-loan` | The official fixed and variable table is readable in the source view, with distinct special and standard deposit rules. | The robots endpoint returned HTTP 403. Website terms require prior written consent for reproduction and direct links. |
| SBS Bank | The ordinary fixed and floating table matches the local screenshot and 23 candidates. Targeted first-home products and default rates are outside those candidates. | Raw bytes and screenshot are local only. The independent price and rights reviews remain outstanding. The public source link is pending permission. |
| [The Co-operative Bank](https://www.co-operativebank.co.nz/rates) | Separate owner-occupied, standard and first-home special rows are readable. Standard rates can also apply to low-equity owner-occupied loans, subject to the bank’s stated premium. | The copyright page did not render with restricted content paths blocked. Confirm capture and reuse scope before archiving. |

Use the [Task 007 report](task007-mortgage.md) for the registered sources and
the manual archive, review, rights and staging commands.

## Review and maintenance

Run `npm run mortgage:evidence -- inventory` to check each archive and report
missing approvals. For each candidate:

1. Compare the local screenshot and original public source with the record.
   Confirm bank, product, advertised rate, term, effective dates if published,
   rate category, and property use. Keep personalised or retention offers,
   default interest, special-purpose top-ups and revolving or offset variants
   outside the ordinary fixed and floating rows.
2. Confirm equity or LVR bands, any premium, other material conditions and
   their Simplified Chinese translation. Establish whether eligible new
   borrowers can access the rate. Record genuine uncertainty and withhold
   rows whose applicable conditions cannot be confirmed.
3. Confirm documented capture permission and permission for publishing the
   normalised facts and direct link where required. Screenshot redistribution
   needs its own applicable approval. Keep originals and private permission
   materials outside the repository.
4. Have an independent contributor bind the price review to the record and
   evidence hashes. Bind the rights review to the same hashes. Stage only
   current, approved rows and use the existing maintainer approval workflow.
   Report the reviewed subset by bank and term.

Check the public sources periodically before OpenBill’s 30-day expiry and
when a bank announces changes. If a rate or condition changes, retain the
original evidence and receipts, create a new immutable capture with a new
timestamp and review, and keep the stable offer ID for the same product and
eligibility scope. Remove a withdrawn or superseded entry from the live
snapshot as soon as the change is confirmed. Publish the replacement after
approval. Old evidence stays local for audit, and stale entries are
ineligible for the calculator even if a snapshot still includes them.

## Validation

`npm run check`, `npm run build`, `npm run test:e2e` and `npm run test:dev`
passed. This includes 336 unit tests, 70 production browser tests and four
development browser tests. The mortgage tests cover grouped input parsing,
cursor position, blur, all three frequencies, approved-source validation
and missing or outdated rates. The local inventory found 23 intact records
and zero price reviews, rights reviews or published entries.
