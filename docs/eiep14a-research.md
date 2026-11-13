# EIEP14A research and local import / 研究与本地导入

Research checked 13 November 2026 NZ time. No requests, emails, registration,
retailer scraping, consumer-data access or personal information were submitted.

## Official access / 官方获取途径

The Authority's [consumer data page](https://www.ea.govt.nz/industry/consumer-data/)
distinguishes general product information from private consumption data. The
[product request procedures](https://www.ea.govt.nz/documents/9748/Requests_for_retailer_product_information_-_Procedures.pdf)
describe requests by any person via retailer contact channels, generally a response
within five business days and ordinarily no fee. Other delivery arrangements may
be mutually agreed. Current and still-active legacy products are relevant; legacy
does not imply open to new customers. This is a product-information route, not a
right to retrieve individual household usage.

Direct one-off contact does not require building a registry integration first.
The EIE transfer route has separate Authority approval, agreement, participant
identifier and SFTP access requirements. A private-consumption workflow has consumer
authorisation requirements. Neither path has been registered or activated here.
No blanket promise of operational support from a particular retailer is made.

| Retailer | Task 004 status |
| --- | --- |
| Mercury | No EIEP14A request sent or file received. Existing website-automation prohibition retained. |
| Contact Energy | No request sent; standardised delivery/coverage not operationally confirmed. |
| Genesis Energy | No request sent; standardised delivery/coverage not operationally confirmed. |
| Meridian Energy | No request sent; standardised delivery/coverage not operationally confirmed. |
| Electric Kiwi | No request sent; standardised delivery and redistribution permission unconfirmed. |
| 2degrees | No request sent; standardised delivery/bundle eligibility unconfirmed. |

The protocol establishes a format; it does not prove that a specific retailer has
supplied a usable file to OpenBill. The next approved pilot should ask for the
complete generally available electricity product file, version, update process,
legacy/new-customer flags, all regions/meters/conditions and written redistribution
terms, without including any household identifiers. Do not send it automatically.

任何人可通过零售商渠道请求一般产品信息，通常应在五个工作日内回复；与取得私人用电数据不同。
一次性联系无需先建立注册系统接口，EIE 传输则有单独批准及技术接入要求。六家零售商均未联系，
不能宣称已证实各家的实际格式、覆盖范围或再发布许可。下一步试点请求须事先获批。

## Specification / 格式与范围

Use the Authority's [EIEP index](https://www.ea.govt.nz/industry/retail/eieps/),
[current EIEP14A v1.1 PDF](https://www.ea.govt.nz/documents/9797/EIEP14A.pdf) and
[30 October amendment notice](https://www.ea.govt.nz/news/general-news/minor-amendments-to-eiep14a/).
The cover says effective 30 October 2026; amendments extend field lengths. Some
body/appendix version labels and example field aliases are inconsistent. The
appendix includes an invalid example date. The index's 14A procedures link pointed
to a 14B/14C document during research; use the product-procedures link above.
Prefer normative field tables over ambiguous illustrative examples, and obtain
retailer clarification rather than silently repairing ambiguous production files.

The normative hierarchy is root → Retailers → CustomerGroups → Plans → Tariffs,
with per-retailer Attributes, Schedules, TariffTypes and TariffRegions/Networks.
References preserve billing registers/availability, schedule/DST, network-specific
price/loss categories, eligibility and inherited conditions. Plan start/end/close
dates have different meanings. Rates are GST-exclusive dollars per stated unit
(with special structures such as spot percentages) and discounts are separate.
Omitted network restrictions do not justify guessing a consumer region or meter.

OpenBill implements a **limited normative JSON v1.1 subset**, not full EIEP
certification. It requires an explicit PRCSCHD/electricity/initial-file header
and timestamp, although the protocol permits some JSON header omissions. CSV,
full/partial replacement files (R/X), legacy example aliases and other versions are
rejected for manual handling. Unknown field names (including ICP/consumption fields)
are rejected. Field names and reference comparisons are case insensitive; colliding
or duplicate JSON keys are rejected before values can be discarded.

Validation checks lengths, rates/units' structure, real dates, references, unique
IDs/scopes, counts, times and source chronology. Arbitrary unit and attribute strings
allowed by the extensible protocol are **preserved, never interpreted as supported**.
Seasonal/holiday/fixed-UTC+12 schedules, loss adjustments, bundled services, fees,
discounts, eligibility and overlapping or conditional rates all remain unresolved
at this candidate stage. No production tariff is auto-created.

采用规范字段表的 JSON v1.1 子集，并非完整标准认证。保留地区、电网、分类、时段、夏令时和继承条件。
未税费率不能直接当作含税报价。只处理明确的初始文件；全部或部分替换文件、CSV、旧示例别名及其他版本需人工处理。
引用、重复字段、日期和金额错误会被拒绝；未知计费单位或条件即使结构有效，也不会自动转成可比价格。

## Reproduce the import / 复现导入

No network access is used by this command:

```sh
npm run data:eiep14a -- tests/fixtures/eiep14a-request.json
```

This uses the explicitly **SYNTHETIC TEST ONLY** JSON in `tests/fixtures/`.
It archives original bytes and a candidate under ignored
`.local-data/imports/eiep14a/synthetic/<source-sha256>/`. Exclusive creation prevents
overwriting. Repeating the same import fails rather than rewriting history.
The source hash is a file revision; metadata records official URL, receipt reference,
collector/time and source version. The synthetic example URL is reserved `.example`;
it is not a real retailer source. It can never pass production publication.

For a permitted real receipt, create a **local** request JSON with the same keys,
`dataKind: "official"`, the actual retailer ID, official product-information page
URL, file path, actual UTC collection timestamp, collector and a nonpersonal
receipt reference. Do not archive an email containing addresses/signatures or a
personal bill. An operator's source assertion is not independent proof of origin.
Do not copy fixtures into `data/electricity/records/` or change labels to publish them.

The candidate has `pending-verification`, `comparisonEligible: false`, GST exclusive,
`local-only` rights and no screenshot hash. It retains the complete normalised product
structure and unresolved steps. Interpretation, screenshot capture (where permitted)
and approved public source registration feed the existing [evidence/manual import
and independent review workflow](electricity-data.md). Missing screenshots continue
to block verification. Each record's provenance must bind the actual archived
source, screenshot, manifest and revision hashes; schema success alone never suffices.

命令仅在本地读取明确标注的合成文件，原件及候选记录按内容哈希归档，不覆盖旧文件。
真实回执需使用真实来源和时间，去除邮件中的个人信息，仍保持待核实状态。结构校验不等于验证来源、
价格或再发布权；缺少截图继续阻止核实。之后需人工映射至原有不可变记录，并独立复核。

## Rights, updates and connection lookup / 权利、更新与连接查询

Access under the product-request rules does **not establish a redistribution
licence**. No general open licence for retailer product data or screenshots was
established by this research. Record explicit retailer permission/licence and an
independent rights review before publication. Attribute actual owners, comply with
the granted terms and keep restricted originals local. Authority publication of a
format does not license a retailer's response. Do not assume ordinary website-use
permission applies to automated collection or screenshot redistribution.

No live update subscription is configured. Agree a permitted update/re-request
process with the retailer; archive each receipt by hash, track effective/close dates,
link superseding records, and re-review changed prices/conditions. The project’s
30-day freshness gate is a conservative local policy, not a statutory guarantee.

[Your Meter](https://www.ea.govt.nz/your-power/your-meter/address/) identifies an
electricity connection, retailer and meter context, not an account's complete bill
or usage. Its bulk interface requires subscription/key access. No interface approval,
API key, consent flow, household lookup or ICP input has been introduced.

The [regional power-price dashboard](https://www.ea.govt.nz/data-and-insights/charts-and-dashboards/regional-power-prices/)
contains aggregate prices/bills, not applicable supplier offers. The requested
[annual residential report](https://www.emi.ea.govt.nz/Retail/Reports/ZSZG4D) gives
annual context. Task 004 instead pins the matching [monthly report](https://www.emi.ea.govt.nz/Retail/Reports/0YUCE0)
for month-to-month benchmarking. Neither aggregate series can verify a retail tariff.

可获取信息不等于有权公开再发布；零售商数据和截图均须单独明确许可及独立权利审查。
更新需约定合法方式，按版本归档、处理有效期及被替代记录，不能自动沿用旧复核结果。
ICP 仅标识供电连接，不能揭示完整账单或用量；未启用查询。官方地区价格及年度报告是汇总数据，
不能作为具体供应商报价。本次基准采用同月份的官方用电量报告。
