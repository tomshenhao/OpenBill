import { z } from "zod";

const dayMs = 86_400_000;
const decimal = /^\d{1,6}(?:\.\d{1,3})?$/;
const whole = /^\d{1,8}$/;

export type Reading = "unknown" | "actual" | "estimated";
export type WaterUnit = "kL" | "L";
export type Connection = "unknown" | "standard" | "apartment" | "other";
export type WaterUsage = { occupants: string; volume: string; unit: WaterUnit; days: string };
export type WaterReference = { lowerLitres: number; upperLitres: number };
export type WaterSchedule = { from: string; until: string; url: string };
export type WaterRates = { water: string; wastewater: string; annual: string };

function thousandths(value: string) {
  const [integer, fraction = ""] = value.split(".");
  return Number(integer) * 1000 + Number(fraction.padEnd(3, "0"));
}

export function assessWaterUsage(input: WaterUsage, reference: WaterReference) {
  const validation = {
    occupants: whole.test(input.occupants) && Number(input.occupants) > 0,
    days: whole.test(input.days) && Number(input.days) >= 1 && Number(input.days) <= 366,
    volume: decimal.test(input.volume),
  };
  const invalid = (Object.keys(validation) as (keyof typeof validation)[]).find((key) => !validation[key]);
  if (invalid) return { ok: false as const, invalid };

  const millilitres = thousandths(input.volume) * (input.unit === "kL" ? 1000 : 1);
  const days = Number(input.days);
  const occupants = Number(input.occupants);
  const householdDaily = millilitres / (1000 * days);
  const personDaily = householdDaily / occupants;
  const comparison: "below" | "within" | "above" = personDaily < reference.lowerLitres ? "below"
    : personDaily > reference.upperLitres ? "above" : "within";
  return {
    ok: true as const, millilitres, days, householdDaily, personDaily, comparison,
    householdLower: reference.lowerLitres * occupants,
    householdUpper: reference.upperLitres * occupants,
  };
}

export function findWaterSchedule(schedules: readonly WaterSchedule[], lastDay: string, days: number) {
  if (!z.iso.date().safeParse(lastDay).success || !Number.isInteger(days) || days < 1 || days > 366) {
    return { status: "invalid" as const };
  }
  const end = Date.parse(`${lastDay}T00:00:00Z`);
  const start = new Date(end - (days - 1) * dayMs).toISOString().slice(0, 10);
  const schedule = schedules.find(({ from, until }) => lastDay >= from && lastDay < until);
  if (!schedule) return { status: "unavailable" as const };
  // Billed totals alone do not establish the volume before and after a rate change.
  if (start < schedule.from) return { status: "split" as const };
  const scheduleDays = (Date.parse(schedule.until) - Date.parse(schedule.from)) / dayMs;
  return { status: "matched" as const, schedule, scheduleDays };
}

function roundRatio(numerator: bigint, denominator: bigint) {
  return (numerator + denominator / 2n) / denominator;
}

export function estimateWaterCharges(input: {
  millilitres: number; days: number; scheduleDays: number; rates: WaterRates;
  wastewaterPercent: number; gstPercent: number; billTotal: string;
}) {
  const { rates, millilitres, days, scheduleDays, wastewaterPercent, gstPercent, billTotal } = input;
  const invalidRate = (Object.keys(rates) as (keyof WaterRates)[]).find((key) => !decimal.test(rates[key]));
  if (invalidRate) return { ok: false as const, invalid: invalidRate };
  if (billTotal !== "" && !/^\d{1,8}(?:\.\d{1,2})?$/.test(billTotal)) {
    return { ok: false as const, invalid: "billTotal" as const };
  }

  const volume = BigInt(millilitres);
  const factor = BigInt(Math.round(wastewaterPercent * 10));
  const waterCents = roundRatio(volume * BigInt(thousandths(rates.water)), 10_000_000n);
  const wastewaterCents = roundRatio(volume * BigInt(thousandths(rates.wastewater)) * factor, 10_000_000_000n);
  const fixedCents = roundRatio(BigInt(days) * BigInt(thousandths(rates.annual)), 10n * BigInt(scheduleDays));
  const totalCents = waterCents + wastewaterCents + fixedCents;
  const gstCents = roundRatio(totalCents * BigInt(gstPercent), BigInt(100 + gstPercent));
  const difference = billTotal === "" ? null : (thousandths(billTotal) / 10 - Number(totalCents)) / 100;
  return {
    ok: true as const,
    water: Number(waterCents) / 100, wastewater: Number(wastewaterCents) / 100,
    fixed: Number(fixedCents) / 100, total: Number(totalCents) / 100, gst: Number(gstCents) / 100,
    wastewaterKl: millilitres / 1_000_000 * wastewaterPercent / 100, difference,
  };
}
