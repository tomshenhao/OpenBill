import { describe, expect, it } from "vitest";
import { comparePeriodPlans, periodTariffCost, type ComparisonEntry } from "@/domain/electricity/comparison";
import { syntheticTariff, syntheticReview, testPolicy, testNow, hash } from "./fixtures/electricity.ts";

// SYNTHETIC TEST ONLY: these rates are never imported or bundled for consumers.
const scope = { region: "NZ-AUK", network: "synthetic-network", metering: "smart", userCategory: "standard", registers: ["uncontrolled"] } as const;
const profile = { days: 30, registerKwh: { uncontrolled: "223" } };
const options = { now: testNow, asOf: "2026-11-13", allowSynthetic: true };
function entry(): ComparisonEntry {
  return { record: syntheticTariff(), recordSha256: hash, review: syntheticReview("synthetic-r1", hash), rights: { recordId: "synthetic-r1", recordSha256: hash, permissionReference: "SYNTHETIC ONLY", reviewedBy: "rights-reviewer", reviewedAt: "2026-11-12T12:00:00.000Z" } };
}
const compare = (entries: ComparisonEntry[], changes = {}, opts = {}) => comparePeriodPlans({ schemaVersion: 1, entries }, testPolicy, { ...scope, registers: [...scope.registers], ...changes }, profile, { ...options, ...opts });
describe("equivalent-period offers", () => {
  it("costs exact daily and usage components with one final rounding and no annual forecast", () => {
    const r = entry().record;
    r.charges.daily[0].price.amount = "1.45"; r.charges.usage[0].price.amount = "0.29";
    expect(periodTariffCost(r, profile)).toBe(10817n);
    const result = compare([entry()]);
    expect(result.marketCoverage).toBe("partial"); expect(result.rows[0].differenceCents).toBeNull();
    expect(result.rows[0]).not.toHaveProperty("annualCents");
  });
  it("requires an eligible baseline, never the user's total bill", () => {
    expect(compare([entry()], {}, { currentRecordId: "unknown" }).rows[0].differenceCents).toBeNull();
    expect(compare([entry()], {}, { currentRecordId: "synthetic-r1" }).rows[0].differenceCents).toBe(0n);
  });
  it("does not revive superseded prices when a replacement is rejected", () => {
    const first = entry(), next = entry();
    next.record.recordId = "synthetic-r2"; next.record.revision = "r2"; next.record.supersedes = first.record.recordId;
    next.record.effectiveFrom = "2026-11-13"; next.review.recordId = next.record.recordId;
    next.review.status = "rejected"; next.rights.recordId = next.record.recordId;
    expect(compare([first, next]).rows).toEqual([]);
  });
  it.each([{ network: "unknown" }, { metering: "standard" }, { userCategory: "low" }, { region: "NZ-CAN" }, { registers: ["controlled"] }])("refuses unmatched scope %j", (change) => {
    expect(compare([entry()], change).rows).toEqual([]);
  });
  it.each(["stale", "rights", "discount", "contract", "gst", "expired", "review"])("excludes %s offers", (scenario) => {
    const e = entry();
    if (scenario === "stale") e.record.provenance.collectedAt = "2026-10-01T00:00:00.000Z";
    if (scenario === "rights") e.rights.recordSha256 = "b".repeat(64);
    if (scenario === "discount") e.record.contract.discounts = [{ description: "SYNTHETIC", conditions: "Unresolved" }];
    if (scenario === "contract") e.record.contract.termMonths = 12;
    if (scenario === "gst") e.record.gst.treatment = "exclusive";
    if (scenario === "expired") e.record.effectiveTo = "2026-11-13";
    if (scenario === "review") e.review.status = "rejected";
    expect(compare([e]).rows).toEqual([]);
  });
  it("excludes TOU totals, empty data and synthetic production offers", () => {
    const e = entry(); const band = e.record.charges.usage[0];
    e.record.charges.usage = [{ ...band, kind: "time-of-use", days: [1, 2, 3, 4, 5, 6, 7], start: "00:00", end: "24:00", timezone: "Pacific/Auckland" }];
    expect(compare([e]).excluded[0].reason).toBe("profile");
    expect(compare([]).rows).toEqual([]);
    expect(compare([entry()], {}, { allowSynthetic: false }).rows).toEqual([]);
  });
  it.each([0, -1, 367, 1.5])("refuses invalid billing days %s", (days) => {
    expect(() => periodTariffCost(entry().record, { ...profile, days })).toThrow();
  });
});
