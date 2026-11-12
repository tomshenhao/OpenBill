# Architecture

## Scope and stack

Next.js App Router, strict TypeScript, React, and Tailwind CSS. The application
exports static HTML/CSS/JavaScript with `output: "export"`; there is no runtime
backend, database, account system, upload endpoint, or API dependency.
All fonts and visual assets are local/system assets. No remote font or image calls
are required. The house illustration and brand mark are source-controlled SVGs.

The homepage introduces the mission, gives a usable electricity input form,
explains the evidence limitation, and labels future categories as planned.

## Boundaries and data flow

```text
Public, manually reviewed supplier sources (future)
  -> evidence/electricity/ screenshots
  -> src/data/electricity/tariffs.ts (currently empty)
  -> future comparison engine (not implemented)

Household types two numbers
  -> UsageForm React state in the current tab
  -> pure domain/electricity/usage.ts validation/calculation
  -> local result rendered from state
```

There is no path from household input to public supplier data or to a server.
Server-rendered pages contain blank inputs; values are not serialized into HTML,
React Server Component payloads, URLs, or static files. No tariffs are imported by
the usage form. The usage calculation cannot produce a dollar amount or savings.

`src/domain/categories.ts` identifies electricity, broadband, mobile, and insurance.
Each future category should have its own domain types, data directory, validation,
and calculation modules. Avoid a generic calculator that obscures category-specific
fees or assumptions.

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

Vitest covers numeric edge cases, translation parity, supported paths, the empty
catalogue, and a source-level privacy regression tripwire. Playwright tests the built
static app in desktop/mobile Chromium, both locales, errors/focus, keyboard submit,
state clearing, network/console/storage behaviour, and automated axe checks.
The source tripwire is not a substitute for review or browser observations.

CI runs lint, types, unit tests, production build, and browser tests. Browser traces,
video, and screenshots are disabled. Tests use synthetic numbers only. A future
release still needs manual screen-reader, zoom, browser, and native-language review.
No comparison accuracy can be claimed while tariffs and a comparison engine are absent.

## Dependency maintenance

The lockfile is included for reproducible installs. ESLint 9.39.5 matches the peer
requirements of Next.js's bundled React/import/accessibility lint plugins; npm marks
that ESLint line deprecated. Upgrade when those plugins support the next major.
The narrowly scoped npm override for `@typescript-eslint/typescript-estree` uses
`minimatch` 11.0.1 to address GHSA-g3hv-75wg-m249. Lint and type checks exercise this
toolchain. Remove the override when the upstream dependency includes the fix, and
re-run the complete checks after dependency changes. No override affects runtime
household calculations.
