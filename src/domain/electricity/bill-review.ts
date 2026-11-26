import { amountInput, centsToNzd, gstBasis, kwhInput, kwhToMilli } from "./bill.ts";
import { chargeInNanoNzd, roundNanoNzdToCents } from "./money.ts";
import { decimalSchema } from "./tariff.ts";

export type TaxBasis = "inclusive" | "exclusive";
export type PropertyUse = "unspecified" | "occupied" | "vacant" | "holiday";
export type UsageKind = "standard" | "peak" | "offPeak" | "controlled" | "other";
export type AdjustmentKind = "fee" | "credit" | "solar" | "gstAdd" | "gstCredit";
export type UsageCharge = { kind: UsageKind; kwh: string; cents: string; gst?: TaxBasis };
export type Adjustment = { kind: AdjustmentKind; amount: string; gst?: TaxBasis; requiresGst?: boolean };
export type BillCharges = {
  days: string;
  fixedDays?: string;
  kwh: string;
  dailyNzd: string;
  gst: TaxBasis | "";
  fixedGst?: TaxBasis;
  usage: UsageCharge[];
  adjustments: Adjustment[];
  totalNzd: string;
};

export const validBillDays = (value: string) => /^\d{1,3}$/.test(value) && Number(value) >= 1 && Number(value) <= 366;
export const validUsageRate = (value: string) => /^(0|[1-9]\d{0,3})(\.\d{1,4})?$/.test(value);
export const billToleranceCents = 1;
export const supportsUsageReference = (property: PropertyUse) => property !== "vacant" && property !== "holiday";
const roundRatio = (value: bigint, numerator: bigint, denominator: bigint): bigint =>
  value < 0n ? -roundRatio(-value, numerator, denominator) : (value * numerator + denominator / 2n) / denominator;

function dailyCharge(rate: string, days: string) {
  return roundNanoNzdToCents(chargeInNanoNzd({ amount: rate, currency: "NZD", unit: "NZD/day" }, { amount: days, unit: "day" }));
}

function addTax(cents: bigint, basis: TaxBasis) {
  return {
    net: basis === "exclusive" ? cents : cents - roundRatio(cents, 3n, 23n),
    gross: basis === "exclusive" ? cents + roundRatio(cents, 15n, 100n) : cents,
  };
}

function reconstruct(input: BillCharges, retainedPercent = 100) {
  const { usage, adjustments } = input;
  const basis = gstBasis.safeParse(input.gst);
  if (!basis.success || !validBillDays(input.days) || !validBillDays(input.fixedDays || input.days) ||
    !kwhInput.safeParse(input.kwh).success || !decimalSchema.safeParse(input.dailyNzd).success ||
    !usage.length || !usage.every((line) => kwhInput.safeParse(line.kwh).success && validUsageRate(line.cents)) ||
    !adjustments.every((line) => amountInput.safeParse(line.amount).success &&
      (!line.requiresGst || line.gst || line.kind === "gstAdd" || line.kind === "gstCredit"))) return null;

  if (usage.reduce((sum, line) => sum + kwhToMilli(line.kwh), 0n) !== kwhToMilli(input.kwh)) return null;

  const fixedBasis = input.fixedGst ?? basis.data;
  const fixed = dailyCharge(input.dailyNzd, input.fixedDays || input.days);
  const usageLines = usage.map((line) => {
    const nano = chargeInNanoNzd({ amount: centsToNzd(line.cents), currency: "NZD", unit: "NZD/kWh" }, { amount: line.kwh, unit: "kWh" });
    return { cents: roundNanoNzdToCents(nano * BigInt(retainedPercent) / 100n), gst: line.gst ?? basis.data };
  });
  const adjustmentLines = adjustments.filter(({ kind }) => kind !== "gstAdd" && kind !== "gstCredit").map((line) => ({
    cents: dailyCharge(line.amount, "1") * (line.kind === "fee" ? 1n : -1n),
    gst: line.gst ?? basis.data,
  }));
  const gstAdjustment = adjustments.reduce((sum, { kind, amount }) => {
    if (kind === "gstAdd") return sum + dailyCharge(amount, "1");
    if (kind === "gstCredit") return sum - dailyCharge(amount, "1");
    return sum;
  }, 0n);
  const taxGroups = { inclusive: 0n, exclusive: 0n };
  for (const line of [{ cents: fixed, gst: fixedBasis }, ...usageLines, ...adjustmentLines]) taxGroups[line.gst] += line.cents;
  const inclusive = addTax(taxGroups.inclusive, "inclusive");
  const exclusive = addTax(taxGroups.exclusive, "exclusive");
  const totalCents = inclusive.gross + exclusive.gross + gstAdjustment;
  const subtotalCents = inclusive.net + exclusive.net;
  const fixedCents = addTax(fixed, fixedBasis).gross;
  const usageCents = usageLines.reduce((sum, line) => sum + addTax(line.cents, line.gst).gross, 0n);
  return {
    fixed, usageLines, adjustmentLines, gstAdjustment, fixedCents, usageCents, subtotalCents, totalCents,
    gstCents: totalCents - subtotalCents,
  };
}

export function reviewElectricityBill(input: BillCharges, confirmed = true) {
  const days = validBillDays(input.days) ? Number(input.days) : null;
  const kwh = kwhInput.safeParse(input.kwh).success ? Number(input.kwh) : null;
  const suppliedCents = amountInput.safeParse(input.totalNzd).success ? dailyCharge(input.totalNzd, "1") : null;
  const charges = reconstruct(input);
  const differenceCents = charges && suppliedCents !== null ? Number(suppliedCents - charges.totalCents) : null;
  const verification: "matches" | "difference" | "unable" = !confirmed || differenceCents === null ? "unable"
    : Math.abs(differenceCents) <= billToleranceCents ? "matches" : "difference";
  const total = suppliedCents ?? charges?.totalCents ?? null;
  const share = (cents: bigint | undefined) => cents !== undefined && total !== null && total > 0n ? Number(cents) / Number(total) * 100 : null;

  return {
    days, kwh, suppliedCents, charges, differenceCents, verification,
    fixedShare: share(charges?.fixedCents), usageShare: share(charges?.usageCents),
    dailyKwh: days && kwh !== null ? kwh / days : null,
    dailyCostCents: days && total !== null ? Number(total) / days : null,
    effectiveCentsPerKwh: kwh && total !== null ? Number(total) / kwh : null,
  };
}

export function electricitySavingScenarios(input: BillCharges, confirmed: boolean) {
  const baseline = confirmed ? reconstruct(input) : null;
  if (!baseline || baseline.totalCents <= 0n) return null;
  const reductions = [5, 10, 20].map((percent) => {
    const scenario = reconstruct(input, 100 - percent)!;
    return { percent, savingCents: baseline.totalCents - scenario.totalCents, totalCents: scenario.totalCents };
  });
  const idle = [7, 30].map((days) => ({
    days,
    cents: addTax(dailyCharge(input.dailyNzd, String(days)), input.fixedGst ?? input.gst as TaxBasis).gross,
  }));
  return { reductions, idle, fixedCents: baseline.fixedCents };
}
