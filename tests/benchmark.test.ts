import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { regionalBenchmark } from "@/data/electricity/analysis-data";
import { benchmarkSchema, benchmarkUsage, daysInMonth } from "@/domain/electricity/benchmark";
import { importBenchmark } from "../tools/electricity/benchmark-import.ts";
import { parseCsv } from "../tools/electricity/csv.ts";

const input = { region: "NZ-NTL", month: "2025-01", days: 31, kwh: "922", fullCalendarMonth: true };
describe("official aggregate benchmark", () => {
  it("reproduces all 320 observations from preserved original bytes", () => {
    const bytes = readFileSync(resolve("data/electricity/benchmarks/source/emi-2025-01-2026-08.csv"));
    expect(importBenchmark(bytes, regionalBenchmark.source.collectedAt)).toEqual(regionalBenchmark);
    expect(regionalBenchmark.source.verification).toBe("source-checked-not-independently-reviewed");
    expect(regionalBenchmark.rows).toHaveLength(320);
  });
  it("computes only a difference from a matching monthly mean", () => {
    expect(benchmarkUsage(regionalBenchmark, input)).toMatchObject({ available: true, meanKwh: 461, differenceKwh: 461, differencePercent: 100, coveragePercent: 91.74 });
    expect(benchmarkUsage(regionalBenchmark, { ...input, kwh: "230.5" })).toMatchObject({ differencePercent: -50 });
    expect(benchmarkUsage(regionalBenchmark, { ...input, kwh: "0" })).toMatchObject({ differencePercent: -100 });
  });
  it("never silently substitutes winter/annual/another-year observations", () => {
    expect(benchmarkUsage(regionalBenchmark, { ...input, days: 30 })).toEqual({ available: false, reason: "period" });
    expect(benchmarkUsage(regionalBenchmark, { ...input, fullCalendarMonth: false })).toEqual({ available: false, reason: "period" });
    for (const month of ["2024-01", "2026-11"]) expect(benchmarkUsage(regionalBenchmark, { ...input, month, days: daysInMonth(month) })).toEqual({ available: false, reason: "missing" });
    expect(benchmarkUsage(regionalBenchmark, { ...input, region: "NZ-CIT" })).toEqual({ available: false, reason: "missing" });
  });
  it("does not invent household-size peers or percentiles from means", () => {
    const result = benchmarkUsage(regionalBenchmark, { ...input, people: 1 });
    expect(benchmarkUsage(regionalBenchmark, { ...input, people: 7 })).toEqual(result);
    expect(result).not.toHaveProperty("percentile");
    expect(regionalBenchmark.source.householdSizeStratified).toBe(false);
    expect(benchmarkUsage(regionalBenchmark, { ...input, people: -1 })).toEqual({ available: false, reason: "invalid" });
  });
  it("rejects duplicate, invalid and out-of-period observations", () => {
    const copy = structuredClone(regionalBenchmark); copy.rows.push(copy.rows[0]);
    expect(benchmarkSchema.safeParse(copy).success).toBe(false);
    copy.rows = [{ ...copy.rows[0], meanKwh: -1 }]; expect(benchmarkSchema.safeParse(copy).success).toBe(false);
    copy.rows = [{ ...regionalBenchmark.rows[0], month: "2024-01" }]; expect(benchmarkSchema.safeParse(copy).success).toBe(false);
    expect(daysInMonth("2024-02")).toBe(29); expect(daysInMonth("2025-02")).toBe(28);
  });
  it("parses escaped CSV cells and rejects malformed quoting", () => {
    expect(parseCsv('a,"b,c","d""e"\r\nf,g,h\n')).toEqual([["a", "b,c", 'd"e'], ["f", "g", "h"]]);
    expect(() => parseCsv('a,"unclosed')).toThrow(); expect(() => parseCsv('"a"b,c')).toThrow();
  });
});
