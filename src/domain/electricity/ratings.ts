import { z } from "zod";
import { benchmarkSchema, benchmarkRequirement, monthSchema, type BenchmarkDataset } from "./benchmark.ts";
import { regionSchema, idSchema, sha256Schema, utcSchema } from "./tariff.ts";
import { kwhInput } from "./bill.ts";
import { comparePeriodPlans, comparisonBundleSchema, entryIsCurrent, matchesScope, type ComparisonEntry, type ComparisonScope } from "./comparison.ts";
import type { DataPolicy } from "./validation.ts";

export type Rating = "green" | "yellow" | "red" | "unknown";
export const usageRatingDatasetSchema = z.strictObject({
  schemaVersion: z.literal(1), dataKind: z.literal("official-aggregate"), source: benchmarkSchema.shape.source,
  derivation: z.strictObject({ columns: z.tuple([z.literal("75th percentile (kWh)"), z.literal("95th percentile (kWh)")]), method: z.literal("Exact source columns; no interpolation") }),
  rows: z.array(z.strictObject({ region: regionSchema, month: monthSchema, p75Kwh: z.number().nonnegative().max(30_000), p95Kwh: z.number().nonnegative().max(30_000) })).min(1),
}).superRefine((data, context) => {
  const seen = new Set<string>();
  for (const row of data.rows) {
    const key = `${row.region}/${row.month}`;
    if (seen.has(key) || row.p75Kwh > row.p95Kwh || row.month < data.source.from || row.month > data.source.through) context.addIssue({ code: "custom", message: "Invalid percentile row or period" });
    seen.add(key);
  }
});
export type UsageRatingDataset = z.infer<typeof usageRatingDatasetSchema>;
export function assessUsage(mean: BenchmarkDataset, raw: unknown, input: { region: string; month: string; days: number; fullCalendarMonth: boolean; kwh: string; people?: number; approximate?: boolean }) {
  const unknown = (reason: "missing" | "period" | "invalid") => ({ rating: "unknown" as const, reason, householdSizeMatched: false as const, kwh: kwhInput.safeParse(input.kwh).success ? Number(input.kwh) : null });
  if (!kwhInput.safeParse(input.kwh).success || (input.people !== undefined && (!Number.isInteger(input.people) || input.people < 1 || input.people > 20))) return unknown("invalid");
  if (input.approximate || benchmarkRequirement(mean, input)) return unknown("period");
  const parsed = usageRatingDatasetSchema.safeParse(raw);
  if (!parsed.success || JSON.stringify(parsed.data.source) !== JSON.stringify(mean.source)) return unknown("missing");
  const row = parsed.data.rows.find((row) => row.region === input.region && row.month === input.month);
  if (!row) return unknown("missing");
  const kwh = Number(input.kwh);
  const rating: Exclude<Rating, "unknown"> = kwh <= row.p75Kwh ? "green" : kwh <= row.p95Kwh ? "yellow" : "red";
  return { rating, householdSizeMatched: false as const, kwh, p75Kwh: row.p75Kwh, p95Kwh: row.p95Kwh, source: parsed.data.source, month: row.month, region: row.region };
}

const scopeSchema = z.strictObject({ region: regionSchema, network: idSchema, metering: z.enum(["standard", "smart", "controlled", "day-night", "other"]), userCategory: z.enum(["low", "standard"]), registers: z.array(idSchema).min(1) });
export const priceCoverageSchema = z.strictObject({
  schemaVersion: z.literal(1), reviews: z.array(z.strictObject({
    reviewId: idSchema, scope: scopeSchema, reviewedAt: utcSchema, reviewedBy: idSchema,
    rationale: z.string().trim().min(20), adequateForLimitedCatalogueRating: z.literal(true),
    records: z.array(z.strictObject({ recordId: idSchema, recordSha256: sha256Schema })).min(2),
  })),
}).superRefine((data, context) => {
  if (new Set(data.reviews.map((r) => r.reviewId)).size !== data.reviews.length) context.addIssue({ code: "custom", message: "Duplicate coverage review" });
  for (const review of data.reviews) if (new Set(review.records.map((r) => r.recordId)).size !== review.records.length || new Set(review.scope.registers).size !== review.scope.registers.length) context.addIssue({ code: "custom", message: "Duplicate coverage record or register" });
});
type CoverageReview = z.infer<typeof priceCoverageSchema>["reviews"][number];
export function coverageSupportsRating(entries: ComparisonEntry[], scope: ComparisonScope, review: CoverageReview, now: Date) {
  const sameScope = review.scope.region === scope.region && review.scope.network === scope.network && review.scope.metering === scope.metering && review.scope.userCategory === scope.userCategory && [...review.scope.registers].sort().join() === [...scope.registers].sort().join();
  const age = now.getTime() - Date.parse(review.reviewedAt);
  return sameScope && age >= 0 && age < 30 * 86400_000 && entries.length === review.records.length && new Set(entries.map((e) => e.record.retailerId)).size >= 2
    && entries.every((entry) => review.records.some((r) => r.recordId === entry.record.recordId && r.recordSha256 === entry.recordSha256)
      && review.reviewedBy !== entry.record.provenance.collectedBy && review.reviewedAt >= entry.review.reviewedAt && review.reviewedAt >= entry.rights.reviewedAt);
}
export function validatePriceRatingCoverage(raw: unknown, rawBundle: unknown, policy: DataPolicy, now: Date, asOf: string) {
  const coverage = priceCoverageSchema.parse(raw), bundle = comparisonBundleSchema.parse(rawBundle);
  for (const review of coverage.reviews) {
    const entries = bundle.entries.filter((entry) => entryIsCurrent(entry, policy, now, asOf) && matchesScope(entry.record, review.scope));
    if (!coverageSupportsRating(entries, review.scope, review, now)) throw new Error("Price-rating coverage review is stale, mismatched or insufficient");
  }
  return coverage;
}
// Product-design bands, not regulatory standards. Compare exact cents without
// rounding the displayed percentage before deciding the colour.
export function pricePremiumBand(currentCents: bigint, lowestCents: bigint) {
  if (lowestCents <= 0n || currentCents < lowestCents) return { rating: "unknown" as const };
  const differenceCents = currentCents - lowestCents;
  const rating: Exclude<Rating, "unknown"> = differenceCents * 100n <= lowestCents * 5n ? "green" : differenceCents * 100n <= lowestCents * 15n ? "yellow" : "red";
  return { rating, premiumPercent: Number(differenceCents) / Number(lowestCents) * 100, savingsCents: differenceCents };
}
export function assessPrice(rawBundle: unknown, policy: DataPolicy, scope: ComparisonScope, profile: Parameters<typeof comparePeriodPlans>[3], rawCoverage: unknown, options: Parameters<typeof comparePeriodPlans>[4]) {
  const unknown = { rating: "unknown" as const };
  const result = comparePeriodPlans(rawBundle, policy, scope, profile, options);
  const baseline = result.rows.find((row) => row.entry.record.recordId === options.currentRecordId);
  const coverage = priceCoverageSchema.safeParse(rawCoverage);
  if (!baseline || !coverage.success || !coverage.data.reviews.some((review) => coverageSupportsRating(result.rows.map((r) => r.entry), scope, review, options.now))) return unknown;
  const lowest = result.rows.reduce((best, row) => row.periodCents < best.periodCents ? row : best, baseline);
  return { ...pricePremiumBand(baseline.periodCents, lowest.periodCents), current: baseline, lowest, comparableRetailers: new Set(result.rows.map((r) => r.entry.record.retailerId)).size };
}
