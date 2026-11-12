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

Public supplier data is separate from household input, UI, translations and
calculations. v0.2 stores structured records and immutable reviews as JSON in
`data/electricity/`. The consumer catalogue remains empty: no real prices,
rankings or savings are displayed. Source-availability research is not a tariff.

The runtime contract and workflow are documented in
[electricity data infrastructure](electricity-data.md). Required fields include
retailer/plan, network/region, meter/registers, eligibility, conditions, decimal
prices with NZD units, GST, effective dates, original official URL, UTC collection
time, source revision, evidence ID and SHA-256 hashes. Source bytes, screenshot
and manifest are independently hashed. Reviews bind the tariff record hash and
record the actual verification time and reviewer handle. They do not authenticate
human identity.

Flat, time-of-use and tiered structures can be represented without pretending
they are interchangeable. Unsupported structures and unresolved eligibility,
discount, fee or GST assumptions cannot enter eligible results. Never infer a
numeric tariff from marketing discounts, export rates or a missing rate card.
Synthetic records belong only in labelled tests/examples and are rejected by the
production importer. Do not fabricate a real tariff to demonstrate the pipeline.

## Collection, evidence and redistribution

Only official retailer or relevant government/regulator sources may support a
price. Search snippets, comparison/affiliate sites, advertisements and memory are
not evidence. Approved URLs must be HTTPS and contain no credentials, query
parameters or fragments. Never enter an address or ICP or use a personalised quote.

Respect terms, robots policies and rate limits. Do not bypass protections, log in,
solve CAPTCHAs, or assume robots permission overrides website terms. Mercury's
adapter is manual-only because of its website terms. No live retailer automation
is enabled. See [official-source research](official-source-research.md) for references.

Raw source files, screenshots, capture metadata and rate-limit state live under
ignored `.local-data/`, outside public assets. Never overwrite prior captures.
Missing screenshots require a reason and keep records pending/manual verification.
A hash proves byte consistency, not accuracy, permission or authenticity. Never
archive customer bills, logged-in pages, quotes, tokens or secrets.

Screenshots are **not public by default**. Staging requires recorded permission and
an independent, manifest-bound rights review. It writes only a PNG and attribution
to ignored `evidence/published/`; it does not commit, upload or deploy. MIT applies
to code, not supplier materials. Any later public addition needs explicit approval
and review of the actual permission and capture contents.

## Verification and applicability gate

Imports are `collected` or `pending-verification`. Schema validation never creates
`verified` status. A separately recorded independent review must check official
source, prices/units, geographic/meter scope, eligibility/contract, GST/dates and
the matching screenshot. Reject, expire or append replacement reviews; never
edit existing reviews or tariffs to erase history.

The repository checks fields, dates, non-negative prices, units, GST, weekly/tier
conflicts, duplicates, history and integrity. The future-data eligibility gate
requires a valid review, current effective dates, capture and review less than
30 days old, complete evidence, supported assumptions and an exact supported
query scope. Any catalogue integrity failure blocks all eligible results. Known
effective replacements suppress ancestors even before replacement verification.
Missing/stale/rejected data must not silently revive an old price.

Thirty days is a project maximum, not a promise of price stability. Recheck on
announced changes. Future comparisons require an independently validated calculator
and coverage; passing this data gate alone does not enable savings. Disclose
exclusions, coverage, assumptions and dates. Never claim whole-market coverage
without evidence. No new external services, secrets, household input collection
or deployment are introduced by this infrastructure.

## Public community feedback

OpenBill links to the existing public GitHub Issues page for general ideas.
GitHub is a separate third-party website, has its own service/privacy policies,
requires an account to post and makes contributions public. The homepage explains
that before navigation. This does not introduce an OpenBill account or submission
endpoint. No GitHub scripts, tracking embeds or background requests are added.

Never prefill an issue URL/body from calculator state, send household inputs to
GitHub, or request financial details, account numbers, addresses or uploaded bills.
The static link has no input/query parameters and suppresses referrer information.
The bilingual issue template requests only general needs and value. GitHub may
still allow attachments; the template is guidance, not a technical guarantee
against accidental disclosure. Do not copy any exposed personal information into
logs/tests/issues. See [CONTRIBUTING.md](../CONTRIBUTING.md).

Product growth and impact measurement do not relax these rules. The 15-category
vision is not permission to collect household financial histories or introduce
tracking. Future category tools need their own evidence/calculation review and
must preserve local processing and explicit expense boundaries.
