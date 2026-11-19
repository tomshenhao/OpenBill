# Receiving, reviewing and staging real tariffs

This is a local maintainer workflow, not a consumer upload feature. No production
tariff file has been received. No command sends a retailer request or publishes a
site. Preserve all old evidence, records and reviews.

## 1. Approve a request and receive a nonpersonal product file

Read [six routes/drafts](retailer-requests/README.md). Obtain approval before any
email, phone call, form or account registration. Ask for current EIEP14A JSON and
written rights clarification. Do not request a household address, ICP, account,
bill or consumption. Do not agree to paid alternatives.

Save only the original nonpersonal product attachment under ignored
`.local-data/incoming/`. Keep correspondence references separately and locally;
do not archive email signatures, recipient details or personal customer data as
pricing evidence. Preserve original UTF-8 bytes, even when normalising a candidate.

Copy `tests/fixtures/eiep14a-request.json` **as a key reference only** into a local
request file. Replace every synthetic value with actual source file, registered
retailer ID, official HTTPS source URL, actual UTC receipt/collection timestamp,
collector handle and nonpersonal receipt reference; set `dataKind: "official"`.
The assertion `publicNonPersonalProductFileConfirmed: true` requires inspection.
Do not relabel synthetic prices. Source provenance still requires independent review.

## 2. Check before writing, then archive the pending candidate

```sh
npm run data:eiep14a -- .local-data/receipt-request.json --check
npm run data:eiep14a -- .local-data/receipt-request.json
```

`--check` validates without writing and reports source SHA-256, per-plan fixed and
variable component counts and unresolved work. Missing components are warnings
requiring clarification, not proof of free electricity. A syntactically complete
file may still omit an applicable levy or eligibility rule.

Import uses exclusive creation under
`.local-data/imports/eiep14a/<retailer>/<sha256>/source.json` and `candidate.json`.
An identical import is refused; do not remove the existing archive to rerun it.
Failed partial writes remain for diagnosis. A changed source has a different hash.
The candidate is pending, local-only and ineligible. It preserves the entire
product structure, source hash/revision, receipt reference and outstanding checks.

JSON headers are optional. Missing version, utility, file status and source run
time are **not invented**; obtain sender confirmation before mapping. Unsupported
explicit versions, gas, CSV and R/X replacement semantics require manual handling
and further tested adapter work. Ask for a complete initial snapshot if appropriate.
Never strip an R/X header and import a partial update as a complete catalogue.

For a fixture-only dry run (writes nothing):

```sh
npm run data:eiep14a -- tests/fixtures/eiep14a-request.json --check
```

## 3. Map scope and review all components

Two contributors should resolve the retailer identity, product IDs, current versus
closed/legacy availability, inherited customer-group/plan/type/tariff attributes,
start/end/close dates, each network/NSP/price/loss restriction, actual meter and
register configuration, schedules/DST and eligibility. A null network does not
establish a specific consumer meter or geographical availability.

The initial registry supports Vector/Auckland and Orion/Canterbury mappings only.
Nationwide files do not automatically broaden this. Add independently sourced
network mappings before importing other scopes; don't use Auckland as a network ID.

Verify **every** fixed and usage component, separate levies, fees, discounts,
contracts and exit costs. EIEP14A rates are GST-exclusive with discounts removed.
Keep the raw source unchanged; manually document any exact conversion and resulting
rounding before producing GST-inclusive record strings (maximum six decimals).
If an exact converted rate cannot be represented safely, keep it unsupported;
do not silently round a rate into a different offer. Discounts, bundled benefits,
spot rates, holiday/seasonal rules and unresolved eligibility must not be flattened.

The simple consumer period view supports only reviewed unconditional flat plans
with a single measured register. Existing annual TOU calculations require complete
actual half-hour profiles. No profile may be invented from a monthly total.

## 4. Capture evidence and import an immutable record

