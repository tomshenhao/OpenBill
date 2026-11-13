import { describe, expect, it } from "vitest";
import { annualTariffCost, comparePlans, type ComparisonEntry, type AnnualProfile } from "@/domain/electricity/comparison";
import { comparisonPlans } from "@/data/electricity/analysis-data";
import { syntheticTariff, syntheticReview, testPolicy, testNow, hash } from "./fixtures/electricity.ts";

// Everything in this suite except the empty catalogue is SYNTHETIC TEST ONLY.
function entry(): ComparisonEntry {
  return { record: syntheticTariff(), recordSha256: hash, review: syntheticReview("synthetic-r1", hash), rights: { recordId: "synthetic-r1", recordSha256: hash, permissionReference: "SYNTHETIC RIGHTS FIXTURE ONLY", reviewedBy: "rights-reviewer", reviewedAt: "2026-11-12T12:00:00.000Z" } };
}
const scope = { region: "NZ-AUK", network: "synthetic-network", metering: "smart", userCategory: "standard", registers: ["uncontrolled"] } as const;
const profile: AnnualProfile = { year: 2025, representative: true, registerKwh: { uncontrolled: "3650" } };
const options = { now: testNow, asOf: "2026-11-13", allowSynthetic: true };
function compare(entries: ComparisonEntry[], changes = {}) { return comparePlans({ schemaVersion: 1, entries }, testPolicy, { ...scope, registers: [...scope.registers], ...changes }, profile, options); }
describe("verified comparison engine", () => {
  it("keeps the production catalogue empty and refuses synthetic offers by default", () => {
    expect(comparisonPlans.entries).toEqual([]); expect(compare([]).rows).toEqual([]);
    expect(comparePlans({ schemaVersion: 1, entries: [entry()] }, testPolicy, { ...scope, registers: [...scope.registers] }, profile, { ...options, allowSynthetic: false }).rows).toEqual([]);
  });
  it("calculates fixed + usage with exact units and one final rounding", () => {
    expect(compare([entry()]).rows[0].annualCents).toBe(90123n);
    expect(compare([entry()]).rows[0].differenceCents).toBeNull();
  });
  it("ranks the same profile and derives differences only from an eligible verified current plan", () => {
    const a = entry(), b = entry();
    b.record.recordId = "synthetic-cheaper"; b.record.plan.id = "cheaper-plan";
    b.record.charges.usage[0].price.amount = "0.1"; b.review.recordId = b.record.recordId; b.rights.recordId = b.record.recordId;
    const bundle = { schemaVersion: 1, entries: [a, b] };
    const result = comparePlans(bundle, testPolicy, { ...scope, registers: [...scope.registers] }, profile, { ...options, currentRecordId: a.record.recordId });
    expect(result.rows.map((r) => r.entry.record.recordId)).toEqual([b.record.recordId, a.record.recordId]);
    expect(result.rows[0].differenceCents).toBe(-8561n);
    expect(comparePlans(bundle, testPolicy, { ...scope, registers: [...scope.registers] }, profile, { ...options, currentRecordId: "unknown" }).rows.every((r) => r.differenceCents === null)).toBe(true);
  });
  it.each([{ region: "NZ-CAN" }, { network: "unknown" }, { metering: "standard" }, { userCategory: "low" }, { registers: ["controlled"] }, { registers: ["uncontrolled", "uncontrolled"] }])("requires exact scope %j", (change) => { expect(compare([entry()], change).rows).toEqual([]); });
  it.each(["review", "screenshot", "stale", "expired", "self-review", "hash", "discount", "unknown-gst", "contract", "rights", "negative"])("fails closed for %s", (caseName) => {
    const e = entry();
    if (caseName === "review") e.review.status = "rejected";
    if (caseName === "screenshot") e.record.provenance.screenshotSha256 = null;
    if (caseName === "stale") e.record.provenance.collectedAt = "2026-10-01T00:00:00.000Z";
    if (caseName === "expired") e.record.effectiveTo = "2026-11-13";
    if (caseName === "self-review") e.review.reviewerId = e.record.provenance.collectedBy;
    if (caseName === "hash") e.review.recordSha256 = "b".repeat(64);
    if (caseName === "discount") e.record.contract.discounts = [{ description: "Unresolved synthetic discount", conditions: "Unknown" }];
    if (caseName === "unknown-gst") e.record.gst.treatment = "unknown";
    if (caseName === "contract") e.record.contract.termMonths = 12;
    if (caseName === "rights") e.rights.recordSha256 = "b".repeat(64);
    if (caseName === "negative") { e.record.charges.daily[0].price.amount = "-1"; expect(() => compare([e])).toThrow(); return; }
    expect(compare([e]).rows).toEqual([]);
  });
  it("does not resurrect a superseded price when its successor is rejected", () => {
    const a = entry(), b = entry(); b.record.recordId = "synthetic-r2"; b.record.revision = "r2"; b.record.supersedes = a.record.recordId;
    b.review.recordId = b.record.recordId; b.review.status = "rejected"; b.rights.recordId = b.record.recordId;
    expect(compare([a, b]).rows).toEqual([]);
  });
  it("rejects future or unfinished annual profiles and historical comparison dates", () => {
    expect(() => comparePlans({ schemaVersion: 1, entries: [entry()] }, testPolicy, { ...scope, registers: [...scope.registers] }, { ...profile, year: 2026 }, options)).toThrow("completed measured");
    expect(() => comparePlans({ schemaVersion: 1, entries: [] }, testPolicy, { ...scope, registers: [...scope.registers] }, profile, { ...options, asOf: "2026-01-01" })).toThrow("today");
  });
  it("costs controlled usage separately and never allocates an aggregate to registers", () => {
    const e = entry(); e.record.metering.registers.push("controlled");
    e.record.charges.usage.push({ id: "controlled-rate", label: "SYNTHETIC controlled", kind: "flat", register: "controlled", price: { amount: "0.05", currency: "NZD", unit: "NZD/kWh" } });
    expect(() => annualTariffCost(e.record, profile)).toThrow("Exact register");
    expect(annualTariffCost(e.record, { ...profile, registerKwh: { uncontrolled: "3000", controlled: "650" } })).toBe(85348n);
  });
  it("requires a complete measured TOU profile and costs Auckland local times across DST", () => {
    const e = entry(), base = e.record.charges.usage[0];
    e.record.charges.daily[0].price.amount = "1";
    e.record.charges.usage = [["night", "00:00", "07:00", "0.1"], ["day", "07:00", "19:00", "0.2"], ["evening", "19:00", "24:00", "0.1"]].map(([id, start, end, amount]) => ({ ...base, id, kind: "time-of-use", start, end, days: [1, 2, 3, 4, 5, 6, 7], timezone: "Pacific/Auckland", price: { ...base.price, amount } }));
    expect(() => annualTariffCost(e.record, profile)).toThrow("Complete measured");
    const start = Date.parse("2025-01-01T00:00:00+13:00");
    const intervals = Array.from({ length: 365 * 48 }, (_, i) => ({ start: new Date(start + i * 1800_000).toISOString(), register: "uncontrolled", kwh: "1" }));
    const measured = { ...profile, registerKwh: { uncontrolled: "17520" }, intervals };
    expect(annualTariffCost(e.record, measured)).toBe(299300n);
    expect(() => annualTariffCost(e.record, { ...measured, intervals: [...intervals.slice(1), intervals[1]] })).toThrow("duplicate");
    expect(() => annualTariffCost(e.record, { ...measured, registerKwh: { uncontrolled: "17519" } })).toThrow("totals disagree");
    const first = e.record.charges.usage[0];
    if (first.kind === "time-of-use") first.end = "07:05";
    expect(() => annualTariffCost(e.record, measured)).toThrow("align");
  });
});
