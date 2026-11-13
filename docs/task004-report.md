# Task 004 implementation report / 实现报告

Work is on `feature/task004-electricity-analysis`, based on fetched `origin/main`
(`633b93c`). Nothing has been committed, pushed or deployed. No retailer request,
email, registration or paid dependency was introduced.

## Outcome / 结果

The original bilingual homepage, usage calculator and 15-category roadmap remain.
`/electricity/` and `/zh/electricity/` add browser-only bill analysis, matching
official monthly regional usage context and a small contextual advice list.
Verified supplier offers, recommendations and switching savings remain unavailable.
Both supplier catalogues contain **zero** tariffs; no synthetic offer reaches the site.

原有双语主页、用电量计算和 15 类规划保留。新增电费分析、同期官方地区用电对照及少量相关建议。
真实供应商报价仍为零，无虚构价格、排名或节省额，未提交、推送或部署代码。

## Architecture and records / 架构与数据

React state → pure bill/benchmark/advice functions → local results. Household inputs
never enter Node tools, files, network requests or persistent storage. Static JSON
holds only official public aggregates and the empty consumer tariff bundle.

The existing tariff/provenance/review schemas and archive gates remain in force.
The new comparison bundle carries a tariff, its raw-record SHA-256, stored independent
review and a record-bound rights receipt. Offline publication validation binds it
to the full existing archive/history/verification gates and permission reference.
The runtime engine rechecks freshness and exact applicability, uses one measured
annual profile and integer money, and excludes unsupported pricing/conditions.
Full TOU needs complete half-hour measurements and Auckland/DST interpretation;
controlled registers need separate totals. A verified current-plan scenario is
required to calculate a difference. Consumer profile entry/table UI stays gated
pending independently reviewed real coverage.

