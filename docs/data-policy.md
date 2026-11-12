# Data policy

## Household information

Do not collect, store, log, or transmit personal household bill information.
The initial tool asks only for electricity usage in kWh and the number of billing
days. These values are processed in temporary browser memory solely to show an
average. They are not saved or sent anywhere by OpenBill.

Do not add bill uploads, names, addresses, ICP numbers, account numbers, meter
identifiers, contact details, supplier login credentials, or personalised quote
requests. Do not copy household inputs into URLs, cookies, web storage, IndexedDB,
service-worker caches, error reports, session replay, telemetry, screenshots, issue
reports, server logs, analytics, or external comparison services.

There is no input submission endpoint. Form submission is handled in the browser;
production policy also blocks form navigation and browser connections. Clear,
reload, and language change reset the form. No account or consent dialog is needed
because there is no optional collection flow.

The site still needs ordinary requests to load its own HTML and assets; a future
host may see network metadata such as IP addresses. Household input must never be
included in those requests. Browser extensions, operating-system behaviour, and
the user's device are outside the application's control. Do not promise universal
anonymity or that reading a public website makes no network requests.

Use synthetic values for development and tests. Do not request real household bills
in bug reports. Development Next.js requests support hot reload but do not receive
form inputs. Framework development/build telemetry is disabled by the supplied
`.env.example` setup; it is separate from application input handling.

## Public supplier pricing

Public supplier pricing is separate from household input, UI components,
translations, and calculation logic. The initial catalogue is intentionally empty;
there are no verified prices, provider rankings, or savings claims in this release.

Every future record must include:

| Field | Required meaning |
| --- | --- |
| `id`, `provider`, `plan` | Stable record identifier and exact public provider/plan identity |
| `region`, `eligibility` | Geographic coverage and applicable customer/meter conditions |
| `dailyChargeNzd` | Source-accurate daily charge, as a decimal string in NZD |
| `usageRateNzdPerKwh` | Source-accurate per-kWh rate, as a decimal string in NZD |
| `gstIncluded` | This initial contract requires GST-inclusive values |
| `additionalFeesAndConditions` | Applicable extras, discounts, exclusions, and term conditions |
| `source.url` | HTTPS URL of the official provider source showing the applicable price |
| `source.verifiedOn` | Actual verification date in `YYYY-MM-DD` format, never an invented date |
| `source.evidenceScreenshot` | Repository-relative PNG under `evidence/electricity/` |
| `source.verifiedBy` | Public reviewer handle, with no customer information |

The initial contract supports flat tariffs only. Time-of-use, stepped rates,
controlled meters, export rates, bundled plans, and other structures require their
own model before inclusion. Do not flatten complex tariffs into misleading rates.
Do not insert illustrative prices into the real catalogue, even with a disclaimer.

## Verification gate before comparisons

1. Use an official provider pricing page or official public rate document. Search
   snippets, advertisements, affiliate sites, inferred values, and memory are not
   evidence. Do not send household information to obtain a quote.
2. Match the source to plan, region, meter, units, GST, effective dates, fees,
   eligibility, and discounts. If a public applicable price is unavailable, leave
   the record out and explain the coverage gap.
3. Capture a readable PNG of the relevant public evidence. Exclude customer data,
   logged-in content, tokens, and personalised quotes. Use a stable reference such
   as `evidence/electricity/<record-id>/<verification-date>.png`. Retain attribution
   and respect the original source's rights; the MIT code licence does not relicense
   supplier materials.
4. Have a maintainer independently review the record, evidence, exact values,
   conditions, and date. A type annotation is not verification.
5. Implement automated checks for parseable dates, valid decimal values, official
   source references, existing readable evidence files, duplicate IDs, missing
   conditions, and freshness before enabling any consumer of tariff records.
   **These runtime publication checks are future work, not implemented guarantees.**
6. Define a documented freshness window and effective-date policy before launch.
   Recheck on announced changes, expire stale records, and suppress estimates when
   evidence is missing, stale, contradictory, or outside the household's eligibility.
   Do not represent a verification date as a guarantee that a price is still current.

Future comparisons must disclose catalogue coverage, excluded charges, assumptions,
and verification dates. Never claim to cover the whole market without evidence.
Any data-policy change needs explicit review before new code is enabled. There is
no deployment or external data collection in this scaffold.
