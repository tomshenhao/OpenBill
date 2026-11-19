import { billingPeriod } from "./billing-period.ts";
import { daysInMonth, monthSchema, type BenchmarkDataset } from "./benchmark.ts";
import { kwhInput } from "./bill.ts";
import { regionSchema } from "./tariff.ts";

export type PeriodMode = "dates" | "month";
type PeriodInput = { start: string; end: string; month: string; fullCalendarMonth: boolean };
export function usagePeriod(input: PeriodInput, mode: PeriodMode) {
  if (mode === "dates") {
    const dates = monthSchema.safeParse(input.start.slice(0, 7)).success && monthSchema.safeParse(input.end.slice(0, 7)).success ? billingPeriod(input.start, input.end) : null;
    return { days: dates?.days ?? 0, month: dates?.exactMonth ?? "", fullCalendarMonth: !!dates?.exactMonth, start: input.start, end: input.end };
  }
  const confirmed = input.fullCalendarMonth && monthSchema.safeParse(input.month).success;
  return { days: confirmed ? daysInMonth(input.month) : 0, month: input.month, fullCalendarMonth: confirmed, start: "", end: "" };
}
export function usageInputRequirement(dataset: BenchmarkDataset, input: PeriodInput & { kwh: string; region: string }, mode: PeriodMode) {
  if (!kwhInput.safeParse(input.kwh).success) return "kwh" as const;
  if (!regionSchema.safeParse(input.region).success) return "region" as const;
  const period = usagePeriod(input, mode);
  if (mode === "dates" && !period.days) return "dates" as const;
  if (mode === "month" && !monthSchema.safeParse(input.month).success) return "month" as const;
  if (mode === "month" && !input.fullCalendarMonth) return "confirmation" as const;
  if (!period.fullCalendarMonth) return "cross-month" as const;
  if (!dataset.rows.some((row) => row.region === input.region && row.month === period.month)) return "missing-data" as const;
  return null;
}
