import { describe, expect, it } from "vitest";
import { analyseBill, billSchema, centsToNzd } from "@/domain/electricity/bill";

// SYNTHETIC household values, never a retailer tariff or real bill.
const bill = { days: "30", kwh: "300", totalNzd: "120", gst: "inclusive", representativeYear: false };
describe("local bill analysis", () => {
  it("keeps full-total blended cost separate from a marginal supplier rate", () => {
    const result = analyseBill(bill);
    expect(result).toMatchObject({ kwh: 300, totalCents: 12000n, dailyKwh: 10, dailyNzd: 4, blendedCentsPerKwh: 40, annualisedKwh: 3650, annualNzd: null });
  });
  it("normalises exclusive total and mixed component tax bases exactly once", () => {
    const result = analyseBill({ ...bill, totalNzd: "100", gst: "exclusive", components: { dailyNzd: "1", usageCents: "20", dailyGst: "exclusive", usageGst: "inclusive" } });
    expect(result.totalCents).toBe(11500n); expect(result.componentCents).toBe(9450n); expect(result.componentDifferenceCents).toBe(2050n);
    expect(result.dailyNzd).toBeCloseTo(115 / 30);
  });
  it("converts cents/kWh without treating cents as dollars", () => {
    expect(centsToNzd("12.3456")).toBe("0.123456");
    expect(() => centsToNzd("1e2")).toThrow();
    expect(analyseBill({ ...bill, kwh: "1.001", components: { dailyNzd: "1.234567", usageCents: "12.3456", dailyGst: "inclusive", usageGst: "inclusive" } }).componentCents).toBe(3716n);
  });
  it("requires a confirmed full year for annual spending and handles leap years", () => {
    expect(analyseBill({ ...bill, representativeYear: true }).annualNzd).toBeNull();
    expect(analyseBill({ ...bill, days: "365", representativeYear: true }).annualNzd).toBe(120);
    expect(analyseBill({ ...bill, days: "366", representativeYear: true }).annualNzd).toBeCloseTo(120 / 366 * 365);
    expect(analyseBill({ ...bill, days: "365" }).annualNzd).toBeNull();
  });
  it("handles zero consumption without infinity", () => {
    expect(analyseBill({ ...bill, kwh: "0", totalNzd: "0" })).toMatchObject({ blendedCentsPerKwh: null, annualisedKwh: 0, dailyNzd: 0 });
  });
  it("requires non-overlapping breakdown parts to match the exact total", () => {
    expect(analyseBill({ ...bill, kwh: "0.3", usageBreakdown: { peak: "0.1", offPeak: "0.2", controlled: "0" } }).usageBreakdown).toEqual({ peak: "0.1", offPeak: "0.2", controlled: "0" });
    expect(() => analyseBill({ ...bill, usageBreakdown: { peak: "300", offPeak: "0", controlled: "10" } })).toThrow("partition");
    expect(billSchema.safeParse({ ...bill, usageBreakdown: { peak: "300", offPeak: "0", controlled: "" } }).success).toBe(false);
  });
  it.each([
    { days: "0" }, { days: "367" }, { days: "1.5" }, { kwh: "-1" }, { kwh: "100001" }, { kwh: "1e3" }, { kwh: "1,000" }, { kwh: "0.0001" }, { totalNzd: "NaN" }, { totalNzd: "-20" }, { totalNzd: "10.001" }, { gst: "unknown" }, { days: "" }, { totalNzd: "" },
  ])("rejects unsupported input %j", (changes) => { expect(billSchema.safeParse({ ...bill, ...changes }).success).toBe(false); });
});
