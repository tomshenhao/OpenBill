import { describe, expect, it } from "vitest";
import { usagePeriod, usageInputRequirement } from "@/domain/electricity/input-journey";
import { regionalBenchmark } from "@/data/electricity/analysis-data";

const input = { kwh: "223", region: "NZ-AUK", start: "2026-06-01", end: "2026-06-30", month: "2025-01", fullCalendarMonth: true };
describe("progressive usage inputs", () => {
  it("derives dates and ignores an inactive month without asking for a bill total", () => {
    expect(usagePeriod(input, "dates")).toMatchObject({ days: 30, month: "2026-06", fullCalendarMonth: true });
    expect(usageInputRequirement(regionalBenchmark, input, "dates")).toBeNull();
  });
  it("uses only a confirmed month and ignores stale date inputs", () => {
    expect(usagePeriod(input, "month")).toEqual({ days: 31, month: "2025-01", fullCalendarMonth: true, start: "", end: "" });
    expect(usagePeriod({ ...input, month: "2024-02" }, "month").days).toBe(29);
    expect(usagePeriod({ ...input, fullCalendarMonth: false }, "month").days).toBe(0);
  });
  it.each([
    [{ kwh: "" }, "kwh"], [{ kwh: "-1" }, "kwh"], [{ region: "" }, "region"],
    [{ start: "" }, "dates"], [{ end: "2026-05-31" }, "dates"], [{ start: "2026-06-02" }, "cross-month"],
    [{ start: "2026-05-16", end: "2026-06-15" }, "cross-month"],
    [{ start: "2026-09-01", end: "2026-09-30" }, "missing-data"],
  ])("identifies the next actual requirement: %j", (changes, expected) => {
    expect(usageInputRequirement(regionalBenchmark, { ...input, ...changes }, "dates")).toBe(expected);
  });
  it("distinguishes month confirmation from unavailable source data", () => {
    expect(usageInputRequirement(regionalBenchmark, { ...input, month: "" }, "month")).toBe("month");
    expect(usageInputRequirement(regionalBenchmark, { ...input, fullCalendarMonth: false }, "month")).toBe("confirmation");
    expect(usageInputRequirement(regionalBenchmark, { ...input, month: "2026-09" }, "month")).toBe("missing-data");
  });
  it("handles unsupported years and invalid calendar dates without throwing", () => {
    for (const start of ["1999-01-01", "2100-01-01", "2026-02-30", "invalid"]) expect(usagePeriod({ ...input, start }, "dates").days).toBe(0);
  });
});
