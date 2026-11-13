import { z } from "zod";
import { chargeInNanoNzd, roundNanoNzdToCents } from "./money.ts";
import { decimalSchema } from "./tariff.ts";

export const kwhInput = z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,3})?$/).refine((n) => Number(n) <= 100_000);
export const amountInput = z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,2})?$/);
export const gstBasis = z.enum(["inclusive", "exclusive"]);
export const billSchema = z.strictObject({
  days: z.string().regex(/^\d{1,3}$/).refine((n) => Number(n) >= 1 && Number(n) <= 366),
  kwh: kwhInput, totalNzd: amountInput, gst: gstBasis,
  representativeYear: z.boolean(),
  components: z.strictObject({ dailyNzd: decimalSchema, usageCents: z.string().regex(/^(0|[1-9]\d{0,3})(\.\d{1,4})?$/), dailyGst: gstBasis, usageGst: gstBasis }).optional(),
  usageBreakdown: z.strictObject({ peak: kwhInput, offPeak: kwhInput, controlled: kwhInput }).optional(),
}).superRefine((input, context) => {
  if (input.usageBreakdown && kwhInput.safeParse(input.kwh).success && Object.values(input.usageBreakdown).every((n) => kwhInput.safeParse(n).success)) {
    const total = Object.values(input.usageBreakdown).reduce((sum, n) => sum + kwhToMilli(n), 0n);
    if (total !== kwhToMilli(input.kwh)) context.addIssue({ code: "custom", message: "Breakdown must partition the total without overlaps", path: ["usageBreakdown"] });
  }
});
export type BillInput = z.infer<typeof billSchema>;

export function kwhToMilli(value: string): bigint {
  kwhInput.parse(value);
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0"));
}

export function centsToNzd(rate: string): string {
  if (!/^(0|[1-9]\d{0,3})(\.\d{1,4})?$/.test(rate)) throw new Error("Invalid cents/kWh");
  const [whole, fraction = ""] = rate.split(".");
  const millionths = BigInt(whole) * 10_000n + BigInt(fraction.padEnd(4, "0"));
  return `${millionths / 1_000_000n}.${(millionths % 1_000_000n).toString().padStart(6, "0")}`;
}

// NZ's standard GST is 15%. Convert each separately labelled component once.
export function inclusiveNano(value: bigint, basis: z.infer<typeof gstBasis>): bigint {
  return basis === "exclusive" ? value * 115n / 100n : value;
}

export function analyseBill(raw: unknown) {
  const input = billSchema.parse(raw);
  const days = Number(input.days), kwh = Number(input.kwh);
  const totalNano = inclusiveNano(chargeInNanoNzd({ amount: input.totalNzd, currency: "NZD", unit: "NZD/day" }, { amount: "1", unit: "day" }), input.gst);
  const totalCents = roundNanoNzdToCents(totalNano);
  let componentCents: bigint | null = null;
  if (input.components) {
    const c = input.components;
    const fixed = inclusiveNano(chargeInNanoNzd({ amount: c.dailyNzd, currency: "NZD", unit: "NZD/day" }, { amount: input.days, unit: "day" }), c.dailyGst);
    const variable = inclusiveNano(chargeInNanoNzd({ amount: centsToNzd(c.usageCents), currency: "NZD", unit: "NZD/kWh" }, { amount: input.kwh, unit: "kWh" }), c.usageGst);
    componentCents = roundNanoNzdToCents(fixed + variable);
  }
  return {
    days, kwh, totalCents, dailyKwh: kwh / days,
    dailyNzd: Number(totalNano) / 1e9 / days,
    blendedCentsPerKwh: kwh > 0 ? Number(totalNano) / 1e7 / kwh : null,
    annualisedKwh: kwh / days * 365,
    // Never extrapolate a short-period dollar total or treat it as a switching baseline.
    annualNzd: input.representativeYear && days >= 365 ? Number(totalNano) / 1e9 / days * 365 : null,
    componentCents, componentDifferenceCents: componentCents === null ? null : totalCents - componentCents,
    usageBreakdown: input.usageBreakdown ?? null,
  };
}
