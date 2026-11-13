import { z } from "zod";
import { regionSchema, sha256Schema, utcSchema } from "./tariff.ts";
import { kwhInput } from "./bill.ts";

export const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export function daysInMonth(month: string): number {
  monthSchema.parse(month);
  const [year, m] = month.split("-").map(Number);
  return new Date(Date.UTC(year, m, 0)).getUTCDate();
}
export const benchmarkSchema = z.strictObject({
  schemaVersion: z.literal(1), dataKind: z.literal("official-aggregate"),
  source: z.strictObject({
    reportUrl: z.literal("https://www.emi.ea.govt.nz/Retail/Reports/0YUCE0"), downloadUrl: z.url(),
    collectedAt: utcSchema, sourceSha256: sha256Schema, sourceFile: z.string(),
    attribution: z.string().min(1), licence: z.literal("CC-BY-4.0"), licenceUrl: z.url(),
    verification: z.literal("source-checked-not-independently-reviewed"), checkedAt: utcSchema,
    checkedBy: z.literal("openbill-task004-research"),
    geography: z.literal("Regional council (2013 boundaries)"), unit: z.literal("kWh/ICP/calendar-month"),
    population: z.string().min(1), caveats: z.array(z.string().min(1)).min(1),
    householdSizeStratified: z.literal(false), temperatureAdjusted: z.literal(false),
    from: monthSchema, through: monthSchema,
  }),
  rows: z.array(z.strictObject({ region: regionSchema, month: monthSchema, meanKwh: z.number().positive().max(30_000), coveragePercent: z.number().positive().max(100) })).min(1),
}).superRefine((data, context) => {
  const keys = new Set<string>();
  for (const row of data.rows) {
    const key = `${row.region}/${row.month}`;
    if (keys.has(key)) context.addIssue({ code: "custom", message: "Duplicate benchmark", path: ["rows"] });
    keys.add(key);
    if (row.month < data.source.from || row.month > data.source.through) context.addIssue({ code: "custom", message: "Period outside source coverage", path: ["rows"] });
  }
});
export type BenchmarkDataset = z.infer<typeof benchmarkSchema>;
export const distributionSchema = z.strictObject({
  schemaVersion: z.literal(1), dataKind: z.literal("official-aggregate"), source: benchmarkSchema.shape.source,
  derivation: z.strictObject({ checkedAt: utcSchema, checkedBy: z.literal("openbill-task004-1"),
    sampleSize: z.null(), sampleSizeNote: z.literal("The CSV publishes coverage percentages, not per-cell sample counts."),
    columns: z.tuple([z.literal("25th percentile (kWh)"), z.literal("50th percentile (kWh)"), z.literal("75th percentile (kWh)")]),
  }),
  rows: z.array(z.strictObject({ region: regionSchema, month: monthSchema,
    p25Kwh: z.number().nonnegative().max(30_000), medianKwh: z.number().nonnegative().max(30_000), p75Kwh: z.number().nonnegative().max(30_000),
  })).min(1),
}).superRefine((data, context) => {
  const keys = new Set<string>();
  for (const r of data.rows) {
    const key = `${r.region}/${r.month}`;
    if (keys.has(key) || r.month < data.source.from || r.month > data.source.through || r.p25Kwh > r.medianKwh || r.medianKwh > r.p75Kwh) context.addIssue({ code: "custom", message: "Invalid distribution row or duplicate period", path: ["rows"] });
    keys.add(key);
  }
});
export type DistributionDataset = z.infer<typeof distributionSchema>;
export function assertSameBenchmarkSnapshot(mean: BenchmarkDataset, distribution: DistributionDataset) {
  const keys = (rows: { region: string; month: string }[]) => rows.map((r) => `${r.region}/${r.month}`).sort().join();
  if (JSON.stringify(mean.source) !== JSON.stringify(distribution.source) || keys(mean.rows) !== keys(distribution.rows)) throw new Error("Distribution must match the same official snapshot and population");
}
export function availableBenchmarkMonths(dataset: BenchmarkDataset): string[] {
  return [...new Set(dataset.rows.map((r) => r.month))].sort().reverse();
}
export type BenchmarkResult = { available: false; reason: "period" | "missing" | "invalid" } | {
  available: true; meanKwh: number; differenceKwh: number; differencePercent: number; coveragePercent: number;
  scope: "regional-all-household-sizes"; householdSizeMatched: false;
  centralRange?: { p25Kwh: number; medianKwh: number; p75Kwh: number; position: "below" | "within" | "above" };
};

export function benchmarkRequirement(dataset: BenchmarkDataset, input: { region: string; month: string; days: number; fullCalendarMonth: boolean }): "region" | "month" | "confirmation" | "day-count" | "missing" | null {
  if (!regionSchema.safeParse(input.region).success) return "region";
  if (!monthSchema.safeParse(input.month).success) return "month";
  if (!input.fullCalendarMonth) return "confirmation";
  if (input.days !== daysInMonth(input.month)) return "day-count";
  if (!dataset.rows.some((r) => r.region === input.region && r.month === input.month)) return "missing";
  return null;
}

export function benchmarkUsage(dataset: BenchmarkDataset, input: { region: string; month: string; days: number; kwh: string; fullCalendarMonth: boolean; people?: number }, distribution?: DistributionDataset): BenchmarkResult {
  if (!monthSchema.safeParse(input.month).success || !kwhInput.safeParse(input.kwh).success || (input.people !== undefined && (!Number.isInteger(input.people) || input.people < 1 || input.people > 20))) return { available: false, reason: "invalid" };
  if (!input.fullCalendarMonth || input.days !== daysInMonth(input.month)) return { available: false, reason: "period" };
  const row = dataset.rows.find((r) => r.region === input.region && r.month === input.month);
  if (!row) return { available: false, reason: "missing" };
  // Household size is context only: this source does not define size-specific peers.
  const differenceKwh = Number(input.kwh) - row.meanKwh;
  const result: BenchmarkResult = { available: true, meanKwh: row.meanKwh, differenceKwh, differencePercent: differenceKwh / row.meanKwh * 100, coveragePercent: row.coveragePercent, scope: "regional-all-household-sizes", householdSizeMatched: false };
  if (distribution) {
    assertSameBenchmarkSnapshot(dataset, distribution);
    const r = distribution.rows.find((r) => r.region === input.region && r.month === input.month)!;
    result.centralRange = { p25Kwh: r.p25Kwh, medianKwh: r.medianKwh, p75Kwh: r.p75Kwh, position: Number(input.kwh) < r.p25Kwh ? "below" : Number(input.kwh) > r.p75Kwh ? "above" : "within" };
  }
  return result;
}
