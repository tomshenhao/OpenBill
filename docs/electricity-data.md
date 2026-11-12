# Electricity data infrastructure (v0.2)

This release establishes a local, auditable workflow. **It does not contain a real
tariff, supplier recommendation, savings estimate, or enabled retailer scraper.**
The [official-source research](official-source-research.md) records what was found
and why no complete, privacy-compatible rate card was imported.

## Architecture and storage

```text
Permitted, nonpersonal official public source
  -> manual capture (Mercury adapter) or permission-gated Playwright helper
  -> .local-data/evidence/electricity/<retailer>/<capture UUID>/
     source.html|pdf|txt + optional source.png + manifest.json
  -> data/electricity/records/<retailer>/<plan>/<revision>.json
  -> data/electricity/reviews/<record ID>/<review ID>.json
  -> integrity, quality, freshness and applicability gates
  -> repository query results for developers

Browser calculator -> temporary React state -> usage calculation -> local result
```

The two flows never connect. Node-only collection, filesystem and CLI code lives
in `tools/electricity/`, outside application code. Version-controlled JSON lives
in `data/electricity/`; source artifacts remain local and ignored. The consumer
`published.json` is deliberately empty and is not populated by a command.

`JsonTariffRepository` exposes `inspect`, `query`, `importRecord`, and `appendReview`.
A later SQLite/PostgreSQL implementation can replace this interface without
changing tariff contracts or the browser calculator. File writes use exclusive
creation (`wx`), with fresh capture UUIDs and immutable record/review files.
`.gitattributes` fixes tracked data JSON to LF, preserving record hash bytes across
Windows and Linux checkouts. Reviews intentionally fail if any record bytes change.
Do not edit old revisions. Preserve and back up the ignored archive separately;
Git alone cannot restore it. Partial failed captures are retained for diagnosis
but are not valid evidence until a complete manifest is written.

Shared source/artifact contracts are in `src/domain/provenance.ts`. Electricity
adds its own rate, eligibility, geography and review rules. Future broadband/mobile
adapters can reuse provenance without inheriting electricity formulas.

## Record contract

`src/domain/electricity/tariff.ts` is the runtime Zod schema and TypeScript source
of truth. Zod is the only new dependency. Unknown fields are rejected. A complete
**synthetic-only** example is `tests/fixtures/electricity.ts::syntheticTariff()`.
Its reserved example domain, fake retailer and `dataKind: "synthetic"` make its
purpose explicit. Production import refuses it. It is never bundled into the UI.

| Fields | Meaning |
| --- | --- |
| `schemaVersion`, `recordId`, `revision`, `supersedes` | Schema format, unique record, immutable revision and optional preceding record |
| `retailerId`, `plan` | Registry identity and exact public plan ID/name |
| `coverage` | Explicit ISO NZ region codes, network IDs, and source coverage description |
| `metering` | Configuration, complete register IDs, and source description |
| `eligibility` | Low/standard/unrestricted/unknown, residence restriction, optional annual limits, conditions and unresolved flag |
| `contract` | Term months, NZD termination fee, described conditional discounts and conditions |
| `gst` | Inclusive/exclusive/unknown, explicit source tax rate where supplied, and source explanation |
| `effectiveFrom`, `effectiveTo` | NZ calendar dates, inclusive start and exclusive end; null end means not stated, not perpetual validity |
| `charges.daily` | One or more fixed components, each with decimal amount, `NZD` and `NZD/day` |
| `charges.usage` | Per-register flat, time-of-use, tiered, or explicitly unsupported structure; `NZD/kWh` |
| `provenance` | Evidence ID, manifest/source/screenshot SHA-256 hashes, official URL, UTC collection time, collector and source revision |
| `status` | Initial `collected` or `pending-verification`; an import cannot self-verify |

Prices are non-negative decimal **strings**, up to six decimal places; never
binary floating-point money. Source precision is preserved. No cents-to-dollars
or GST conversion is guessed. Record zero only if the source explicitly says zero.
UTC timestamps require the `YYYY-MM-DDTHH:mm:ss.sssZ` form.

Time-of-use intervals use `Pacific/Auckland`, ISO weekdays 1–7, inclusive starts
and exclusive ends. `24:00` is an allowed end. Overnight bands spill into the next
day, including Sunday to Monday. Each register must have complete weekly coverage
without overlaps. Separate controlled registers may overlap in clock time.
Tier ranges start at zero, join without gaps/overlaps and end with an open tier.
Holiday, seasonal, dynamic, export and special benefit calculations are not
implemented; do not force them into a flat rate. Split effective-date windows
where appropriate or retain an `other` structure, excluded from eligible results.

