# OpenBill roadmap / 开发路线图

**Less on bills. More for life.**

**让账单更轻，让生活更自由。**

Completed means the named work is built and tested. It does not mean supplier prices or comparisons are ready. Plans will evolve with evidence and community needs, without promised release dates.

“已完成”表示相应工作已实现并经过测试，并不代表已提供供应商价格或比价。后续计划将根据可靠信息和社区需求调整，不承诺发布日期。

Status key / 状态说明: Completed / 已完成 · In progress / 进行中 · Planned / 计划中.
The status key describes possible states; a phase is not marked in progress until work actually starts.
状态说明列出可用状态；只有实际开始的阶段才会标记为“进行中”。

## Development milestones / 开发阶段

| Milestone / 阶段 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
| v0.1 · Bilingual website & usage calculator<br>v0.1 · 双语网站与用电量计算 | Completed / 已完成 | English and Simplified Chinese pages, plus a local electricity usage check with no bill uploads.<br>提供英文和简体中文页面，以及无需上传账单、在本地运行的用电量计算。 |
| v0.2 · Official electricity data foundation<br>v0.2 · 官方电价数据基础设施 | Completed / 已完成 | Evidence archiving, validation and review tools are built and tested. No verified supplier tariffs or comparisons are available yet.<br>证据归档、数据校验和审核工具已实现并经过测试。目前仍无已核实的供应商电价，也未提供比价。 |
| Electricity bill analysis & usage context<br>电费账单分析与用电参考 | Completed / 已完成 | Local bill calculations, matching official monthly regional averages, contextual tips and a local EIEP14A JSON importer. The comparison engine uses synthetic tests; supplier offers remain unavailable.<br>本地账单计算、同期官方地区月度均值、相关建议及本地 EIEP14A JSON 导入。比价引擎使用合成数据测试，供应商报价仍未开放。 |
| Verified electricity comparisons<br>经过核实的电费比较 | Planned / 计划中 | Obtain permitted official rate cards, check their coverage and independently validate cost calculations before comparing plans.<br>先取得获准使用的官方价目表，核实适用范围，再独立验证费用计算，之后才开展套餐比较。 |
| More core household bills<br>逐步覆盖更多核心账单 | Planned / 计划中 | Develop water, mortgage, insurance, broadband and mobile tools one category at a time, each with its own evidence and calculation rules.<br>依次开发水费、房贷、保险、宽带和手机工具。每类开支都有各自的数据依据和计算规则。 |
| Community-led household tools<br>由社区需求推动的家庭工具 | Planned / 计划中 | Prioritise the wider expense categories around practical community needs and reliable information.<br>根据实际需求和可靠信息，确定更多家庭开支类别的开发顺序。 |

## Six core categories / 六类核心账单

These six areas are our starting point. Electricity bill analysis, regional usage benchmarks and practical tips are available today; supplier comparisons and the other tools are still to come.

我们将从这六类开支逐步做起。目前已开放电费分析、地区用电基准及实用建议；供应商比价和其他工具尚未推出。

| Category / 类别 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
| Electricity / 电费 | Bill analysis available / 电费分析已开放 | Understand your bill, compare regional usage and find practical saving tips.<br>了解账单、对照地区用电水平，并查看实用省电建议。 |
| Water / 水费 | Coming soon / 即将推出 | Explore water charges, consumption and practical ways to use less.<br>了解水费构成、用水量，以及实用的节水方法。 |
| Mortgage / 房贷 | Coming soon / 即将推出 | Understand rates, repayments, fees and refinancing scenarios.<br>了解利率、还款、费用，以及转贷情景。 |
| Insurance / 保险 | Coming soon / 即将推出 | Consider premiums alongside excesses, cover, exclusions and eligibility.<br>结合保费、自付额、保障范围、除外责任和适用条件进行分析。 |
| Broadband / 宽带 | Coming soon / 即将推出 | Look at speed, contracts, introductory offers and the total cost over time.<br>综合考虑网速、合约、优惠期价格和长期总费用。 |
| Mobile / 手机 | Coming soon / 即将推出 | Explore prepaid, monthly and family plans, allowances and coverage.<br>了解预付费、月付和家庭套餐，以及用量额度和信号覆盖。 |

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

Is there another bill or recurring expense you would like help reducing? Tell us what matters to you. OpenBill will grow with community needs.

还有哪类账单或固定开支，是您希望获得帮助的？欢迎告诉我们您关心的问题。OpenBill 将随社区需求逐步成长。

[GitHub Issues / 提出一般性建议](https://github.com/tomshenhao/OpenBill/issues)

GitHub is a separate public website. Posting an idea requires a GitHub account, and your contribution will be public. Share general ideas only. Do not include personal financial details, account numbers, addresses or uploaded bills. Calculator entries are never attached to feedback.

GitHub 是独立的公开网站。发布建议需要 GitHub 账户，您的内容将公开可见。 请只分享一般性建议，不要提供个人财务信息、账户号码、地址或上传账单。计算器中的输入不会附加到反馈中。

## Maintaining this document / 维护说明

Generated from src/config/categories.ts, src/config/roadmap.ts and the bilingual dictionaries.
Run node scripts/roadmap.ts after changing them; node scripts/roadmap.ts --check checks for drift.
本文件由上述配置和双语文案生成。修改后请重新生成；校验命令可检查内容是否同步。

See [product vision](docs/product-vision.md), [data foundation](docs/electricity-data.md)
and [data policy](docs/data-policy.md). Completion records describe implemented/tested work,
not a GitHub release or approval to publish uncommitted work. There are no promised dates,
completion percentages, savings figures or automatic deployments.
阶段完成表示相应工作已实现并测试，不代表 GitHub 版本发布或批准公开尚未提交的修改。
不承诺发布日期、完成百分比、节省金额，也不自动部署。
