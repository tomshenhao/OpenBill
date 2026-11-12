# Working on OpenBill

OpenBill is an independent, public-interest bill comparison project for New Zealand households.

- Use Next.js App Router, strict TypeScript, and Tailwind CSS. Keep dependencies free and open source.
- Ship English (`en-NZ`, `/`) and Simplified Chinese (`zh-Hans-NZ`, `/zh/`) together. Keep copy in `src/i18n/`, with matching keys and accessible labels.
- Household inputs belong only in temporary browser component state. Never put them in storage, URLs, cookies, logs, analytics, network requests, server actions, issue reports, or test artifacts. Use synthetic values in tests.
- Do not add bill uploads, account identifiers, addresses, or provider quote lookups that transmit household information.
- Keep public supplier data (`src/data/`), domain models/calculations (`src/domain/`), translations, and UI (`src/components/`) separate.
- Never invent a real tariff, saving, ranking, endorsement, or verification claim. A publishable price requires an official provider URL, verification date, and a reviewed screenshot reference. The initial tariff catalogue is deliberately empty.
- Treat screenshots as public-source evidence, never customer bills. See `docs/data-policy.md` before changing the data model.
- Prefer accessible native elements, visible keyboard focus, plain language, and responsive layouts. Keep both document language and metadata accurate.
- Run `npm run check`, `npm run build`, and `npm run test:e2e` for changes affecting calculation, privacy, or interactions. Report unavailable checks honestly. Do not weaken failing checks to make them pass.
- Do not deploy, purchase services, add paid dependencies, or introduce tracking. Hosting is outside the initial task.
- Make focused, incremental changes. Preserve existing work. Do not create commits or publish externally unless asked.
