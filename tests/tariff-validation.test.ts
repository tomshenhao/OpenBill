import { describe, expect, it } from "vitest";
import { evidenceSchema, tariffSchema, type ElectricityTariff } from "@/domain/electricity/tariff";
import { validateHistory, validateTariff } from "@/domain/electricity/validation";
import { chargeInNanoNzd, nzdToMicros, roundNanoNzdToCents } from "@/domain/electricity/money";
import { syntheticTariff, testNow, testPolicy } from "./fixtures/electricity";

const codes = (record: unknown) => validateTariff(record, testPolicy, testNow).issues.map((issue) => issue.code);

describe("tariff schema and quality - all prices synthetic", () => {
  it("accepts a complete synthetic flat-rate record without verifying it", () => {
    expect(codes(syntheticTariff())).toEqual([]);
    expect(tariffSchema.parse(syntheticTariff()).status).toBe("pending-verification");
  });
  it.each(Object.keys(syntheticTariff()))("requires top-level field %s", (key) => {
    const record = { ...syntheticTariff() } as Record<string, unknown>;
    delete record[key];
    expect(tariffSchema.safeParse(record).success).toBe(false);
  });
  it.each(["-1", "NaN", "Infinity", "0.1234567", "1e-2", "1,00", "", " 0.2", "01.0"])("rejects an invalid exact price %s", (amount) => {
    const record = syntheticTariff(); record.charges.usage[0].price.amount = amount;
    expect(codes(record)).toContain("schema");
  });
  it.each(["USD", "cents/kWh", "NZD/kW", "NZD/month"])("rejects wrong currency/units %s", (wrong) => {
    const record = syntheticTariff();
    expect(tariffSchema.safeParse({ ...record, charges: { ...record.charges, daily: [{ ...record.charges.daily[0], price: { amount: "1", currency: wrong, unit: wrong } }] } }).success).toBe(false);
  });
  it("rejects extra household fields and self-verified status", () => {
    expect(tariffSchema.safeParse({ ...syntheticTariff(), address: "SYNTHETIC" }).success).toBe(false);
    expect(tariffSchema.safeParse({ ...syntheticTariff(), status: "verified" }).success).toBe(false);
  });
  it.each(["2026-02-30", "2026-13-01", "01/11/2026"])("rejects invalid dates %s", (effectiveFrom) => {
    expect(codes({ ...syntheticTariff(), effectiveFrom })).toContain("schema");
  });
  it("checks effective windows and collection chronology", () => {
    expect(codes({ ...syntheticTariff(), effectiveTo: "2026-11-01" })).toContain("invalid-effective-window");
    const record = syntheticTariff(); record.provenance.collectedAt = "2026-12-01T00:00:00.000Z";
    expect(codes(record)).toContain("future-collection");
  });
  it.each(["https://evil.example/tariffs", "https://retailer.example/private", "https://retailer.example/tariffs?icp=synthetic", "http://retailer.example/tariffs", "https://user:pass@retailer.example/tariffs"])("rejects unapproved/personalised source %s", (sourceUrl) => {
    const record = syntheticTariff(); record.provenance.sourceUrl = sourceUrl;
    expect(codes(record).length).toBeGreaterThan(0);
  });
  it("rejects unsupported region and network assumptions", () => {
    const record = syntheticTariff(); record.coverage.regionCodes = ["NZ-CAN"];
    expect(codes(record)).toContain("unsupported-network-region");
    record.coverage.networkIds = ["unknown-network"];
    expect(codes(record)).toContain("unsupported-network-region");
    expect(codes({ ...record, coverage: { ...record.coverage, regionCodes: ["nationwide"] } })).toContain("schema");
  });
  it("checks register IDs, charge IDs, eligibility ranges and GST", () => {
    const record = syntheticTariff(); record.metering.registers = ["unknown"];
    expect(codes(record)).toContain("register-mismatch");
    record.charges.daily.push(record.charges.daily[0]); expect(codes(record)).toContain("duplicate-charge-id");
    record.eligibility.minimumAnnualKwh = "10"; record.eligibility.maximumAnnualKwh = "1";
    expect(codes(record)).toContain("invalid-eligibility-range");
    record.gst = { ...record.gst, treatment: "exclusive", ratePercent: null };
    expect(codes(record)).toContain("missing-gst-rate");
    record.gst.ratePercent = "101"; expect(codes(record)).toContain("invalid-gst-rate");
  });
  it("validates overnight periods over the week boundary", () => {
    const record = syntheticTariff(); const base = record.charges.usage[0];
    record.charges.usage = [
      { ...base, kind: "time-of-use", id: "day", days: [1, 2, 3, 4, 5, 6, 7], start: "07:00", end: "23:00", timezone: "Pacific/Auckland" },
      { ...base, kind: "time-of-use", id: "night", days: [1, 2, 3, 4, 5, 6, 7], start: "23:00", end: "07:00", timezone: "Pacific/Auckland" },
    ];
    expect(codes(record)).toEqual([]);
    record.charges.usage.push({ ...record.charges.usage[1], id: "overlap" });
    expect(codes(record)).toContain("overlapping-periods");
    record.charges.usage = [record.charges.usage[0]];
    expect(codes(record)).toContain("uncovered-periods");
  });
  it("rejects empty periods and mixed structures on one register", () => {
    const record = syntheticTariff(); const base = record.charges.usage[0];
    record.charges.usage = [{ ...base, kind: "time-of-use", days: [1, 1], start: "07:00", end: "07:00", timezone: "Pacific/Auckland" }];
    expect(codes(record)).toEqual(expect.arrayContaining(["empty-period", "duplicate-weekdays", "uncovered-periods"]));
    record.charges.usage.push({ ...base, id: "flat" }); expect(codes(record)).toContain("conflicting-rate-structures");
  });
  it("keeps controlled registers independent", () => {
    const record = syntheticTariff(); record.metering.registers.push("controlled");
    record.charges.usage.push({ ...record.charges.usage[0], id: "controlled", register: "controlled", label: "Synthetic controlled" });
    expect(codes(record)).toEqual([]);
  });
  it("checks tier ordering, overlaps, reset periods and coverage", () => {
    const record = syntheticTariff(); const base = record.charges.usage[0];
    record.charges.usage = [{ ...base, kind: "tiered", fromKwh: "0", toKwh: "10", reset: "billing-period" }, { ...base, id: "tier2", kind: "tiered", fromKwh: "10", toKwh: null, reset: "billing-period" }];
    expect(codes(record)).toEqual([]);
    const second = record.charges.usage[1]; if (second.kind === "tiered") second.fromKwh = "9";
    expect(codes(record)).toContain("conflicting-tiers");
  });
  it("validates required evidence metadata and safe paths", () => {
    expect(evidenceSchema.safeParse({}).success).toBe(false);
  });
});

