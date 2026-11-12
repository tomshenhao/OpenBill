# Contributing to OpenBill / 参与 OpenBill

Help make household expenses easier to understand. Ideas, language/accessibility
reviews, official-source research and tested code are welcome.

欢迎提出建议、改进翻译和无障碍体验、研究官方信息，或贡献经过测试的代码。

## Share a general idea / 提出一般性建议

Use [GitHub Issues](https://github.com/tomshenhao/OpenBill/issues). It is a separate,
public website; posting requires a GitHub account and contributions are public.
The bilingual idea form in `.github/ISSUE_TEMPLATE/feature_request.yml` will become
available after approved changes are published. The homepage currently links to
the already existing Issues page.

请通过上述 GitHub Issues 页面提出建议。GitHub 是独立的公开网站，发布需要账户，
内容将公开可见。双语建议表单将在修改获准并发布后可用；当前网站链接指向已有的议题页。

Describe the kind of bill, the general difficulty and how a tool could help.
**Do not include personal financial details, account numbers, addresses, uploaded
bills or calculator entries.** We do not ask for an email or household account.

请说明开支类别、一般性困难和希望实现的帮助。**不要提供个人财务信息、账户号码、
地址、上传账单或计算器中的输入。** 我们不要求邮箱或家庭账户信息。

GitHub controls its own platform and may allow attachments; an issue template
cannot technically prevent someone from posting private information. Review
contributions for accidental disclosure and use GitHub's reporting/removal process
when needed. Never copy exposed information into logs, tests or other issues.

GitHub 自行管理其平台，可能允许附件；议题模板无法从技术上阻止用户发布私人信息。
请检查意外泄露情况，必要时使用 GitHub 的报告或移除流程，不要将这些信息复制到日志、
测试或其他议题中。

## Work on the project / 开发项目

Read [AGENTS.md](AGENTS.md), the [product vision](docs/product-vision.md),
[ROADMAP.md](ROADMAP.md), [architecture](docs/architecture.md) and
[data policy](docs/data-policy.md). The calculator processes inputs locally.
Official supplier data and Node collection tools are separate from browser code.

先阅读上述规则、愿景、路线图、架构与数据政策。计算器输入在本地处理，官方供应商
数据与 Node 数据工具不得接入浏览器中的家庭输入流程。

```sh
npm ci
npm run check
npm run build
npx playwright install chromium
npm run test:e2e
npm run dev
```

On Windows use `npm.cmd`/`npx.cmd` when PowerShell blocks scripts.
Windows PowerShell 如限制脚本运行，可使用 `npm.cmd` / `npx.cmd`。

The six core categories and nine future ideas are product scope, not available
tools. Keep unfinished routes/calculators null. New features need both languages,
accessible interaction, reliable official evidence where applicable, and a clear
expense ownership boundary. See the product vision for the category checklist.

六类核心账单和九类未来开支属于规划，并非全部可用。尚未实现的路由和计算器应保持
为空。新功能须支持双语和无障碍使用，具备适用的可靠官方依据，并明确费用归属。

Milestone statuses live in `src/config/roadmap.ts`. After changing category or
roadmap copy/configuration, regenerate and check the public document:

里程碑状态集中在上述配置中。修改类别、路线图或相关文案后，请重新生成并校验：

```sh
node scripts/roadmap.ts
node scripts/roadmap.ts --check
```

Do not invent prices, savings, verification or implementation progress. Do not
commit, push or deploy local changes without explicit approval in this task.

不得编造价格、节省金额、核实结论或开发进度。本任务中的本地修改未经明确批准，不得
提交、推送或部署。
