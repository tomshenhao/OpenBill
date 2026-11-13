import { describe, it, expect } from "vitest";
import { regionalBenchmark, regionalDistribution } from "@/data/electricity/analysis-data";
import { benchmarkUsage, benchmarkRequirement, distributionSchema, availableBenchmarkMonths } from "@/domain/electricity/benchmark";
import { rateWarnings, flatDiagnosticSupported } from "@/domain/electricity/input-guidance";
import { analyseBill } from "@/domain/electricity/bill";
describe("Task 004.1 evidence and units", () => {
  const input = { region: "NZ-NTL", month: "2025-01", days: 31, kwh: "400", fullCalendarMonth: true };
  it("matches real published regional quantiles without manufacturing household peers", () => {
    const result = benchmarkUsage(regionalBenchmark, { ...input, people: 2 }, regionalDistribution);
    expect(result).toMatchObject({ householdSizeMatched: false, centralRange: { p25Kwh: 260, medianKwh: 400, p75Kwh: 587, position: "within" } });
    expect(benchmarkUsage(regionalBenchmark, { ...input, people: 6 }, regionalDistribution)).toEqual(result);
    expect(result).not.toHaveProperty("percentile");
    expect(benchmarkUsage(regionalBenchmark, { ...input, kwh: "900" }, regionalDistribution)).toMatchObject({ centralRange: { position: "above" } });
    expect(benchmarkUsage(regionalBenchmark, { ...input, kwh: "0" }, regionalDistribution)).toMatchObject({ centralRange: { position: "below" } });
  });
  it("explains partial and unconfirmed months and never invents future periods", () => {
    expect(benchmarkRequirement(regionalBenchmark, { ...input, days: 30 })).toBe("day-count");
    expect(benchmarkRequirement(regionalBenchmark, { ...input, fullCalendarMonth: false })).toBe("confirmation");
    expect(availableBenchmarkMonths(regionalBenchmark)).toHaveLength(20);
    expect(availableBenchmarkMonths(regionalBenchmark)[0]).toBe("2026-08");
    const invalid = structuredClone(regionalDistribution); invalid.rows[0].p25Kwh = 99999;
    expect(distributionSchema.safeParse(invalid).success).toBe(false);
  });
  it("warns nonblockingly about possible dollar/cent and daily/monthly mistakes", () => {
    expect(rateWarnings({ dailyNzd: "145", usageCents: "0.29", gst: "inclusive", dailyGst: "exclusive", usageGst: "inclusive" })).toEqual(["sub-cent", "daily-unit", "mixed-gst"]);
    expect(analyseBill({ days: "30", kwh: "300", totalNzd: "120", gst: "inclusive", representativeYear: false, components: { dailyNzd: "1.45", usageCents: "29", dailyGst: "inclusive", usageGst: "inclusive" } }).componentCents).toBe(13050n);
    expect(flatDiagnosticSupported({ timeOfUse: false, meter: "controlled" })).toBe(false);
    expect(flatDiagnosticSupported({ timeOfUse: false, meter: "smart" })).toBe(true);
  });
});
