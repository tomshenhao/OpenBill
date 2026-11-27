import { describe, expect, it } from "vitest";
import { checkWaterBill, emptyWaterBill, extractWatercareBill, waterBillDate, type WaterBillValues } from "../src/domain/water/pdf-bill.ts";

const reference = { lowerLitres: 140, upperLitres: 170 };
const schedules = [{ from: "2025-07-01", until: "2026-07-01", url: "https://example.test/schedule" }];
const values: WaterBillValues = { ...emptyWaterBill, previousDate: "2026-05-01", currentDate: "2026-05-31", days: "30", kl: "12.34",
  waterRate: "2.15", waterAmount: "26.53", wastewaterPercent: "78.5", wastewaterKl: "9.69", wastewaterRate: "3.95", wastewaterAmount: "38.28", annualFixedRate: "365", fixedAmount: "30.00", gst: "12.37", currentCharges: "94.81", amountDue: "114.81" };

describe("Watercare PDF calculations", () => {
  it("uses the billed rounded wastewater volume, prorates fixed charges and extracts the GST share", () => {
    const result = checkWaterBill(values, "3", reference, schedules);
    expect(result.usage).toMatchObject({ ok: true, householdDaily: 12340 / 30, personDaily: 12340 / 90 });
    expect(result.estimate).toMatchObject({ water: 26.53, wastewater: 38.28, fixed: 30, total: 94.81, gst: 12.37 });
    expect(result.discrepancies).toEqual([]);
    expect(checkWaterBill({ ...values, wastewaterKl: "9.68" }, "3", reference, schedules).discrepancies).toContain("wastewaterKl");
    expect(checkWaterBill({ ...values, gst: "14.22" }, "3", reference, schedules).discrepancies).toEqual(["gst"]);
  });

  it("gates split schedules and distinguishes the usage reference boundaries", () => {
    expect(checkWaterBill({ ...values, days: "31" }, "3", reference, schedules)).toMatchObject({ periodMismatch: true, estimate: null });
    expect(checkWaterBill({ ...values, previousDate: "2025-06-15", currentDate: "2025-07-15" }, "3", reference, schedules)).toMatchObject({ schedule: { status: "split" }, estimate: null });
    expect(["14.849", "14.850", "15.300", "15.301"].map((kl) => checkWaterBill({ ...values, kl }, "3", reference, schedules).efficiency)).toEqual(["meets", "near", "near", "above"]);
    expect(checkWaterBill(values, "2", reference, schedules).efficiency).toBe("above");
    expect(checkWaterBill({ ...values, wastewaterKl: "" }, "3", reference, schedules).estimate).toBeNull();
    expect(waterBillDate("31-Feb-26")).toBeUndefined();
    expect(waterBillDate("1/7/2026")).toBe("2026-07-01");
  });

  it("keeps allowlisted partial charges, ignoring history, identifiers and unanchored charts", () => {
    const rows = ["Watercare", "SYNTHETIC IDENTIFIER", "Water consumption $7.01", "Balance of current charges $20.00", "Previous balance $12.00", "Total amount due $32.00", "Chart 155 L"];
    const result = extractWatercareBill([rows.map((text, i) => ({ text, x: 10, y: 100 - 8 * i }))], true);
    expect(result).toMatchObject({ values: { waterAmount: "7.01", currentCharges: "20.00", amountDue: "32.00", days: "" }, historicalBenchmark: false, unreadablePage: true });
    expect(JSON.stringify(result)).not.toContain("SYNTHETIC");
  });
});