The official benchmark snapshot has **320 observations**, 16 regions × 20 months
(2025-01 through 2026-08), from [EMI residential consumption trends](https://www.emi.ea.govt.nz/Retail/Reports/0YUCE0).
Its original CSV has SHA-256
`d2a434b10e164ab2679ee0791750c3f40a21eebb74987031e57ff1dd5e4fa347`.
The public aggregate source is retained under the applicable Authority CC BY 4.0
policy with attribution; original CSV line endings are preserved. Example observation:
Northland, January 2025, mean **461 kWh/ICP/month**, sample coverage **91.74%**.
This is a real official aggregate, not a supplier price or a typical-usage assumption.
The metadata explicitly says source checked, independent review pending.

`tests/fixtures/eiep14a.json` is the **synthetic-only** product example. The limited
normative JSON v1.1 adapter validates and preserves structure and archives original
bytes/candidates under ignored `.local-data/imports/eiep14a/<retailer>/<sha256>/`.
Candidates are pending, GST-exclusive, local-only and ineligible. No screenshot
exists for the synthetic product; missing screenshots block subsequent verification.
The existing permission-gated Playwright evidence workflow is unchanged. Benchmark
CSV reproduction does not require redistributing copyrighted page screenshots.

家庭输入仅在浏览器内存中。官方汇总数据与私人输入、界面及计算逻辑分离。原有电价审核和证据规则未放宽。
比价引擎要求精确适用范围、同一实测年度用量、当前独立复核及再发布许可。分时和受控用量不作猜测。
EIEP14A 示例明确为合成数据，仅产生本地待审核候选，不自动变成正式电价。

## Files / 文件

| Area | Created or modified |
| --- | --- |
| UI/routes | `src/components/electricity-analysis.tsx`, `src/app/[[...locale]]/{page,layout}.tsx`, `src/app/globals.css` |
| Pure domain | `src/domain/electricity/{bill,benchmark,comparison,tips}.ts`; shared `money.ts` comment updated |
| Consumer data | `src/data/electricity/analysis-data.ts`, `data/electricity/comparison-plans.json`, `data/electricity/benchmarks/regional-monthly.json`, original CSV under `benchmarks/source/` |
| Offline tools | `tools/electricity/{benchmark-import,comparison-publication,csv,eiep14a-import}.ts`, `tools/electricity/adapters/eiep14a.ts` |
| Copy/config | `src/i18n/electricity-{en,zh}.ts`, dictionaries/index, `src/config/{categories,roadmap}.ts`, generated `ROADMAP.md` |
| Unit tests | New bill, benchmark, comparison, tips and EIEP14A suites; existing evidence/publication, product-config and project-boundary suites extended |
| Browser/fixtures | `tests/e2e/electricity-analysis.spec.ts`, category-navigation regression updated; `tests/fixtures/eiep14a*.json` |
| Documentation | `README.md`, `AGENTS.md`, architecture, data policy, product vision; new Task 004 feature/research/report documents |
| Tooling | `package.json` commands, `.gitattributes` original-CSV preservation; Next's generated `next-env.d.ts` production references |

No package dependencies or lockfile entries changed. Research PDFs/HTML, candidate
archives and synthetic visual-QA screenshots are ignored local artifacts.

## Validation / 验证

| Check | Final result |
| --- | --- |
| `npm run check` | Passed: lint, TypeScript, 181 unit tests, original archive checks, benchmark reproduction and publication validation |
| `npm run lint` / `npm run test` | Also invoked individually; final successful versions included in `check` |
| `npm run build` | Passed; four static home/electricity locale paths, plus framework 404/icon |
| `npm run test:e2e` | 36 passed on desktop/mobile Chromium, both languages |
| Benchmark | 320/320 observations reproduced, no data issues |
| Supplier/publication validation | 0 records, 0 eligible, 0 published, no issues |
| Synthetic EIEP14A CLI demo | Passed; local candidate archived, no production tariff created |
| Visual review | English/Chinese desktop (1440 px) and mobile (390 px) screenshots inspected; 320 px overflow checks also passed |
| Accessibility/privacy | Axe checks passed; no input-triggered requests/logs/cookies/web storage/IndexedDB, no URL leakage, language change/clear reset inputs |

The sandbox initially blocked test-worker spawning (`EPERM`); authorised local
process execution completed the checks. Tests found and prompted fixes for a
publication clock mismatch and invalid result definition-list markup. Browser
selectors were narrowed to avoid matching Next's separate route announcer and
multiple subtotal groups. Verification rules and assertions were retained.

最终 181 项单元测试、36 项双语桌面／移动端浏览器测试全部通过。修复了审核时钟传递和结果列表语义问题，
并完成视觉检查。官方基准 320 条可复现，生产电价目录仍为零，未放宽验证或隐私规则。

## Local commands and next steps / 本地命令与下一步

```sh
npm ci
npm run dev
npm run check
npm run build
npm run test:e2e
npm run benchmark:validate
npm run comparison:validate
npm run data:eiep14a -- tests/fixtures/eiep14a-request.json
node scripts/roadmap.ts
```

The synthetic import command uses exclusive creation: it succeeds once per local
source hash and then refuses overwrite. Do not delete evidence merely to rerun a
demo. The task also ran `git fetch origin main`, created the feature branch from
that fetched main, regenerated ROADMAP.md and ran `git diff --check`.

Known limits: only exact full-month benchmark matches; all household sizes together;
no percentiles; independent benchmark review pending; no automatic retailer data
acquisition or ICP lookup; limited EIEP14A JSON subset; unsupported discounts/terms,
eligibility and tariff structures excluded; no actual consumer supplier comparison.
Screen-reader, wider-browser and native-language community reviews remain useful.

Next: independently review the aggregate source and formulas, approve one retailer
product-information pilot request, establish data/screenshot redistribution terms,
map one complete permitted regional file with screenshot evidence and independent
reviews, then validate real profile coverage and implement the consumer comparison
entry/table together. See [feature guide](task004-electricity.md) and
[EIEP14A research](eiep14a-research.md) for full English/Chinese procedures.

下一步先独立核对汇总来源和计算方法；获批后向一家零售商试点请求产品文件，明确数据和截图再发布权，
完成人工映射、截图及双人审核，再开展真实用量范围验证和消费端比较表。暂不提供百分位、同人数家庭排名、
自动 ICP 查询或未验证的节省额。
