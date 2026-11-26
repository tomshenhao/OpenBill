# OpenBill roadmap / 开发路线图

**Less on bills. More for life.**

**让账单更轻，让生活更自由。**

Completed records software built and tested in this repository. Data review and public release have separate approval steps. Plans depend on evidence and community needs.

“已完成”表示软件已在本仓库实现并经过测试。数据审核和公开发布各有审批流程。后续计划取决于可靠信息和社区需求。

Status key / 状态说明: Completed / 已完成 · In progress / 进行中 · Planned / 计划中.
The status key describes possible states; a phase is not marked in progress until work actually starts.
状态说明列出可用状态；只有实际开始的阶段才会标记为“进行中”。

## Development milestones / 开发阶段

| Milestone / 阶段 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
| [v0.1 · Bilingual website & usage calculator](README.md)<br>v0.1 · 双语网站与用电量计算 | Completed / 已完成 | English and Simplified Chinese pages, plus a local electricity usage check with no bill uploads.<br>提供英文和简体中文页面，以及无需上传账单、在本地运行的用电量计算。 |
| [v0.2 · Official electricity data foundation](docs/electricity-data.md)<br>v0.2 · 官方电价数据基础设施 | Completed / 已完成 | Evidence archiving, validation and review tools are built and tested. No verified supplier tariffs or comparisons are available yet.<br>证据归档、数据校验和审核工具已实现并经过测试。目前仍无已核实的供应商电价，也未提供比价。 |
| [Electricity usage & bill analysis](docs/task005-2-input-journey.md)<br>用电量与电费分析 | Completed / 已完成 | Implemented usage and bill calculations and archived published regional thresholds. Household comparisons are paused while more representative evidence is sought.<br>已实现用电与电费计算，并归档已公布的地区阈值。家庭用电对照暂时停用，等待更具代表性的数据。 |
| [Electricity bill review and savings scenarios](docs/task010-electricity-bill-review.md)<br>电费账单核对与节省情景 | Completed / 已完成 | Read recognised digital bill layouts locally, check electricity charges and compare user-entered rates. Savings scenarios account for fixed charges and property use.<br>在本地读取能够识别版式的电子账单，核对电费并比较自行输入的费率。节省情景考虑固定费用和房屋使用情况。 |
| [Electricity comparison framework](docs/task005-report.md)<br>电力套餐比较框架 | Completed / 已完成 | The local EIEP14A importer and comparison framework are built and tested with synthetic data. The production offer catalogue is empty.<br>本地 EIEP14A 导入和比较框架已实现，并用合成数据测试。生产版的供应商报价目录为空。 |
| [Auckland Watercare usage analysis](docs/task006-water.md)<br>奥克兰 Watercare 用水分析 | Completed / 已完成 | Daily usage, a general Auckland reference, practical tips and a bill estimate using manually entered rates.<br>提供日均用水量、奥克兰一般参考范围、实用节水建议，并可按手动输入的费率估算水费。 |
| [NZ mortgage calculator](docs/task007-mortgage.md)<br>新西兰房贷计算器 | Completed / 已完成 | Bilingual repayment estimates, three payment frequencies, interest-only modelling, balance over time and saving tips. Eight bank sources have been researched.<br>双语还款估算、三种还款频率、只付息测算、本金走势和省钱方法。已调研八家银行的官方来源。 |
| [Six independent insurance guides](docs/task009-insurance.md)<br>六类独立保险指南 | Completed / 已完成 | Bilingual guides explain cover, policy terms and practical checks, with New Zealand sources. Calculators and policy comparisons are planned separately.<br>双语指南介绍保障范围、保单条款和核查要点，并提供新西兰资料来源。计算器和保单比较按险种分别规划。 |
| [Verified electricity comparisons](docs/retailer-requests/README.md)<br>经过核实的电力套餐比较 | Planned / 计划中 | Official EIEP14A product data is outstanding. The Genesis, Mercury and Contact requests are recorded as drafts. Confirm outreach, then review coverage, prices and publication rights before enabling comparisons.<br>仍需取得官方 EIEP14A 产品数据。Genesis、Mercury 和 Contact 的请求在仓库中记录为草稿。先确认联系情况，审核覆盖范围、价格和发布权，再开放比价。 |
| [Electricity use by household size](docs/task004-1.md)<br>按家庭人数了解用电量 | Planned / 计划中 | Confirm the status of BRANZ HEEP2 outreach and seek representative monthly usage statistics by household size.<br>确认是否已联系 BRANZ 了解 HEEP2 数据，并寻找有代表性的按家庭人数划分的月度用电统计。 |
| [Watercare rates & household-size evidence](docs/task006-water.md)<br>Watercare 费率与分家庭人数数据 | Planned / 计划中 | Review seven archived tariff schedules independently and seek representative Auckland household-size distributions, including P25, P50, P75 and P95. Automatic rates depend on review.<br>独立审核七份已归档的价目表，并寻找有代表性的奥克兰分家庭人数用水分布，包括 P25、P50、P75 和 P95。完成审核后才能自动应用费率。 |
| [Independently reviewed mortgage rates](docs/task007-mortgage.md)<br>经独立审核的房贷利率 | Planned / 计划中 | Collect permitted official evidence and independently review rates, eligibility, freshness and publication rights.<br>收集获准使用的官方证据，独立审核利率、适用条件、时效性和发布权。 |
| [More core household bills](docs/product-vision.md)<br>逐步覆盖更多核心账单 | Planned / 计划中 | Develop broadband and mobile tools independently, each with its own evidence and calculation rules.<br>分别开发宽带和手机工具。每类开支都有各自的数据依据和计算规则。 |
| [Community-led household tools](docs/product-vision.md)<br>由社区需求推动的家庭工具 | Planned / 计划中 | Prioritise the wider expense categories around practical community needs and reliable information.<br>根据实际需求和可靠信息，确定更多家庭开支类别的开发顺序。 |

