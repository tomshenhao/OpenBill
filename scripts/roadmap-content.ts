import { categoryCatalog } from "../src/config/categories.ts";
import { roadmapMilestones } from "../src/config/roadmap.ts";
import { communityFeedbackUrl } from "../src/config/community.ts";
import { en } from "../src/i18n/en.ts";
import { zh } from "../src/i18n/zh.ts";

export function renderRoadmap(): string {
  const milestones = roadmapMilestones.map((milestone) => {
    const english = en.product.milestones[milestone.id];
    const chinese = zh.product.milestones[milestone.id];
    return `| ${english.title}<br>${chinese.title} | ${en.product.milestoneStatus[milestone.status]} / ${zh.product.milestoneStatus[milestone.status]} | ${english.description}<br>${chinese.description} |`;
  }).join("\n");
  const categories = (tier: "core" | "future") => categoryCatalog.filter((category) => category.tier === tier).map((category) => {
    const english = en.product.categories[category.id];
    const chinese = zh.product.categories[category.id];
    return `| ${english.name} / ${chinese.name} | ${en.product.categoryStatus[category.status]} / ${zh.product.categoryStatus[category.status]} | ${english.description}<br>${chinese.description} |`;
  }).join("\n");
  return `# OpenBill roadmap / 开发路线图

**Less on bills. More for life.**

**让账单更轻，让生活更自由。**

${en.product.roadmapDescription}

${zh.product.roadmapDescription}

Status key / 状态说明: Completed / 已完成 · In progress / 进行中 · Planned / 计划中.
The status key describes possible states; a phase is not marked in progress until work actually starts.
状态说明列出可用状态；只有实际开始的阶段才会标记为“进行中”。

## Development milestones / 开发阶段

| Milestone / 阶段 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
${milestones}

## Six core categories / 六类核心账单

${en.product.coreDescription}

${zh.product.coreDescription}

| Category / 类别 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
${categories("core")}

## Longer-term ideas / 长期规划

All nine categories below are planned, not available tools. / 以下九类均为规划，尚无可用工具。

| Category / 类别 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
${categories("future")}

## Help shape the priorities / 一起决定优先事项

${en.product.communityDescription}

${zh.product.communityDescription}

[GitHub Issues / 提出一般性建议](${communityFeedbackUrl})

${en.product.communityPublic} ${en.product.communityPrivacy}

${zh.product.communityPublic} ${zh.product.communityPrivacy}

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
`;
}
