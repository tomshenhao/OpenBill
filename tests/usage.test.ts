import { describe, expect, it } from "vitest";
import { calculateUsage } from "@/domain/electricity/usage";

describe("electricity usage (synthetic inputs only)", () => {
  it("divides consumption by the actual billing period", () => {
    expect(calculateUsage({ kwh: "372", days: "31" })).toEqual({ ok: true, summary: { kwh: 372, days: 31, dailyKwh: 12 } });
  });

  it("accepts zero consumption without treating it as missing", () => {
    expect(calculateUsage({ kwh: "0", days: "30" })).toEqual({ ok: true, summary: { kwh: 0, days: 30, dailyKwh: 0 } });
  });

  it("accepts fractional kWh and does not round intermediate results", () => {
    const result = calculateUsage({ kwh: " 123.456 ", days: " 29 " });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.summary.dailyKwh).toBeCloseTo(4.257103448275862, 12);
  });

  it("accepts the guardrail limits", () => {
    expect(calculateUsage({ kwh: "100000", days: "366" }).ok).toBe(true);
    expect(calculateUsage({ kwh: "0.001", days: "1" }).ok).toBe(true);
  });

  it("reports missing fields separately", () => {
    expect(calculateUsage({ kwh: " ", days: "" })).toEqual({ ok: false, errors: { kwh: "usageRequired", days: "daysRequired" } });
  });

  it.each(["-1", "NaN", "Infinity", "1e3", "1,234", "1.0001", "12kWh", "100000.001", "1.2.3", ".5", "+30", "300$"])("rejects invalid or ambiguous kWh: %s", (kwh) => {
    expect(calculateUsage({ kwh, days: "30" })).toEqual({ ok: false, errors: { kwh: "usageInvalid" } });
  });

  it.each(["0", "-1", "30.5", "367", "NaN", "Infinity", "3e1", "30days"])("rejects invalid days: %s", (days) => {
    expect(calculateUsage({ kwh: "300", days })).toEqual({ ok: false, errors: { days: "daysInvalid" } });
  });

  it("does not mutate inputs or add tariff estimates", () => {
    const input = Object.freeze({ kwh: "300", days: "30" });
    const result = calculateUsage(input);
    expect(input).toEqual({ kwh: "300", days: "30" });
    expect(result).toEqual({ ok: true, summary: { kwh: 300, days: 30, dailyKwh: 10 } });
  });
});