## Six core categories / 六类核心账单

Electricity, Auckland water and mortgage tools and six insurance guides are available. Broadband and mobile tools are planned.

本版本提供电费、奥克兰用水和房贷工具，以及六类保险指南。宽带和手机工具仍在规划中。

| Module / 模块 | Status / 状态 | Purpose / 用途 | What works / 可用功能 | Next milestone / 下一阶段 |
| --- | --- | --- | --- | --- |
| Electricity / 电费 | Available in this build / 本版本可用 | Understand what you use, find ways to use less and eventually compare suitable retail plans.<br>了解用电量，找到节电方法，未来可比较适合家庭的零售电力套餐。 | Check charges manually or read recognised digital PDF bills in the browser. Explore ways to save and compare rates you enter.<br>手动核对费用，或在浏览器读取受支持的 PDF 账单。探索省电方法并比较自行输入的费率。 | Find reliable household-size data, starting with BRANZ HEEP2. Plan comparisons need official rates from retailers such as Genesis, Mercury and Contact, independent review and permission to publish.<br>从 BRANZ HEEP2 研究着手寻找可靠的分家庭人数数据。套餐比价需要 Genesis、Mercury、Contact 等零售商的官方费率，并须经过独立审核及取得发布许可。 |
| Water / 水费 | Available in this build / 本版本可用 | Understand water use, look for leaks and check how charges add up.<br>了解用水量，排查漏水，核对水费如何计算。 | Auckland Watercare only. See daily household and per-person use, a general reference of 140–170 litres per person per day, leak checks and saving tips. Estimate water and wastewater charges with rates you enter.<br>仅适用于奥克兰 Watercare。查看全家和人均日用水量、每人每天 140–170 升的一般参考范围、漏水检查和节水建议。输入费率后可估算供水与污水费用。 | Independently review seven archived schedules and seek Auckland usage statistics by household size. The general reference gives no household-size percentiles. Other regions are planned.<br>独立审核七份已归档的价目表，并寻找按家庭人数划分的奥克兰用水统计。一般参考范围无法提供分家庭人数的百分位数据。其他地区仍在规划中。 |
| Mortgage / 房贷 | Available in this build / 本版本可用 | Compare interest rates, repayment costs, refinancing options and fees.<br>比较利率、还款成本、转贷方案及相关费用。 | Estimate repayments and interest locally, compare payment frequencies and explore practical ways to reduce interest. The bank-source directory has no independently reviewed rates yet.<br>在浏览器内估算还款和利息，比较还款频率，并了解减少利息的方法。银行来源目录暂未提供经独立审核的利率。 | Confirm lender conditions, obtain publication permission and independently review mortgage rate records before displaying them.<br>确认银行的适用条件和发布许可，经独立审核后再展示房贷利率。 |
| Insurance / 保险 | Available in this build / 本版本可用 | Understand your cover and review the terms of your policy.<br>了解现有保障，并核对保单条款。 | Six insurance guides, plus manual house policy review and a comparison of quotes you enter.<br>提供六类保险指南，并可手动核对房屋保单、比较自行输入的报价。 | Check evidence and reuse rights for house benchmarks. Build the other tools independently.<br>核实房屋保险基准数据及再使用权限，分别开发其余险种工具。 |
| Broadband / 宽带 | Planned / 计划中 | Compare speed, cost, service availability and contract conditions.<br>比较网速、费用、服务可用性和合约条件。 | —<br>— | Identify official sources for plan terms, typical speeds and service availability.<br>寻找套餐条款、典型网速和服务可用性的官方来源。 |
| Mobile / 手机 | Planned / 计划中 | Find plans that suit your data and calling needs at a reasonable cost.<br>找到满足上网流量和通话需求、费用合理的套餐。 | —<br>— | Identify official sources and define a comparison based on data, calls and recurring cost.<br>寻找官方数据，根据流量、通话和定期费用制定比较方法。 |

## Independent insurance modules / 独立保险模块

