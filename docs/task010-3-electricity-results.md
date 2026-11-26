# Task 010.3 · Electricity bill results and savings

The English and Simplified Chinese electricity pages have two sections.
**Understand your bill** displays the amount charged, arithmetic status and
charge breakdown as soon as a supported PDF is read. PDF editing starts
collapsed. Manual entry uses the same summary and updates it as values change.

Arithmetic can match automatically when the reconstructed electricity charges
reconcile within one cent of the supplied total and the printed amounts agree.
The result also distinguishes a difference, insufficient information, and
charges that need review. Remaining parsing concerns are shown separately.
Contract terms and the applied tariff need their own evidence.

**Ways to save** shows fixed and usage shares, daily usage and cost, and
illustrative 5%, 10% and 20% usage reductions using usable rates. Fixed charges
remain in each scenario. Property context is optional and is selected by the
user. Manual alternatives have their own disclosure. The official comparison
continues to use the existing eligibility, independent review and publication
gates, and the empty catalogue displays a pending notice.

Regional household means and percentile ratings are paused in the interface.
The archived Electricity Authority datasets, original source bytes, research,
and validation remain available in the repository.

Both previously supplied private invoices were checked in the local production
build. Each showed the expected charges and automatic arithmetic match, with
focus on the summary and the editor collapsed. The checks recorded only
pass/fail flags and observed local static asset requests and empty browser
storage.

The production build, lint, TypeScript, data validation, 360 unit tests,
108 production browser tests and four development browser tests passed.
The browser suites cover bilingual keyboard access, automatic PDF results,
manual calculations, regional UI absence and private input handling.
