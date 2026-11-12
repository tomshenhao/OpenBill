# OpenBill product vision

**Less on bills. More for life.**

**让账单更轻，让生活更自由。**

OpenBill is a free, open-source, privacy-first household expense project, initially
serving New Zealand. It aims to help ordinary households understand recurring
costs, identify unnecessary spending, explore suitable options and make informed
decisions. Electricity is the first working tool, not the limit of the product.
This is a public-interest, non-profit-oriented mission, not a claim of registered
charitable status.

## Values and current reality

- Free and open source, without advertising or supplier commissions.
- Independent and focused on consumers, with no paid placement or invented savings.
- Official, traceable information, independent verification and transparent limits.
- Household calculations remain local; no bill uploads, tracking or OpenBill accounts.
- Gradual development based on practical needs and community participation.
- Simple bilingual interfaces accessible to ordinary internet users.

Current functionality is the English/Simplified Chinese site and browser-only
electricity usage average. The v0.2 official-data foundation is implemented and
tested, including manual import, evidence, validation and review tools. It contains
no verified tariffs and enables no consumer comparison. All other categories,
plan comparisons and cost optimisation are planned. Roadmap completion describes
the named work, not a published GitHub release or permission to publish local work.

## Six core categories

| Category | Planned scope beyond current functionality |
| --- | --- |
| Electricity | Plans/tariffs; fixed daily and usage charges; time-of-use; provider comparison; usage and cost optimisation. Only the usage average is available now. |
| Water | Consumption, fixed/variable charges, regional authorities, leak guidance and water-saving recommendations. |
| Mortgage | Interest rates, fixed/floating options, repayment scenarios, fees/cashback conditions, refinancing/break costs and long-term interest. |
| Insurance | Home, contents, vehicle, health and other household cover; premiums, excesses, coverage differences, exclusions, eligibility and cost-versus-cover analysis. |
| Broadband | Monthly costs, connection/speed, contracts, introductory/standard rates, installation and total cost over time. |
| Mobile | Prepaid/monthly plans, data/calls/messages, family/group plans, coverage and total recurring costs. |

Only electricity has an implemented route and calculator. Other core cards say
“Coming soon / 即将推出” and have no fake buttons or comparison pages. There are no
promised launch dates. Mortgage and insurance need their own independently reviewed
methods and suitability/coverage context; cheapest price alone is not the product goal.

## Nine longer-term categories

| Category | Planned scope |
| --- | --- |
| Gas & LPG | Piped/bottled gas, fixed/usage/delivery costs, suppliers and economically justified electrification scenarios. |
| Council rates | Regional rates, payment arrangements and applicable rebates/relief; not a fictional provider-switching market. |
| Rent | Housing costs, affordability and relevant tenancy expense considerations. |
| Transport & vehicles | Registration, WoF, road user charges, fuel/public charging, servicing/maintenance and annual ownership costs. |
| Waste & recycling | Council/private collection, disposal and recycling fees. |
| Subscriptions & memberships | Streaming, music, cloud/software, memberships and unused/duplicated recurring services. |
| Education & childcare | Childcare, after-school/holiday programmes, recurring education expenses and applicable public subsidies. |
| Healthcare & dental | Regular care, dental, prescriptions, assistance/eligibility and practical recurring-cost analysis. |
| Groceries & essentials | Supermarket shopping, unit prices, basket comparisons, essentials and food-budget optimisation. |

These are ideas, not implemented services. The homepage reveals them progressively
inside a native expandable list rather than making 15 equal product promises.
Where switching is impossible or unhelpful, future tools should explore consumption,
payment options, eligible assistance or unnecessary recurring costs. Do not turn
that scope into unsupported advice about current legal, financial or medical rules.

## Lightweight category framework

`src/domain/categories.ts` owns stable product IDs. `src/config/categories.ts`
defines each category's group, icon, genuine status, implemented locale routes,
supported features, future scope, applicable source types, category-specific
calculation module (or null), and expense ownership/exclusions. Names and short
descriptions resolve by ID in `src/i18n/product-en.ts` and `product-zh.ts`.

The configuration describes capabilities; it does not dynamically import a
universal calculator. Each implemented category owns its domain model, validation,
evidence rules and calculations. Shared provenance stays reusable. The v0.2
electricity evidence schemas are unchanged: adding a product idea does not
automatically add a supported tariff category or source adapter.

`src/config/roadmap.ts` is the milestone status source of truth. It supports
completed, in-progress and planned; do not mark work in progress before it starts.
The homepage reads it directly. `node scripts/roadmap.ts` regenerates the bilingual
[ROADMAP.md](../ROADMAP.md); tests and `--check` detect document drift. Do not add
invented dates, percentages, savings statistics or release claims.

## Avoid counting an expense twice

The `accounting` metadata records design boundaries; no household budget aggregator
has been built. A future one must assign each actual billed cost once and show
cross-category references without adding them a second time:

- Vehicle insurance belongs to insurance, not an additional transport total.
- Home EV charging stays in electricity; public charging belongs to transport.
- Waste/water already included in council rates stay there. Only separately billed
  waste/water become additional category amounts.
- Mortgage interest already included in repayments is an explanatory metric, not
  an extra expense. Keep home insurance and rates separate from repayments.
- Healthcare premiums belong to insurance; healthcare/dental show out-of-pocket costs.
- Allocate a broadband/mobile bundle once; do not sum its full price in both tools.
- Do not reclassify broadband, mobile or insurance as extra subscriptions.
- Net childcare/health costs must not count a subsidy already deducted twice.

Multiple categories may be relevant to a decision, but that does not create
multiple charges. A new category needs an explicit ownership boundary before any
future total-cost feature can consume it.

## Community and delivery sequence

The existing [public GitHub Issues page](https://github.com/tomshenhao/OpenBill/issues)
was reachable with HTTP 200 on 13 November 2026 (New Zealand time). The homepage
links to that page, not an unpublished template URL. Posting requires a GitHub
account; contributions are public and governed by GitHub's own service policies.
The new bilingual idea template remains local until approved changes are published.

Ask for general needs and practical value, never household bills, account numbers,
addresses or personal financial histories. Do not attach calculator state to an
issue URL, prefill it in GitHub, or add a feedback backend/tracker.

Next, secure permitted official electricity rate cards, independent review and
validated coverage/calculations. Then introduce additional core categories one at
a time, based on community needs, evidence availability, privacy and usefulness.
The wider categories follow the same process, not an invented fixed schedule.

To propose/add a category:

1. Discuss a general need through Issues without private examples or uploaded bills.
2. Define the useful outcome, evidence rights, source availability and privacy boundary.
3. Add its ID, bilingual copy, scope, source types and expense ownership. Keep routes
   and calculation null and supported features empty until genuinely implemented.
4. Build its own model/calculation with synthetic tests and independent domain review.
5. Add an accessible bilingual interface only when it works, update the typed roadmap,
   regenerate ROADMAP.md and run the full checks. Publication still requires approval.

Success means demonstrated practical household value, including real savings where
supported by evidence. It is not advertising revenue, accounts or feature count.
That goal does not authorise collecting bills or personal savings histories to
measure impact; use auditable calculations, independent review and general feedback.
