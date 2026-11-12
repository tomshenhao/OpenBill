# Architecture

## Scope and stack

Next.js App Router, strict TypeScript, React, and Tailwind CSS. The application
exports static HTML/CSS/JavaScript with `output: "export"`; there is no runtime
backend, database, account system, upload endpoint, or API dependency.
All fonts and visual assets are local/system assets. No remote font or image calls
are required. The house illustration and brand mark are source-controlled SVGs.

The homepage introduces the household-wide mission, six core categories, a usable
electricity form, progressively disclosed future categories, a public roadmap and
community participation. It retains the green identity and house illustration.
Only the electricity usage calculator is available; there are no supplier prices
or other category comparison interfaces.

## Boundaries and data flow

```text
Permitted official public sources (no live retailer automation enabled)
  -> tools/electricity/ manual adapter and evidence archive
  -> .local-data/evidence/ (local source files and screenshots)
  -> data/electricity/records/ + reviews/ (append-only JSON)
  -> schema, integrity, freshness, verification and scope gates
  -> developer repository queries (no consumer comparison engine)

data/electricity/published.json (empty)
  -> src/data/electricity/tariffs.ts (consumer boundary)

Household types two numbers
  -> UsageForm React state in the current tab
  -> pure domain/electricity/usage.ts validation/calculation
  -> local result rendered from state
```

There is no path from household input to public supplier data or to a server.
Server-rendered pages contain blank inputs; values are not serialized into HTML,
React Server Component payloads, URLs, or static files. No tariffs are imported by
the usage form. The usage calculation cannot produce a dollar amount or savings.

v0.2's [electricity data guide](electricity-data.md) describes the implemented
model, storage, manual Mercury workflow, evidence staging, review states and CLI.
The [research report](official-source-research.md) explains why no actual tariff
was imported. Network/file/browser operations are confined to `tools/`, never
imported by app code. Shared contracts in `src/domain/provenance.ts` support
future categories; electricity-specific schemas and quality rules stay separate.

`src/domain/categories.ts` identifies six core and nine future product categories.
Each future category should have its own domain types, data directory, validation,
and calculation modules. Avoid a generic calculator that obscures category-specific
fees or assumptions.

`src/config/categories.ts` describes category IDs, icons, genuine availability,
locale routes, supported/future features, source readiness, category-specific
calculation metadata and expense ownership/exclusions. Names/descriptions resolve
by ID in the bilingual product dictionaries. Planned categories have null routes
and calculations and no implemented features. Product scope does not automatically
extend the existing v0.2 electricity/provenance storage schemas.

`src/config/roadmap.ts` owns milestone statuses, read directly by the homepage.
`scripts/roadmap.ts` generates ROADMAP.md from the same configuration and dictionaries;
tests check it for drift. “Completed” describes implemented/tested work, not release
tags, verified tariffs or approval to publish uncommitted changes. No dates or
percentages are invented. See [the product vision](product-vision.md) for full scope,
phase selection and double-counting boundaries.

The nine future categories use native `details`/`summary` disclosure, with no new
client state or dependency. Community navigation is a plain static link to the
existing verified GitHub Issues page. Public/account/privacy notices precede
navigation. It carries no calculator entries, query parameters or referrer, and
there is no feedback backend, automatic issue submission or third-party embed.

## Internationalisation

`src/app/[[...locale]]/` statically generates only `/` (English) and `/zh/`
(Simplified Chinese). Unsupported paths return 404. The root layout sets `en-NZ`
or `zh-Hans-NZ` on the actual HTML document and provides translated metadata.
No locale-detection middleware, cookie, browser-language collection, or third-party
translation service is used.

The English dictionary defines the key structure; Chinese is checked against that
type and a key-parity test. Number formatting uses the active document language.
Native document navigation between languages clears inputs and avoids client router
prefetch or background fetches. Every user-facing feature must ship in both languages.

## Usage and numeric rules

- Accept kWh as a non-negative decimal, up to 3 decimal places and at most 100,000.
  Zero is a valid input. Require a leading digit; reject currency, commas, exponent
  notation, non-finite values, negative numbers, and more than 3 decimal places.
- Require a whole number of billing days from 1 to 366. Do not infer a month length.
- These bounds are validation guardrails, not claims about typical household usage.
- Daily kWh = period kWh / actual billing days. JavaScript number arithmetic is
  adequate for this descriptive average; round only the display to 2 decimal places
  and disclose rounding. No annualisation, cost, tariff matching, or savings estimate.
- Editing inputs invalidates the previous result. Validation identifies the field,
  supplies a translated explanation, and moves focus to the first invalid input.
- Future money calculations need a reviewed exact-decimal/integer strategy; do not
  repurpose floating-point usage averages as financial arithmetic.

## Privacy and accessibility

The only household state is in the form's React component. Clearing, reloading, or
changing language removes it. There are no named form fields, storage APIs, network
APIs, logging calls, server actions, analytics, or third-party scripts in app code.
The production content security policy blocks `connect-src` and form submissions.
Next.js inline hydration requires `script-src 'unsafe-inline'` for this static
build; this is a documented limitation, not a complete security guarantee. The local
preview also sends `frame-ancestors 'none'`, `nosniff`, and `no-referrer` headers.
Any future host must preserve the policies and avoid input collection; nothing is
deployed now. Framework development live reload is allowed only in dev mode.

Use native labels, buttons and headings; a skip link; visible focus indicators;
field descriptions and `aria-invalid`; a live result region; reduced motion; and
layouts that fit narrow screens. Price status is explained in text, not just colour.
See the data policy for the precise boundary of the privacy promise.

## Verification and limits

Vitest covers numeric edge cases, translations, paths, the empty consumer catalogue,
tariff schema/periods/units, exact bigint charge primitives, history, evidence
checksums/metadata, review rules and query exclusions, plus a source-level privacy
regression tripwire. Playwright tests the built
static app in desktop/mobile Chromium, both locales, errors/focus, keyboard submit,
state clearing, network/console/storage behaviour, and automated axe checks.
An additional browser test captures a synthetic HTTPS page fulfilled locally,
checking PNG generation, hashes, pending status and rate limiting. It contacts
no retailer and produces no verified real price.
The source tripwire is not a substitute for review or browser observations.

CI runs lint, types, unit tests, production build, and browser tests. Browser traces,
video, and screenshots are disabled. Tests use synthetic numbers only. A future
release still needs manual screen-reader, zoom, browser, and native-language review.
No comparison accuracy can be claimed while tariffs and a comparison engine are absent.
`npm run check` also runs local data validation; CI never collects external data.

## Dependency maintenance

The lockfile is included for reproducible installs. ESLint 9.39.5 matches the peer
requirements of Next.js's bundled React/import/accessibility lint plugins; npm marks
that ESLint line deprecated. Upgrade when those plugins support the next major.
The narrowly scoped npm override for `@typescript-eslint/typescript-estree` uses
`minimatch` 11.0.1 to address GHSA-g3hv-75wg-m249. Lint and type checks exercise this
toolchain. Remove the override when the upstream dependency includes the fix, and
re-run the complete checks after dependency changes. No override affects runtime
household calculations.
