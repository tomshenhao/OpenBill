# Task 004 · Electricity analysis / 电费分析

## Run locally / 本地运行

Use Node 24.14.x (the supported Node 24 line) and the existing lockfile:

```sh
npm ci
npm run dev
# http://127.0.0.1:3000/electricity/
# http://127.0.0.1:3000/zh/electricity/
npm run check
npm run build
npm run test:e2e
```

`npm run check` includes lint, TypeScript, unit tests, v0.2 archive validation,
benchmark reproduction and consumer-publication checks. `npm run lint` and
`npm run test` also work separately. Browser QA requires the existing Playwright
Chromium installation; on a new workstation use `npx playwright install chromium`.
`npm start` serves the static `out/` build on loopback. No deployment is performed.

使用现有锁文件及 Node 24；上述命令分别启动本地网站、检查代码与数据、构建静态网站和运行浏览器测试。
英文入口 `/electricity/`，中文入口 `/zh/electricity/`。不会部署或调用付费服务。

## What works / 已实现

- Your Bill / 您的电费账单: days, kWh and period total; daily usage/spend,
  blended cost including fixed charges, optional flat-rate component reconciliation.
  Optional meter context and measured, non-overlapping peak/off-peak/controlled
  totals can be entered and reconciled; these labels never establish another plan's
  usage profile or eligibility.
- Your Usage / 您的用电水平: exact regional/calendar-month matches to an official
  EMI snapshot, mean differences and an accessible bar chart.
- Saving Tips / 省电建议: at most three practical suggestions selected from manual
  household context, with official references and conditions.
- Pure comparison engine tested against **synthetic** flat, controlled and TOU
  profiles. No actual supplier offers, rankings, switching savings or comparison
  table are enabled. The consumer profile-entry/table UI remains gated until a
  real, permitted pilot dataset and its comparison coverage are independently reviewed.
- Offline EIEP14A JSON validation/local candidate archive. See [research and import
  guide](eiep14a-research.md); no retailer requests or registrations have been sent.

主页、原有两项用电量计算和 15 类开支规划保留。新增三部分体验可独立于供应商比价使用。
比价引擎已用合成数据测试，但未开放真实报价、排名或节省额；完整分时用量录入和比较表仍待真实数据验证后开放。

## Numeric rules / 计算规则

`src/domain/electricity/bill.ts` validates whole billing days 1–366, non-negative
kWh with up to three decimals (maximum 100,000), and period NZD totals with at most
two decimals. Commas, exponent notation, negative totals and export-credit/net
negative bills are unsupported. The bounds are input guardrails, not typical usage.

Daily kWh = kWh / days. Daily spending = GST-inclusive period spending / days.
Blended cents/kWh = full period spending × 100 / kWh; at zero kWh it is unavailable.
It includes every fixed charge, fee and credit already in that total, and is **not**
a marginal usage tariff. Do not enter previous balances, gas, broadband or repayments.

