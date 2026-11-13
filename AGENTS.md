# Working on OpenBill

OpenBill is a free, independent, public-interest household expense project, initially serving New Zealand. Electricity is the first tool, not the entire product.

- Use Next.js App Router, strict TypeScript, and Tailwind CSS. Keep dependencies free and open source.
- Ship English (`en-NZ`, `/`) and Simplified Chinese (`zh-Hans-NZ`, `/zh/`) together. Keep copy in `src/i18n/`, with matching keys and accessible labels.
- Keep category capabilities in `src/config/categories.ts` and milestone status in `src/config/roadmap.ts`. Planned tools have no routes/calculators or supported features. Never infer a released feature from the product vision.
- Regenerate ROADMAP.md with `node scripts/roadmap.ts` after relevant config/copy changes. Completed means implemented/tested scope, not verified prices or a GitHub release. No invented dates, percentages or progress.
- Give each category its own model and calculation rules. Shared provenance is reusable; mortgage, insurance, groceries and electricity are not one universal tariff. Preserve explicit expense ownership to avoid counting bundled charges twice.
- Community feedback uses a static public GitHub link with account/public/privacy notices. Never attach calculator state, prefill household information, submit issues automatically, or add a feedback backend/tracker. Templates stay local until approved publication.
- Household inputs belong only in temporary browser component state. Never put them in storage, URLs, cookies, logs, analytics, network requests, server actions, issue reports, or test artifacts. Use synthetic values in tests.
- Electricity analysis lives at `/electricity/` and `/zh/electricity/`; preserve the original homepage usage form. Regional benchmarks must match the exact full calendar month; all-size means cannot produce household-size peers or percentile ranks. Preserve original CSV bytes/hashes and source/licence metadata.
- EIEP14A imports stay local pending candidates. Do not infer missing network/meter conditions, automate independent review, send retailer requests or assume receipt grants redistribution rights. Comparison bundles must pass the existing repository plus explicit rights gates; TOU needs complete measured profiles. No live supplier offers are enabled in Task 004.
- Do not add bill uploads, account identifiers, addresses, or provider quote lookups that transmit household information.
- Keep official JSON (`data/`), the consumer boundary (`src/data/`), domain models (`src/domain/`), Node tools (`tools/`), translations and UI separate. Never import Node data tools or raw records into browser code.
- Never invent a real tariff, saving, ranking, endorsement, or verification claim. A publishable price requires an official provider URL, verification date, and a reviewed screenshot reference. The initial tariff catalogue is deliberately empty.
- Treat screenshots as official public-source evidence, never bills. Store artifacts under ignored `.local-data/`; redistribution needs recorded permission and an independent rights review. Read `docs/data-policy.md` and `docs/electricity-data.md` before changing the model.
- Use exclusive creation for evidence, records and reviews. Preserve history; no overwrite or automatic verification. Reviews bind actual record/evidence hashes. Synthetic fixtures belong only in tests/examples and are refused by production import.
- Respect terms as well as robots policies. Mercury scraping is prohibited and no retailer automation is enabled in v0.2. Never use quotes, CAPTCHAs, login, addresses or ICPs to obtain prices. Record unavailable data honestly.
- Prefer accessible native elements, visible keyboard focus, plain language, and responsive layouts. Keep both document language and metadata accurate.
- Run `npm run check`, `npm run build`, and `npm run test:e2e` for changes affecting calculation, privacy, or interactions. Report unavailable checks honestly. Do not weaken failing checks to make them pass.
- Do not deploy, purchase services, add paid dependencies, or introduce tracking. Hosting is outside the initial task.
- Make focused, incremental changes. Preserve existing work. Do not create commits or publish externally unless asked.
