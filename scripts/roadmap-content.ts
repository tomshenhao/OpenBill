import { coreCategories, futureCategories } from "../src/config/categories.ts";
import { roadmapMilestones } from "../src/config/roadmap.ts";
import { communityFeedbackUrl } from "../src/config/community.ts";
import { en } from "../src/i18n/en.ts";
import { zh } from "../src/i18n/zh.ts";

function renderCoreTable(bilingual: boolean): string {
  const english = en.product;
  const chinese = zh.product;
  const columns = bilingual
    ? ["Module / 模块", "Status / 状态", "Purpose / 用途", "What works / 可用功能", "Next milestone / 下一阶段"]
    : ["Module", "Status", "Purpose", "What works", "Next milestone"];
  const rows = coreCategories.map(({ id, status }) => {
    const enCategory = english.categories[id];
    const zhCategory = chinese.categories[id];
    const enProgress = english.coreProgress[id];
    const zhProgress = chinese.coreProgress[id];
    const text = (enText: string, zhText: string, separator = "<br>") => bilingual ? `${enText}${separator}${zhText}` : enText;
    return [
      text(enCategory.name, zhCategory.name, " / "),
      text(english.categoryStatus[status], chinese.categoryStatus[status], " / "),
      text(enCategory.description, zhCategory.description),
      text(enProgress.current ?? "—", zhProgress.current ?? "—"),
      text(enProgress.next, zhProgress.next),
    ];
  });
  return [columns, columns.map(() => "---"), ...rows].map((row) => `| ${row.join(" | ")} |`).join("\n");
}

const readmeModuleStart = "<!-- BEGIN GENERATED MODULE STATUS -->";
const readmeModuleEnd = "<!-- END GENERATED MODULE STATUS -->";

export function updateReadmeModules(readme: string): string {
  const start = readme.indexOf(readmeModuleStart);
  const end = readme.indexOf(readmeModuleEnd);
  if (start === -1 || end < start) throw new Error("README module status markers are missing or out of order.");
  return readme.slice(0, start + readmeModuleStart.length)
    + `\n\n${renderCoreTable(false)}\n\n` + readme.slice(end);
}

export function renderRoadmap(): string {
  const milestones = roadmapMilestones.map((milestone) => {
    const english = en.product.milestones[milestone.id];
    const chinese = zh.product.milestones[milestone.id];
    return `| [${english.title}](${milestone.documentation})<br>${chinese.title} | ${en.product.milestoneStatus[milestone.status]} / ${zh.product.milestoneStatus[milestone.status]} | ${english.description}<br>${chinese.description} |`;
  }).join("\n");
  const future = futureCategories.map((category) => {
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

${renderCoreTable(true)}

## Longer-term ideas / 长期规划

All nine categories below are planned, not available tools. / 以下九类均为规划，尚无可用工具。

| Category / 类别 | Status / 状态 | Scope / 范围 |
| --- | --- | --- |
${future}

## Help shape the priorities / 一起决定优先事项

${en.product.communityDescription}

${zh.product.communityDescription}

[GitHub Issues / 提出一般性建议](${communityFeedbackUrl})

${en.product.communityPublic} ${en.product.communityPrivacy}

${zh.product.communityPublic} ${zh.product.communityPrivacy}

## Maintaining this document / 维护说明

Generated from src/config/categories.ts, src/config/roadmap.ts and the bilingual dictionaries.
Run node scripts/roadmap.ts to update this file and the README module table.
Run node scripts/roadmap.ts --check to check for drift.
本文件由上述配置和双语文案生成。修改后请重新生成；校验命令可检查内容是否同步。

See [product vision](docs/product-vision.md), [data policy](docs/data-policy.md)
and [contribution guide](CONTRIBUTING.md).
`;
}
