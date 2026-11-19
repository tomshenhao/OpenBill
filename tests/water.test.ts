import { describe, expect, it } from "vitest";
import { watercare } from "@/data/water/watercare";
import { assessWaterUsage, estimateWaterCharges, findWaterSchedule, type WaterUsage } from "@/domain/water/analysis";

const usage: WaterUsage = { occupants: "3", volume: "13.5", unit: "kL", days: "30" };

describe("Auckland water usage", () => {
  it("accepts litres and kilolitres and scales the general reference by household size", () => {
    const result = assessWaterUsage(usage, watercare.reference);
    expect(result).toMatchObject({
      ok: true, millilitres: 13_500_000, days: 30, householdDaily: 450, personDaily: 150,
      comparison: "within", householdLower: 420, householdUpper: 510,
    });
    expect(assessWaterUsage({ ...usage, unit: "L", volume: "13500" }, watercare.reference)).toEqual(result);
  });

  it.each([["0", "below"], ["12.599", "below"], ["12.6", "within"], ["15.3", "within"], ["15.301", "above"]])(
    "compares %s kL using the unrounded general reference, without a rating or percentile", (volume, comparison) => {
      const result = assessWaterUsage({ ...usage, volume }, watercare.reference);
      expect(result).toMatchObject({ ok: true, comparison });
      expect(result).not.toHaveProperty("percentile");
      expect(result).not.toHaveProperty("rating");
    },
  );

  it.each([["occupants", ""], ["occupants", "1.5"], ["occupants", "0"], ["volume", ""], ["volume", "-1"], ["volume", "1e2"], ["days", ""], ["days", "0"], ["days", "367"]] as const)(
    "rejects invalid %s value %s", (field, value) => {
      expect(assessWaterUsage({ ...usage, [field]: value }, watercare.reference)).toEqual({ ok: false, invalid: field });
    },
  );
});

describe("Watercare dates and estimated charges", () => {
  it("selects the official source at both sides of the effective-date boundary", () => {
    const schedules = watercare.schedules;
    expect(findWaterSchedule(schedules, "2026-06-30", 30)).toMatchObject({ status: "matched", schedule: { from: "2025-07-01" } });
    expect(findWaterSchedule(schedules, "2026-07-01", 1)).toMatchObject({ status: "matched", schedule: { from: "2026-07-01" } });
    expect(findWaterSchedule(schedules, "2026-07-30", 30)).toMatchObject({ status: "matched", schedule: { from: "2026-07-01" } });
    expect(findWaterSchedule(schedules, "2026-07-29", 30)).toEqual({ status: "split" });
    expect(findWaterSchedule(schedules, "2027-07-01", 1)).toEqual({ status: "unavailable" });
    expect(findWaterSchedule(schedules, "2020-06-30", 1)).toEqual({ status: "unavailable" });
    expect(findWaterSchedule(schedules, "2026-02-29", 1)).toEqual({ status: "invalid" });
    expect(findWaterSchedule(schedules, "2024-02-29", 31)).toMatchObject({ status: "matched", scheduleDays: 366 });
  });

  const bill = {
    millilitres: 13_500_000, days: 30, scheduleDays: 365,
    rates: { water: "2.501", wastewater: "4.001", annual: "365.00" },
    wastewaterPercent: 78.5, gstPercent: 15, billTotal: "110.00",
  };

  it("estimates water, wastewater and fixed components with GST already included", () => {
    expect(estimateWaterCharges(bill)).toMatchObject({
      ok: true, water: 33.76, wastewater: 42.4, fixed: 30, total: 106.16, gst: 13.85, difference: 3.84,
    });
  });

  it("uses the confirmed apartment factor and supports a leap-year fixed estimate", () => {
    expect(estimateWaterCharges({ ...bill, wastewaterPercent: 95, scheduleDays: 366, billTotal: "" }))
      .toMatchObject({ ok: true, wastewater: 51.31, fixed: 29.92, difference: null });
  });

  it("validates manual rates and charges and preserves the fixed charge at zero usage", () => {
    expect(estimateWaterCharges({ ...bill, rates: { ...bill.rates, wastewater: "" } })).toEqual({ ok: false, invalid: "wastewater" });
    expect(estimateWaterCharges({ ...bill, billTotal: "0.001" })).toEqual({ ok: false, invalid: "billTotal" });
    expect(estimateWaterCharges({ ...bill, millilitres: 0 })).toMatchObject({ ok: true, water: 0, wastewater: 0, fixed: 30, total: 30 });
  });
});
