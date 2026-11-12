export type MilestoneStatus = "completed" | "in-progress" | "planned";
export type MilestoneId = "v01" | "v02" | "verified-electricity" | "core-bills" | "wider-expenses";
export type Milestone = { id: MilestoneId; status: MilestoneStatus; documentation: string | null };

// Implemented/tested scope, not GitHub release tags or a promise of release dates.
// v0.2 completion covers the foundation only; the price catalogue is still empty.
export const roadmapMilestones = [
  { id: "v01", status: "completed", documentation: "README.md" },
  { id: "v02", status: "completed", documentation: "docs/electricity-data.md" },
  { id: "verified-electricity", status: "planned", documentation: "docs/official-source-research.md" },
  { id: "core-bills", status: "planned", documentation: "docs/product-vision.md" },
  { id: "wider-expenses", status: "planned", documentation: "docs/product-vision.md" },
] as const satisfies readonly Milestone[];
