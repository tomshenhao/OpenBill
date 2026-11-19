import { readFileSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { assessUsage, assessPrice, pricePremiumBand, coverageSupportsRating, priceCoverageSchema, usageRatingDatasetSchema } from "@/domain/electricity/ratings";
import { regionalBenchmark, usageRatingData, comparisonPlans, priceRatingCoverage } from "@/data/electricity/analysis-data";
import { importUsageRatings } from "../tools/electricity/benchmark-import.ts";
import { syntheticTariff, syntheticReview, testPolicy, testNow, hash } from "./fixtures/electricity.ts";
import { recommendTips } from "@/domain/electricity/tips";
import type { ComparisonEntry } from "@/domain/electricity/comparison";
import { archiveCoverageReceipt, assertArchivedCoverageReviews } from "../tools/electricity/coverage.ts";

const input = { region: "NZ-AUK", month: "2026-06", days: 30, fullCalendarMonth: true, kwh: "223" };
const official = usageRatingData.rows.find((row) => row.region === input.region && row.month === input.month)!;
describe("official usage ratings", () => {
  it("reproduces exact P75/P95 columns from the unchanged official archive", () => {
    const bytes = readFileSync("data/electricity/benchmarks/source/emi-2025-01-2026-08.csv");
    expect(importUsageRatings(bytes, regionalBenchmark.source.collectedAt)).toEqual(usageRatingData);
    expect(usageRatingData.rows).toHaveLength(320);
    expect(official.p75Kwh).toBe(884);
  });
  it("does not turn a missing source percentile into zero", () => {
    const csv = readFileSync("data/electricity/benchmarks/source/emi-2025-01-2026-08.csv", "utf8");
    const missing = csv.replace(",587,998,91.74", ",587,,91.74");
    expect(missing).not.toBe(csv);
    expect(() => importUsageRatings(Buffer.from(missing), regionalBenchmark.source.collectedAt)).toThrow("never infer zero");
  });
  it.each([[0, "green"], [official.p75Kwh, "green"], [official.p75Kwh + 0.001, "yellow"], [official.p95Kwh, "yellow"], [official.p95Kwh + 0.001, "red"]])("uses published percentile boundaries at %s", (kwh, rating) => {
    expect(assessUsage(regionalBenchmark, usageRatingData, { ...input, kwh: String(kwh) }).rating).toBe(rating);
  });
  it("does not manufacture household peers, ranks or thresholds from regional averages", () => {
    const one = assessUsage(regionalBenchmark, usageRatingData, { ...input, people: 1 });
    expect(assessUsage(regionalBenchmark, usageRatingData, { ...input, people: 6 })).toEqual(one);
    expect(one.householdSizeMatched).toBe(false); expect(one).not.toHaveProperty("percentileRank");
    expect(one.rating).toBe("green");
  });
  it.each([{ fullCalendarMonth: false }, { days: 29 }, { region: "NZ-CIT" }, { month: "2099-06" }, { approximate: true }, { kwh: "-1" }, { people: 0 }])("keeps unmatched or invalid inputs neutral: %j", (change) => {
    expect(assessUsage(regionalBenchmark, usageRatingData, { ...input, ...change }).rating).toBe("unknown");
  });
  it("refuses missing P95, wrong source snapshots, reversed thresholds and missing data", () => {
    expect(assessUsage(regionalBenchmark, null, input).rating).toBe("unknown");
    const data = structuredClone(usageRatingData); data.source.sourceSha256 = "b".repeat(64);
    expect(assessUsage(regionalBenchmark, data, input).rating).toBe("unknown");
    const reversed = structuredClone(usageRatingData); reversed.rows[0].p95Kwh = 0;
    expect(usageRatingDatasetSchema.safeParse(reversed).success).toBe(false);
    const missing = structuredClone(usageRatingData); Reflect.deleteProperty(missing.rows[0], "p95Kwh");
    expect(usageRatingDatasetSchema.safeParse(missing).success).toBe(false);
  });
  it("prioritises investigation for high bands and optional efficiency for green", () => {
    const context = { estimatedReading: false, heating: "unknown", hotWater: "unknown", timeOfUse: false, flexible: false, olderBulbs: false } as const;
    expect(recommendTips(context, "red")).toEqual(["heat", "hotWater", "appliances"]);
    expect(recommendTips({ ...context, heating: "other", hotWater: "other" }, "yellow")).toEqual(["appliances"]);
    expect(recommendTips(context, "green")).toEqual(["appliances"]);
  });
});

// SYNTHETIC ONLY. Two fictional retailers, never production pricing or offers.
const scope = { region: "NZ-AUK", network: "synthetic-network", metering: "smart", userCategory: "standard", registers: ["uncontrolled"] } as const;
const mutableScope = { ...scope, registers: [...scope.registers] };
const options = { now: testNow, asOf: "2026-11-13", allowSynthetic: true, currentRecordId: "synthetic-r1" };
const policy = { ...testPolicy, retailers: [...testPolicy.retailers, { ...testPolicy.retailers[0], id: "synthetic-second" }] };
function entries(): ComparisonEntry[] {
  return ["synthetic", "synthetic-second"].map((retailerId, i) => {
    const record = syntheticTariff(); record.retailerId = retailerId;
    record.recordId = `synthetic-r${i + 1}`; record.charges.daily[0].price.amount = i ? "1" : "1.2"; record.charges.usage[0].price.amount = "0.2";
    return { record, recordSha256: hash, review: syntheticReview(record.recordId, hash), rights: { recordId: record.recordId, recordSha256: hash, reviewedAt: "2026-11-12T12:00:00.000Z", reviewedBy: "independent-rights", permissionReference: "SYNTHETIC ONLY" } };
  });
}
function coverage(data: ComparisonEntry[]) {
  return priceCoverageSchema.parse({ schemaVersion: 1, reviews: [{ reviewId: "synthetic-coverage", scope: mutableScope, reviewedAt: "2026-11-12T13:00:00.000Z", reviewedBy: "independent-coverage", adequateForLimitedCatalogueRating: true, rationale: "SYNTHETIC TEST ONLY: explicit limited-catalogue review", records: data.map((entry) => ({ recordId: entry.record.recordId, recordSha256: entry.recordSha256 })) }] });
}
const profile = { days: 30, registerKwh: { uncontrolled: "300" } };
function assess(data = entries(), rawCoverage: unknown = coverage(data), changes = {}) {
  return assessPrice({ schemaVersion: 1, entries: data }, policy, mutableScope, profile, rawCoverage, { ...options, ...changes });
}
describe("independent price rating", () => {
  it("retains immutable human-authored coverage receipts and rejects altered copies", async () => {
    const root = await mkdtemp(resolve(tmpdir(), "openbill-coverage-"));
    const receipt = coverage(entries());
    await archiveCoverageReceipt(receipt, root);
    await expect(assertArchivedCoverageReviews(receipt, root)).resolves.toBeUndefined();
    await expect(archiveCoverageReceipt(receipt, root)).rejects.toThrow();
    const altered = structuredClone(receipt); altered.reviews[0].rationale = "SYNTHETIC ALTERED COPY MUST FAIL";
    await expect(assertArchivedCoverageReviews(altered, root)).rejects.toThrow("immutable");
    await writeFile(resolve(root, "synthetic-coverage.json"), "{}");
    await expect(assertArchivedCoverageReviews(receipt, root)).rejects.toThrow();
  });
  it.each([[10000n, "green"], [10500n, "green"], [10501n, "yellow"], [11500n, "yellow"], [11501n, "red"]])("uses exact product-design thresholds for %s cents", (current, rating) => {
    expect(pricePremiumBand(current, 10000n).rating).toBe(rating);
  });
  it("does not round premiums before classification and refuses a zero denominator", () => {
    expect(pricePremiumBand(1050001n, 1000000n).rating).toBe("yellow");
    expect(pricePremiumBand(0n, 0n).rating).toBe("unknown");
    expect(pricePremiumBand(99n, 100n).rating).toBe("unknown");
  });
  it("includes daily fixed charges and GST, rather than comparing only kWh rates", () => {
    const result = assess(); expect(result.rating).toBe("yellow");
    if ("current" in result) { expect(result.current.periodCents).toBe(9600n); expect(result.lowest.periodCents).toBe(9000n); expect(result.comparableRetailers).toBe(2); }
  });
  it("requires explicit reviewed coverage of multiple retailers and an eligible baseline", () => {
    expect(assess(entries(), { schemaVersion: 1, reviews: [] }).rating).toBe("unknown");
    expect(assess(entries(), undefined, { currentRecordId: "unknown" }).rating).toBe("unknown");
    const data = entries(); data[1].record.retailerId = data[0].record.retailerId; data[1].record.plan.id = "second-synthetic-plan";
    expect(assess(data).rating).toBe("unknown");
    expect(comparisonPlans.entries).toEqual([]); expect(priceRatingCoverage.reviews).toEqual([]);
    expect(assess([], { schemaVersion: 1, reviews: [] }).rating).toBe("unknown");
    expect(assess(entries(), undefined, { allowSynthetic: false }).rating).toBe("unknown");
  });
  it.each(["stale", "hash", "self", "scope"])("refuses %s coverage", (scenario) => {
    const data = entries(), receipt = coverage(data), review = receipt.reviews[0];
    if (scenario === "stale") review.reviewedAt = "2026-10-01T13:00:00.000Z";
    if (scenario === "hash") review.records[0].recordSha256 = "b".repeat(64);
    if (scenario === "self") review.reviewedBy = data[0].record.provenance.collectedBy;
    if (scenario === "scope") review.scope.network = "unknown";
    expect(coverageSupportsRating(data, mutableScope, review, testNow)).toBe(false);
    expect(assess(data, receipt).rating).toBe("unknown");
  });
  it.each(["fee", "discount", "tou", "gst", "meter", "network", "stale", "missing-fixed"])("excludes %s alternatives and keeps the price rating neutral", (scenario) => {
    const data = entries(), receipt = coverage(data), r = data[1].record;
    if (scenario === "fee") r.contract.earlyTerminationFee!.amount = "100";
    if (scenario === "discount") r.contract.discounts = [{ description: "SYNTHETIC", conditions: "Unresolved" }];
    if (scenario === "tou") r.charges.usage = [{ ...r.charges.usage[0], kind: "time-of-use", days: [1, 2, 3, 4, 5, 6, 7], start: "00:00", end: "24:00", timezone: "Pacific/Auckland" }];
    if (scenario === "gst") r.gst.treatment = "exclusive";
    if (scenario === "meter") r.metering.configuration = "standard";
    if (scenario === "network") r.coverage.networkIds = ["unknown"];
    if (scenario === "stale") r.provenance.collectedAt = "2026-10-01T00:00:00.000Z";
    if (scenario === "missing-fixed") { r.charges.daily = []; expect(() => assess(data, receipt)).toThrow(); return; }
    expect(assess(data, receipt).rating).toBe("unknown");
  });
});