Follow [the evidence contract](electricity-data.md). Register the exact official
public source URL after review; a request attachment is not automatically an
approved URL. If the file is private delivery only, preserve its receipt reference
and obtain an auditable official source and permitted screenshot. Missing source
or screenshot blocks verification; don't substitute a screenshot of a fixture.

Review terms before manual capture. All six registered retailers can use the
manual archive path; Mercury still requires written permission for images.
No retailer is enabled for automated collection. Use Playwright only if the
existing permission and robots gates permit it; never bypass access controls.

Create a local evidence request using
`docs/examples/mercury-evidence.template.json` for the field structure, replacing
retailer-specific values and terms. Do not copy Mercury permissions to another retailer.

```sh
npm run data:archive -- --request .local-data/evidence-request.json
npm run data:import -- --file .local-data/mapped-tariff.json
npm run data:validate
npm run data:query -- --retailer RETAILER_ID
```

The mapped record follows `src/domain/electricity/tariff.ts`; the only complete
example is explicitly synthetic in `tests/fixtures/electricity.ts`. The maintainer
must transcribe actual data and bind the archive command's actual manifest/source/
screenshot hashes. There is deliberately no automated candidate-to-verified conversion.

## 5. Independent price and rights reviews

Use `docs/examples/review.template.json`, binding the exact stored record SHA-256
reported by `data:query`. A different contributor checks the official source,
prices/units, scope, conditions, GST/dates and screenshot. A failed or incomplete
review remains ineligible. Schema validation never ticks those checks.

```sh
npm run data:review -- --file .local-data/price-review.json
npm run data:validate
```

Record actual written redistribution permission in the evidence manifest. Retain
restricted material locally. An independent rights reviewer uses
`docs/examples/rights-review.template.json`, bound to the actual evidence manifest.
Confirm separately normalised data, raw files, screenshot scope, attribution and
historical retention. MIT on project code does not license supplier material.

```sh
npm run data:stage-evidence -- --retailer RETAILER_ID --evidence EVIDENCE_ID --rights-review .local-data/rights-review.json
```

This stages permitted PNG/attribution locally under ignored `evidence/published/`.
It does not publish anything. Never copy unapproved source documents into `public/`.

## 6. Stage, inspect and explicitly approve a consumer bundle

Prepare a local JSON bundle shaped like `data/electricity/comparison-plans.json`:
`schemaVersion: 1`, `entries` containing the exact `record`, `recordSha256`, stored
latest `review`, and `rights` receipt (record ID/hash, permission reference,
reviewer and UTC review time). Source schema: `comparisonEntrySchema` in
`src/domain/electricity/comparison.ts`. Do not make new attestations by copying
example identities or timestamps.

```sh
npm run comparison:stage -- .local-data/comparison-bundle.json
npm run comparison:validate
npm run check
npm run build
npm run test:e2e
```

Staging checks the full repository, immutable evidence, review and permission
bindings and writes a new ignored publication file. `comparison:validate` validates
the currently tracked consumer bundle; it is not a substitute for staging the new
one. Inspect the staged file and arrange explicit approval before copying a bundle
into the tracked dataset or committing/pushing/deploying it. Publication is not
automatic. Both source capture and price review have a 30-day freshness gate.

The browser rechecks current dates, exact scope, eligibility and freshness. The
equivalent-period estimate uses today's reviewed prices on measured quantities and
days, not historical rates. Differences need a selected eligible verified current
plan; the user's total bill is not treated as that baseline. Partial catalogue
coverage always remains visible. No short-bill annual projection is offered.

## 7. Update without losing history

Agree a refresh/error-notice mechanism with each retailer; no update subscription
is assumed. Archive each new response by hash. Create new evidence, record/revision
and explicit `supersedes` link; obtain new independent reviews and rights checks.
Retain old originals and reviews, including when corrected/rejected. An effective
replacement suppresses its ancestor even while pending, preventing fallback to an
obsolete price. A changed scope needs explicit old-offer expiry. A new review cannot
repair changed record bytes. Back up ignored evidence locally; Git cannot restore it.