describe("immutable revision history", () => {
  const next = (original: ElectricityTariff) => ({ ...structuredClone(original), recordId: "synthetic-r2", revision: "r2", supersedes: original.recordId, effectiveFrom: "2026-11-10" });
  it("permits explicit supersession without deleting history", () => {
    const first = syntheticTariff(); expect(validateHistory([first, next(first)])).toEqual([]);
  });
  it("rejects duplicate records/revisions, overlapping unlinked revisions and missing ancestors", () => {
    const first = syntheticTariff();
    expect(validateHistory([first, first]).map((issue) => issue.code)).toContain("duplicate-record");
    expect(validateHistory([first, { ...next(first), supersedes: null }]).map((issue) => issue.code)).toContain("overlapping-revisions");
    expect(validateHistory([next(first)]).map((issue) => issue.code)).toContain("invalid-supersession");
  });
  it("rejects cycles and superseding a different eligibility scope", () => {
    const first = syntheticTariff(); const second = next(first); first.supersedes = second.recordId;
    expect(validateHistory([first, second]).map((issue) => issue.code)).toContain("history-cycle");
    first.supersedes = null; second.eligibility.userCategory = "low";
    expect(validateHistory([first, second]).map((issue) => issue.code)).toContain("invalid-supersession");
  });
});

describe("exact synthetic charge arithmetic", () => {
  it("preserves source precision and rounds once, half up", () => {
    expect(nzdToMicros("0.123456")).toBe(123456n);
    const rate = { amount: "0.1", currency: "NZD", unit: "NZD/kWh" } as const;
    const total = chargeInNanoNzd(rate, { amount: "0.025", unit: "kWh" }) * 2n;
    expect(total).toBe(5_000_000n); expect(roundNanoNzdToCents(total)).toBe(1n);
  });
  it("handles fixed and usage charge units without floating-point errors", () => {
    expect(chargeInNanoNzd({ amount: "1.25", currency: "NZD", unit: "NZD/day" }, { amount: "30", unit: "day" })).toBe(37_500_000_000n);
    expect(chargeInNanoNzd({ amount: "0.25", currency: "NZD", unit: "NZD/kWh" }, { amount: "300.123", unit: "kWh" })).toBe(75_030_750_000n);
  });
  it("rejects mismatched units, negative quantities and excess precision", () => {
    const rate = { amount: "1", currency: "NZD", unit: "NZD/day" } as const;
    expect(() => chargeInNanoNzd(rate, { amount: "30", unit: "kWh" })).toThrow();
    expect(() => chargeInNanoNzd(rate, { amount: "-1", unit: "day" })).toThrow();
    expect(() => chargeInNanoNzd(rate, { amount: "1.5", unit: "day" })).toThrow();
    expect(() => roundNanoNzdToCents(-1n)).toThrow();
  });
});
