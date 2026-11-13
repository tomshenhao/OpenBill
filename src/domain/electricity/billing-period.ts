import { z } from "zod";
import { daysInMonth, benchmarkUsage, type BenchmarkDataset, type DistributionDataset } from "./benchmark.ts";
import { kwhInput } from "./bill.ts";

export function billingPeriod(start: string, end: string) {
  if (!z.iso.date().safeParse(start).success || !z.iso.date().safeParse(end).success) return null;
  const from = Date.parse(`${start}T00:00:00Z`), to = Date.parse(`${end}T00:00:00Z`);
  const days = (to - from) / 86400_000 + 1;
  if (days < 1 || days > 366) return null;
  const month = start.slice(0, 7);
  const exactMonth = start.endsWith("-01") && end === `${month}-${String(daysInMonth(month)).padStart(2, "0")}` ? month : null;
  return { days, exactMonth, from, to };
}
export function compareBillingPeriod(mean: BenchmarkDataset, distribution: DistributionDataset, input: { start: string; end: string; region: string; kwh: string; approximate: boolean }) {
  const period = billingPeriod(input.start, input.end);
  if (!period || !kwhInput.safeParse(input.kwh).success) return { available: false as const, reason: "dates" };
  if (period.exactMonth) return { ...benchmarkUsage(mean, { region: input.region, month: period.exactMonth, days: period.days, kwh: input.kwh, fullCalendarMonth: true }, distribution), approximate: false };
  if (!input.approximate) return { available: false as const, reason: "confirmation" };
  let expected = 0;
  const contributions: { month: string; days: number; meanKwh: number }[] = [];
  for (let time = period.from; time <= period.to;) {
    const month = new Date(time).toISOString().slice(0, 7), length = daysInMonth(month);
    const monthEnd = Date.parse(`${month}-${length}T00:00:00Z`);
    const last = Math.min(period.to, monthEnd), days = (last - time) / 86400_000 + 1;
    const row = mean.rows.find((r) => r.region === input.region && r.month === month);
    if (!row) return { available: false as const, reason: "missing" };
    expected += row.meanKwh * days / length;
    contributions.push({ month, days, meanKwh: row.meanKwh });
    time = last + 86400_000;
  }
  const differenceKwh = Number(input.kwh) - expected;
  return { available: true as const, approximate: true, meanKwh: expected, differenceKwh, differencePercent: differenceKwh / expected * 100, contributions };
}
