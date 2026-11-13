import { amountInput } from "./bill.ts";
import { decimalSchema } from "./tariff.ts";

export type RateWarning = "sub-cent" | "large-usage" | "daily-unit" | "mixed-gst";
export function rateWarnings(input: { dailyNzd: string; usageCents: string; gst: string; dailyGst: string; usageGst: string }): RateWarning[] {
  const warnings: RateWarning[] = [];
  // These are unit-check prompts, not market-price thresholds or input rejection rules.
  if (/^(0|[1-9]\d{0,3})(\.\d{1,4})?$/.test(input.usageCents)) {
    const rate = Number(input.usageCents);
    if (rate > 0 && rate < 1) warnings.push("sub-cent");
    if (rate >= 100) warnings.push("large-usage");
  }
  if (decimalSchema.safeParse(input.dailyNzd).success && Number(input.dailyNzd) >= 10) warnings.push("daily-unit");
  if ((input.dailyNzd || input.usageCents) && (input.gst !== input.dailyGst || input.gst !== input.usageGst)) warnings.push("mixed-gst");
  return warnings;
}
export function flatDiagnosticSupported(input: { timeOfUse: boolean; meter: string }) {
  return !input.timeOfUse && !["controlled", "day-night"].includes(input.meter);
}
export function validBillTotal(value: string): boolean { return amountInput.safeParse(value).success; }
