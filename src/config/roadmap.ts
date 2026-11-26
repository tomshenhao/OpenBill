import type { InsuranceModuleId } from "./insurance.ts";

export type MilestoneStatus = "completed" | "in-progress" | "planned";
export type MilestoneId = "v01" | "v02" | "electricity-analysis" | "electricity-bill-review" | "electricity-comparison-framework" | "water-analysis" | "mortgage-calculator" | "insurance-guides" | "verified-electricity" | "electricity-household-data" | "water-evidence" | "mortgage-rates" | "core-bills" | "wider-expenses";
export type Milestone = { id: MilestoneId; status: MilestoneStatus; documentation: string | null };

// Implemented/tested scope, not GitHub release tags or a promise of release dates.
// v0.2 completion covers the foundation only; the price catalogue is still empty.
export const roadmapMilestones = [
  { id: "v01", status: "completed", documentation: "README.md" },
  { id: "v02", status: "completed", documentation: "docs/electricity-data.md" },
  { id: "electricity-analysis", status: "completed", documentation: "docs/task005-2-input-journey.md" },
  { id: "electricity-bill-review", status: "completed", documentation: "docs/task010-electricity-bill-review.md" },
  { id: "electricity-comparison-framework", status: "completed", documentation: "docs/task005-report.md" },
  { id: "water-analysis", status: "completed", documentation: "docs/task006-water.md" },
  { id: "mortgage-calculator", status: "completed", documentation: "docs/task007-mortgage.md" },
  { id: "insurance-guides", status: "completed", documentation: "docs/task009-insurance.md" },
  { id: "verified-electricity", status: "planned", documentation: "docs/retailer-requests/README.md" },
  { id: "electricity-household-data", status: "planned", documentation: "docs/task004-1.md" },
  { id: "water-evidence", status: "planned", documentation: "docs/task006-water.md" },
  { id: "mortgage-rates", status: "planned", documentation: "docs/task007-mortgage.md" },
  { id: "core-bills", status: "planned", documentation: "docs/product-vision.md" },
  { id: "wider-expenses", status: "planned", documentation: "docs/product-vision.md" },
] as const satisfies readonly Milestone[];

export const insuranceFollowUps = {
  house: { task: "009.1", status: "completed" },
  car: { task: "009.2", status: "planned" },
  contents: { task: "009.3", status: "planned" },
  health: { task: "009.4", status: "planned" },
  life: { task: "009.5", status: "planned" },
  travel: { task: "009.6", status: "planned" },
} as const satisfies Record<InsuranceModuleId, { task: string; status: MilestoneStatus }>;