`money.ts` supplies exact bigint charge primitives and one final half-up cent
rounding operation. They test units and arithmetic, not supplier savings or a
complete plan calculator. Tiered/other structures, discounts, unresolved terms,
unknown/exclusive GST, and unsupported eligibility remain ineligible.

## Manual workflow: Mercury

This is an implemented file-import adapter, **not a live price scraper**. Mercury's
terms prohibit scraping and restrict image reproduction. No current complete
numeric regional tariff was obtained. Follow this workflow only for permitted,
nonpersonal official material; written image permission is required by this adapter.
It does not accept account pages, a customer bill, an ICP, an address or a quote.

1. Read the retailer's current website terms and source. If collection or local
   archiving is not permitted, stop and retain the unavailable research status.
   Do not infer permission from robots.txt. Obtain an actual public rate card and
   all applicability details before preparing a tariff; a plan description is not one.
2. Manually save the original public HTML/PDF/text file and, only when permitted,
   a PNG screenshot with the relevant source context. Use `.local-data/incoming/`.
   Do not substitute your own transcription for the original source bytes.
3. Copy `docs/examples/mercury-evidence.template.json` to `.local-data/`, replace
   its deliberately invalid placeholders with actual timestamps/paths/review
   details, and confirm the nonpersonal source. Keep screenshot null and supply a
   reason if it is unavailable. This can archive a source while leaving it pending.
4. Archive it:

   ```sh
   npm run data:archive -- --request .local-data/mercury-evidence.json
   ```

   The command prints the new evidence ID and manifest/source/screenshot digests.
   The immutable manifest records source URL, plan, retailer, collection/archive
   times, collector, capture method, terms review and redistribution permission.
   New evidence never replaces an old capture, even if source bytes are identical.
5. Prepare a complete tariff JSON using the schema. Use exact official values and
   the archive command's provenance output. Initial status is pending, never
   verified. Add a newly reviewed public URL to `retailers.json` if necessary;
   the allowlist intentionally rejects arbitrary paths and all query parameters.
   The registry currently recognises only Vector/Auckland and Orion/Canterbury
   network-region combinations; add source-reviewed mappings before other scopes.

   ```sh
   npm run data:import -- --file .local-data/mercury-tariff.json
   npm run data:validate
   npm run data:query -- --retailer mercury
   ```

   Imports reject invalid fields, values, units, unsupported scope, missing/tampered
   source artifacts, inconsistent provenance, duplicate revisions and bad history.
   Missing screenshots with a stated reason are retained as pending, never eligible.
   A complete import still requires an independent review.

The repository test suite exercises this whole archive/import/review/query flow
with synthetic fixtures. No real tariff fixture is provided because none was
obtained under the current source and privacy constraints.

## Independent verification and queries

A second contributor must inspect the exact official source and archived screenshot,
prices/units, region/network/registers, eligibility, contract/discounts, GST and dates.
Copy the review template, set the real reviewer handle and review timestamp, and
bind `recordSha256` to the value reported by `data:query`. Set each check true only
after doing it. Reviewer and collector must differ. Then append the review:

```sh
npm run data:review -- --file .local-data/mercury-review.json
npm run data:validate
npm run data:query -- --retailer mercury --region NZ-AUK --network vector --metering smart --registers uncontrolled --category standard --date 2026-11-13 --eligible
```

The query values above are public catalogue filters, **not household inputs**; they
are illustrative scope selectors, not assertions about a Mercury tariff. Expect
an empty result for this release. Change the date intentionally; omitting it uses
the current New Zealand calendar date. A query without `--eligible` returns audit
history, including pending/rejected/expired records, labelled with their status.
Eligible queries require exact region, network, configuration, register set and
user category. They do not infer a meter from a region or household consumption.
Residence/annual-consumption restrictions need future browser-side matching and
are conservatively excluded by the current eligible query.

Schema validation never creates a verification event. `verifiedAt` is derived
from the valid review, not the collection or build date. Reviews are append-only
and bind the exact record bytes, which bind all evidence hashes. A new rejection
or expiry review names `previousReviewId`; branching, altered, future-dated and
incomplete reviews invalidate the gate. Hashes detect changes; they do not prove
source authenticity, copyright permission, reviewer identity or real independence.
Those require actual human review and normal repository review controls. No
signature/identity service is claimed by this local MVP.