Rates use integer micro-NZD and quantities use milli-kWh. Component charges sum in
nano-NZD and round half up once to cents. Optional usage rates entered in cents/kWh
convert explicitly to NZD/kWh. Each component's inclusive/exclusive GST selection is
separate. The NZ standard 15% GST is applied once to exclusive amounts ([IRD](https://www.ird.govt.nz/gst/what-gst-is)).
The fixed-plus-usage subtotal is diagnostic and is **never added** to the entered bill
total. The residual can include levies, fees, discounts or credits; OpenBill does not
guess their composition or apply an additional generic levy. This check is hidden
when the user indicates peak/off-peak pricing.

Annualised usage = daily average × 365 and carries a seasonal warning. Annual spending
is shown only for a confirmed representative 365–366-day bill, normalised to 365 days.
One-off adjustments/export rebates must be excluded. This retrospective guide is
not a future price guarantee or a supplier-switching baseline.

含税、未税金额分别处理，只有未税项加一次 15% GST。固定费加用电费仅用于核对，不会重复加入总额。
综合每度电成本包含固定费等，不是套餐用电费率。短账期只年化用电量并提示季节局限，不能推算可靠年度花费。
全年花费需用户确认，并统一折合 365 天；不作为换套餐节省的依据。

## Official benchmark / 官方用电基准

`data/electricity/benchmarks/source/emi-2025-01-2026-08.csv` preserves the original
downloaded bytes (Git line-ending conversion disabled). `regional-monthly.json`
contains 320 observations: 16 regions × 20 months, January 2025–August 2026.
The [official EMI report](https://www.emi.ea.govt.nz/Retail/Reports/0YUCE0) and exact
download URL, collection/check timestamp, SHA-256, units, population, geographic
definition, sample coverage, licence and caveats are included in JSON and the UI.
It is an **official-source-checked aggregate, not independently reviewed tariff data**.

The Authority's [copyright policy](https://www.ea.govt.nz/copyright-disclaimer-transparency/)
licenses applicable Authority material under CC BY 4.0; the EMI footer links there.
The original aggregate CSV is attributed to Electricity Authority (New Zealand).
OpenBill extracts only mean usage and coverage; source quantiles are retained only
inside the original CSV. Logos, page artwork and third-party screenshots are not
redistributed. Source screenshots/PDF research remain ignored local files.

Comparison requires the **same year, month, region and full calendar-month day
count**, explicitly confirmed by the user. There is no annual-mean, last-year or
nearest-month fallback. `difference = kWh - mean`; `percent = difference / mean × 100`.
This is a difference from a mean, never a percentile rank. Household size is optional
context only; neither it nor heating answers alter the mean. Chatham Islands and
other uncovered periods have no result. No scaling a 30-day bill to a 31-day mean.

These are residential **connections (ICPs)**, including holiday homes, rather than
matched occupied households. The source cleans extreme/non-residential observations
and smooths data. It omits self-consumed solar and is not temperature adjusted;
coverage and means can be revised. See the JSON/UI for exclusions and 2013 regional
boundaries. High usage can reflect essential health, comfort or occupancy needs.

```sh
npm run benchmark:validate
```

This reproduces JSON from the stored CSV and checks for drift. The importer is pinned
to this reviewed scope; an update needs a **new versioned source file**, actual new
collection timestamp, scope/licence/column review and code/metadata changes. Never
overwrite an old source or merely change dates to make an old snapshot look current.

基准来自电力管理局 EMI 原始 CSV，共 320 条真实汇总观测。仅对照同地区、同年同月的完整自然月。
数据涵盖所有家庭人数及度假住宅，不是同人数家庭样本，不能推算个人百分位。取电量不含自用太阳能，
未作温度调整，且来源作了异常值排除和平滑。每条结果显示覆盖率；偏高并不代表浪费。
更新时保留旧版本、核对许可与字段，并记录实际采集时间，不自动用新月份替换缺失月份。

## Guarded comparison engine / 比价引擎边界

`src/domain/electricity/comparison.ts` accepts a trusted, build-time bundle carrying
immutable tariffs, full independent reviews, record hashes and rights-review receipts.
`data/electricity/comparison-plans.json` is deliberately empty, as is the older
`published.json`. Browser code cannot import raw records, reviews or Node tools.

Publication validation checks the existing repository's complete evidence/history
gates, exact raw-record hash, archived source/screenshot, latest review, recorded
redistribution permission and independent rights reviewer. A receipt is not a
cryptographic signature: the trust boundary is the reviewed repository/build.
`npm run comparison:validate` rechecks it. `npm run comparison:stage -- <local-bundle.json>`
writes a new candidate under ignored `.local-data/publication/`, never a public file.
Publishing/committing still requires approval. Archive rights approval and this
tariff-data receipt do not automatically approve screenshot publication; that retains
the existing separate screenshot rights workflow.

Only official, independently verified, current records captured/reviewed within
30 days qualify. Exact region/network/meter/register/user-category matches are
required. Unknown conditions, GST-exclusive records, tiered/spot structures,
unresolved discounts, residence/consumption eligibility and non-zero/unknown term
or exit-fee conditions are excluded. These conservative limits are not silently
converted into zero-cost assumptions. Existing v0.2 gates remain intact.

All plans cost the **same measured representative calendar-year profile**, using
365/366 actual days and all daily/usage components. Fixed levies already listed as
components are included once. Flat controlled registers require separate measured
totals. TOU requires a complete contiguous half-hour measurement for every register
and the entire year, with matching register sums. Auckland local weekday/time and
DST determine the applicable band. Missing, duplicate or ambiguous intervals fail
closed. No inferred peak shares or arbitrary plan-specific allocations are accepted.

The result is a rate-held-constant annual scenario at today's applicable rates,
not a promise those rates persist. Differences appear only when a user-confirmed
current record is itself eligible and costed on the identical profile. A short
bill, blended rate, historic yearly spend or lower usage is never a switching
baseline. Before connecting live offers, independently validate full costs and
eligibility, expose restrictions/source/review date and implement/review the
consumer profile-entry and results table together.

仅当前适用、独立核实、30 天内采集及复核、许可明确的数据可进入比价。地区、电网、电表、分类用量及资格
必须精确匹配。不支持的折扣、合约、税务或收费结构直接排除，不能假设为零。分时电价必须有完整全年半小时
实测数据，并按新西兰时区及夏令时计价。所有套餐使用相同用量情景。当前套餐也须同等可靠，才计算差额。
真实消费端比较表和完整用量录入尚未开放；应与首批经独立验证的数据一起审查上线。

## Privacy and next steps / 隐私与下一步

Inputs live in component memory only. No upload, ICP lookup, address, account
identifier, cookies, storage, logs, telemetry, server action, network request or
external link parameter carries household information. Static official datasets
are public and unrelated to the private input state. Results use the last submitted
snapshot; clear, reload or language navigation removes it. Browser tests assert
no requests/logs/storage while interacting, plus bilingual accessibility/mobile layout.

Next: an independent benchmark/source review; an approved EIEP14A pilot request and
retailer rights clarification; reviewed mapping of one full regional product file;
current screenshot evidence; two-person verification; then consumer profile-entry
and a small real comparison pilot. Size-specific peers and percentiles need a suitable
licensed distribution, never extrapolation from a mean.

输入仅在当前标签页内存中，清空、刷新或切换语言会消失。无 ICP 查询、上传、账号、追踪或外传。
下一步先独立复核基准，经批准向一家零售商请求 EIEP14A 并明确再发布权，补齐截图、地域与资格条件，
双人复核后开展小规模真实比价试点。同人数家庭和百分位功能仍需可靠且许可明确的分布数据。