| Module / 模块 | Guide / 指南 | Follow-up / 后续任务 | Follow-up scope / 任务范围 |
| --- | --- | --- | --- |
| House Insurance / 房屋保险 | Available in this build / 本版本可用 | 009.1 · Completed / 已完成 | Manual building-cover review and comparison of user-entered house quotes. Indicative ranges and independently reviewed insurer terms remain pending.<br>可手动核对建筑物保障，并比较用户自行输入的房屋保险报价。参考价格区间及经独立审核的保险公司条款仍待开放。 |
| Car Insurance / 汽车保险 | Available in this build / 本版本可用 | 009.2 · Planned / 计划中 | A comparison by cover type, vehicle valuation, driver conditions and excess.<br>按保障类型、车辆估值方式、驾驶人条件及自付额比较保单。 |
| Contents Insurance / 家财保险 | Available in this build / 本版本可用 | 009.3 · Planned / 计划中 | A private contents inventory and a comparison of replacement terms, item limits and cover away from home.<br>提供可自行保管的财物清单，并比较更换赔付条款、单件限额和家外保障。 |
| Health Insurance / 医疗保险 | Available in this build / 本版本可用 | 009.4 · Planned / 计划中 | A comparison by treatment category, limits, excesses, waiting periods and approval rules.<br>按治疗类别、赔付限额、自付额、等待期和审批规则比较保单。 |
| Life Insurance / 人寿保险 | Available in this build / 本版本可用 | 009.5 · Planned / 计划中 | A life-cover needs worksheet and a comparison of benefit definitions, policy expiry and premium structure.<br>提供寿险保障需求表，并比较保险金给付条件、到期时间和保费结构。 |
| Travel Insurance / 旅行保险 | Available in this build / 本版本可用 | 009.6 · Planned / 计划中 | A trip-cover checklist and a comparison of medical, evacuation, cancellation and activity cover.<br>提供旅行保障核对清单，并比较医疗、转运、取消行程和活动保障。 |

## Longer-term ideas / 长期规划

All nine categories below are planned, not available tools. / 以下九类均为规划，尚无可用工具。

| Category / 类别 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
| Gas & LPG / 燃气与液化气 | Planned / 计划中 | Piped gas, bottled LPG, delivery fees and future electrification scenarios.<br>管道燃气、瓶装液化气、配送费用，以及未来的用电替代方案分析。 |
| Council rates / 地方政府地税 | Planned / 计划中 | Regional charges, payment arrangements and applicable relief.<br>了解各地区的收费、付款安排，以及适用的减免措施。 |
| Rent / 房租 | Planned / 计划中 | Housing expenses, affordability and tenancy-related costs.<br>了解住房开支、租金负担，以及租房相关费用。 |
| Transport & vehicles / 交通与车辆 | Planned / 计划中 | Registration, WoF, road user charges, fuel, charging and maintenance.<br>车辆注册、WoF 安全检测、道路使用费、燃油、充电和保养。 |
| Waste & recycling / 垃圾与回收 | Planned / 计划中 | Council and private collection, disposal and recycling charges.<br>地方政府或私人服务的收运、处置和回收费用。 |
| Subscriptions & memberships / 订阅与会员 | Planned / 计划中 | Streaming, software and recurring services that may be unused or duplicated.<br>梳理流媒体、软件等持续扣费服务，识别闲置或重复的订阅。 |
| Education & childcare / 教育与托育 | Planned / 计划中 | Childcare, after-school and holiday programmes, and applicable subsidies.<br>托育、课后班、假期活动，以及适用的补助。 |
| Healthcare & dental / 医疗与牙科 | Planned / 计划中 | Regular care, dental, prescriptions and applicable assistance.<br>日常诊疗、牙科、处方药，以及适用的费用援助。 |
| Groceries & essentials / 食品与日用品 | Planned / 计划中 | Unit prices, shopping baskets and practical food-budget planning.<br>比较单位价格、购物篮费用，并逐步提供实用的食品预算工具。 |

## Help shape the priorities / 一起决定优先事项

Tell us which bills you want help with. Contributors can help review translations, accessibility and official sources.

告诉我们您希望在哪些账单上获得帮助。也欢迎协助审校翻译、检查无障碍体验和核对官方资料。

[GitHub Issues / 提出一般性建议](https://github.com/tomshenhao/OpenBill/issues)

GitHub is a separate public website. Posting an idea requires a GitHub account, and your contribution will be public. Share general ideas only. Do not include personal financial details, account numbers, addresses or uploaded bills. Calculator entries are never attached to feedback.

GitHub 是独立的公开网站。发布建议需要 GitHub 账户，您的内容将公开可见。 请只分享一般性建议，不要提供个人财务信息、账户号码、地址或上传账单。计算器中的输入不会附加到反馈中。

## Maintaining this document / 维护说明

Generated from src/config/categories.ts, src/config/roadmap.ts and the bilingual dictionaries.
Run node scripts/roadmap.ts to update this file and the README module table.
Run node scripts/roadmap.ts --check to check for drift.
本文件由上述配置和双语文案生成。修改后请重新生成；校验命令可检查内容是否同步。

See [product vision](docs/product-vision.md), [data policy](docs/data-policy.md)
and [contribution guide](CONTRIBUTING.md).