Both capture and verification must be less than **30 days old**. This is a cautious
OpenBill policy, not a guarantee that a tariff remains unchanged for 30 days.
Announced changes require immediate rechecking. Effective-date expiry is separate;
end dates are exclusive. Unverified future-effective records can be retained but
cannot be eligible before their start date.

For updates, make a fresh source capture, a new record/revision and explicit
`supersedes` link within the same scope, then obtain a new review. Once a known
replacement becomes effective, ancestors are suppressed even while it is pending
or rejected: do not silently revive an old rate. Old files remain queryable. For
scope changes, create distinct records and explicitly expire the obsolete offer.
Historical queries select effective dates with today's integrity/review assessment;
this is not a reconstruction of what was known at every past moment.

## Playwright evidence helper

`npm run data:capture -- --request .local-data/capture-request.json` is available
for a future explicitly permitted retailer. No researched retailer is currently
enabled for automation. A request contains `retailerId`, referenced `plan`, an
approved `sourceUrl`, `termsReviewedAt`, public `reviewerId`, an actual
`automationPermissionReference`, and `termsPermitAutomationAndLocalCapture: true`.

The helper refuses prohibited/unreviewed retailer policies before browser launch.
It checks robots.txt before the page, fails closed on any restriction/unfamiliar
directive or redirect, blocks third-party traffic, scripts, query URLs, non-GET
requests and excessive requests, enforces a 10-second collection interval and an
exclusive per-retailer lock, and stops on access protection. There are no retries,
login, CAPTCHA handling or anti-bot bypasses. A lock left by a terminated process
requires manual inspection before removing that exact stale lock file.

Successful permitted captures retain original response bytes, robots text,
screenshot and hashed metadata under a fresh `.local-data/captures/<UUID>/`.
Screenshot failure is recorded as unavailable and pending, never verified.
Rendering is intentionally limited; JS-dependent or complex policies need manual
review. Capture is separate from archive/import and does not extract any numeric
price. A future retailer adapter must validate the capture before archiving it.
The real-browser capture test uses a reserved synthetic HTTPS source fulfilled
locally; it makes no real retailer request and preserves no household data.

## Evidence retention and rights-aware staging

The entire `.local-data/` directory is ignored. Keep original evidence locally by
default; do not put it under Next.js `public/`, upload it in CI, or assume MIT
covers supplier material. Never discard prior source captures when prices change.
Back up local evidence using an approved local process, separately from Git.

Publication requires an actual written permission reference recorded at capture,
a second rights reviewer, a manifest-bound rights review file and a readable
screenshot. The staging command checks those attestations and hashes:

```sh
npm run data:stage-evidence -- --retailer mercury --evidence CAPTURE-ID --rights-review .local-data/rights-review.json
```

It copies only the PNG and attribution metadata into **ignored**
`evidence/published/<capture ID>/`. It does not copy raw source HTML/PDF, commit,
upload or deploy anything. The reviewer must separately inspect for personal data,
attribution and the permission's exact redistribution scope. Any later public Git
addition requires explicit project/user approval. SHA-256 is not a rights licence.

## Adding a retailer and running checks

1. Research an official, nonpersonal source and current website terms/robots policy.
   Record limitations honestly; marketing/export figures are not import tariffs.
2. Add its exact source URLs and hostnames to the retailer registry. Keep automation
   `not-reviewed`/`prohibited` until actually permitted. Add official network-region
   evidence where needed; broad regions do not imply whole-region availability.
3. Implement the small `ManualCollectionAdapter` interface, register it in the CLI
   (which currently defaults to Mercury), and test parsing/import failures with
   labelled synthetic fixtures. Do not add household identifiers to obtain a quote.
4. Reuse evidence archiving and repository validation. Extend rate structures and
   comparison support explicitly; never flatten unsupported charges.
5. Run:

   ```sh
   npm ci
   npm run check
   npm run build
   npx playwright install chromium
   npm run test:e2e
   npm run data:validate
   npm run data:query -- --retailer mercury
   ```

On Windows use `npm.cmd`/`npx.cmd` if needed. Full validation requires the matching
local evidence archive; missing artifacts fail closed, including on another clone.
No network collection is run by CI. Empty-catalogue validation success means the
infrastructure is consistent, not that any supplier or market coverage is verified.

## v0.3 priorities

Secure permitted, complete public rate cards and independent reviewers; validate
coverage with electricity-domain contributors; add signed/repository-reviewed
verification identities and distributable evidence where rights allow; broaden
network/meter support; independently audit GST, fees, holidays, DST and conditional
discount calculations before enabling a browser-side comparison engine. Keep
household inputs out of the Node data tooling and all supplier requests.
