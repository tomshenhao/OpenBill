import { z } from "zod";
import { tariffSchema, reviewSchema, sha256Schema, utcSchema, idSchema, dateSchema, type ElectricityTariff, type UsageBand } from "./tariff.ts";
import { validateHistory, validateTariff, type DataPolicy } from "./validation.ts";
import { chargeInNanoNzd, roundNanoNzdToCents } from "./money.ts";
import { kwhToMilli as quantityMilli } from "./bill.ts";

// A build-time publication receipt, not a browser's claim of independent review.
export const comparisonEntrySchema = z.strictObject({
  record: tariffSchema, recordSha256: sha256Schema, review: reviewSchema,
  rights: z.strictObject({ recordId: idSchema, recordSha256: sha256Schema, permissionReference: z.string().min(1), reviewedBy: idSchema, reviewedAt: utcSchema }),
});
export const comparisonBundleSchema = z.strictObject({ schemaVersion: z.literal(1), entries: z.array(comparisonEntrySchema) });
export type ComparisonEntry = z.infer<typeof comparisonEntrySchema>;
export type AnnualProfile = {
  year: number; representative: true;
  registerKwh: Record<string, string>;
  // Actual complete half-hour measurements, not invented allocations of a total.
  intervals?: { start: string; register: string; kwh: string }[];
};
export type ComparisonScope = { region: string; network: string; metering: ElectricityTariff["metering"]["configuration"]; userCategory: "low" | "standard"; registers: string[] };
const halfHour = 30 * 60 * 1000;
const localParts = new Intl.DateTimeFormat("en-NZ", { timeZone: "Pacific/Auckland", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
function isFresh(date: string, now: Date) { const age = now.getTime() - Date.parse(date); return age >= 0 && age < 30 * 86400_000; }
function unsupported(record: ElectricityTariff): boolean {
  const e = record.eligibility, c = record.contract;
  return record.gst.treatment !== "inclusive" || record.metering.configuration === "other" || e.unresolved || e.userCategory === "unknown" || e.primaryResidenceOnly !== false || e.minimumAnnualKwh !== null || e.maximumAnnualKwh !== null || e.conditions.length > 0 || c.unresolved || c.discounts.length > 0 || c.conditions.length > 0 || c.termMonths !== 0 || !c.earlyTerminationFee || Number(c.earlyTerminationFee.amount) !== 0 || record.charges.usage.some((b) => b.kind !== "flat" && b.kind !== "time-of-use");
}
export function entryIsCurrent(entry: ComparisonEntry, policy: DataPolicy, now: Date, asOf: string, allowSynthetic = false): boolean {
  const { record: r, review: v, rights } = entry;
  return (allowSynthetic || r.dataKind === "official") && validateTariff(r, policy, now).issues.length === 0 && !unsupported(r)
    && r.effectiveFrom <= asOf && (r.effectiveTo === null || asOf < r.effectiveTo)
    && isFresh(r.provenance.collectedAt, now) && isFresh(v.reviewedAt, now)
    && !!r.provenance.screenshotSha256 && v.status === "verified" && v.recordId === r.recordId && v.recordSha256 === entry.recordSha256
    && v.reviewerId !== r.provenance.collectedBy && Date.parse(v.reviewedAt) >= Date.parse(r.provenance.collectedAt) && Object.values(v.checks).every(Boolean)
    && rights.recordId === r.recordId && rights.recordSha256 === entry.recordSha256 && rights.reviewedBy !== r.provenance.collectedBy && Date.parse(rights.reviewedAt) >= Date.parse(v.reviewedAt) && Date.parse(rights.reviewedAt) <= now.getTime();
}

function matchesScope(r: ElectricityTariff, scope: ComparisonScope) {
  return r.coverage.regionCodes.some((c) => c === scope.region) && r.coverage.networkIds.includes(scope.network)
    && r.metering.configuration === scope.metering && (r.eligibility.userCategory === "unrestricted" || r.eligibility.userCategory === scope.userCategory)
    && [...r.metering.registers].sort().join() === [...scope.registers].sort().join() && new Set(scope.registers).size === scope.registers.length;
}
function bandAt(bands: UsageBand[], timestamp: number) {
  const parts = localParts.formatToParts(new Date(timestamp));
  const part = (name: string) => parts.find((p) => p.type === name)!.value;
  const day = weekdays.indexOf(part("weekday")) + 1, minute = Number(part("hour")) * 60 + Number(part("minute"));
  const clock = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
  return bands.filter((b) => {
    if (b.kind === "flat") return true;
    if (b.kind !== "time-of-use") return false;
    const start = clock(b.start), end = clock(b.end);
    return end > start ? b.days.includes(day) && minute >= start && minute < end
      : (b.days.includes(day) && minute >= start) || (b.days.includes(day === 1 ? 7 : day - 1) && minute < end);
  });
}
export function annualTariffCost(record: ElectricityTariff, profile: AnnualProfile): bigint {
  tariffSchema.parse(record);
  if (!profile.representative || !Number.isInteger(profile.year) || profile.year < 2000 || profile.year > 2100) throw new Error("Representative measured year required");
  const registers = Object.keys(profile.registerKwh).sort();
  if (registers.join() !== [...record.metering.registers].sort().join()) throw new Error("Exact register totals required");
  for (const n of Object.values(profile.registerKwh)) quantityMilli(n);
  const from = Date.parse(`${profile.year}-01-01T00:00:00+13:00`), to = Date.parse(`${profile.year + 1}-01-01T00:00:00+13:00`);
  const days = (to - from) / 86400_000;
  let total = record.charges.daily.reduce((sum, c) => sum + chargeInNanoNzd(c.price, { amount: String(days), unit: "day" }), 0n);
  const tou = record.charges.usage.some((b) => b.kind === "time-of-use");
  if (tou) {
    if (record.charges.usage.some((b) => b.kind === "time-of-use" && (Number(b.start.slice(3)) % 30 || Number(b.end.slice(3)) % 30))) throw new Error("Rate boundaries must align with measured half hours");
    if (!profile.intervals || profile.intervals.length !== (to - from) / halfHour * registers.length) throw new Error("Complete measured half-hour profile required for time-of-use");
    const seen = new Set<string>(), sums = new Map(registers.map((r) => [r, 0n]));
    for (const interval of profile.intervals) {
      const at = Date.parse(interval.start), key = `${at}/${interval.register}`;
      if (!/T\d{2}:\d{2}:00(?:\.000)?(?:Z|[+-]\d{2}:\d{2})$/.test(interval.start) || !Number.isFinite(at) || at < from || at >= to || (at - from) % halfHour || seen.has(key) || !sums.has(interval.register)) throw new Error("Invalid, duplicate or out-of-period interval");
      seen.add(key); sums.set(interval.register, sums.get(interval.register)! + quantityMilli(interval.kwh));
      const bands = record.charges.usage.filter((b) => b.register === interval.register);
      const matched = bandAt(bands, at);
      // Rates must remain constant throughout a measured half hour.
      if (matched.length !== 1 || bandAt(bands, at + halfHour - 1)[0]?.id !== matched[0].id) throw new Error("Unsupported or ambiguous interval boundary");
      total += chargeInNanoNzd(matched[0].price, { amount: interval.kwh, unit: "kWh" });
    }
    for (const r of registers) if (sums.get(r) !== quantityMilli(profile.registerKwh[r])) throw new Error("Interval and register totals disagree");
  } else {
    for (const register of registers) {
      const bands = record.charges.usage.filter((b) => b.register === register);
      if (bands.length !== 1 || bands[0].kind !== "flat") throw new Error("Unsupported tariff structure");
      total += chargeInNanoNzd(bands[0].price, { amount: profile.registerKwh[register], unit: "kWh" });
    }
  }
  if (record.gst.treatment !== "inclusive") throw new Error("Only reviewed GST-inclusive comparison records are supported");
  return roundNanoNzdToCents(total);
}
export type ComparisonRow = { entry: ComparisonEntry; annualCents: bigint; differenceCents: bigint | null };
export function comparePlans(raw: unknown, policy: DataPolicy, scope: ComparisonScope, profile: AnnualProfile, options: { now: Date; asOf: string; currentRecordId?: string; allowSynthetic?: boolean }) {
  dateSchema.parse(options.asOf);
  const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(options.now);
  if (options.asOf !== currentDate) throw new Error("Consumer comparisons require today's New Zealand date");
  if (profile.year >= Number(currentDate.slice(0, 4))) throw new Error("A completed measured calendar year is required");
  const bundle = comparisonBundleSchema.parse(raw);
  if (validateHistory(bundle.entries.map((e) => e.record)).length) throw new Error("Invalid comparison history");
  const rows: ComparisonRow[] = [];
  const excluded: { recordId: string; reason: "unverified-or-inapplicable" | "profile" }[] = [];
  const byId = new Map(bundle.entries.map((e) => [e.record.recordId, e.record]));
  const superseded = new Set<string>();
  for (const { record } of bundle.entries) {
    if (record.effectiveFrom > options.asOf) continue;
    let parent = record.supersedes;
    while (parent && !superseded.has(parent)) { superseded.add(parent); parent = byId.get(parent)?.supersedes ?? null; }
  }
  for (const entry of bundle.entries) {
    if (superseded.has(entry.record.recordId) || !entryIsCurrent(entry, policy, options.now, options.asOf, options.allowSynthetic) || !matchesScope(entry.record, scope)) { excluded.push({ recordId: entry.record.recordId, reason: "unverified-or-inapplicable" }); continue; }
    try { rows.push({ entry, annualCents: annualTariffCost(entry.record, profile), differenceCents: null }); }
    catch { excluded.push({ recordId: entry.record.recordId, reason: "profile" }); }
  }
  // Baseline must itself be a current, applicable, verified plan costed on this exact profile.
  const baseline = rows.find((r) => r.entry.record.recordId === options.currentRecordId);
  for (const row of rows) if (baseline) row.differenceCents = row.annualCents - baseline.annualCents;
  rows.sort((a, b) => a.annualCents < b.annualCents ? -1 : a.annualCents > b.annualCents ? 1 : a.entry.record.recordId.localeCompare(b.entry.record.recordId));
  return { rows, excluded };
}
