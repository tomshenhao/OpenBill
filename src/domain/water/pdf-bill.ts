import { z } from "zod";
import { assessWaterUsage, estimateWaterCharges, findWaterSchedule, type Reading, type WaterSchedule } from "./analysis.ts";

export const waterBillFields = ["invoiceDate", "dueDate", "previousDate", "currentDate", "days", "kl", "dailyLitres", "waterRate", "waterAmount", "wastewaterPercent", "wastewaterKl", "wastewaterRate", "wastewaterAmount", "annualFixedRate", "fixedAmount", "gst", "currentCharges", "amountDue"] as const;
export type WaterBillField = typeof waterBillFields[number];
export type WaterBillValues = Record<WaterBillField, string>;
export type WaterBill = { values: WaterBillValues; reading: Reading; historicalBenchmark: boolean; uncertain: WaterBillField[]; unreadablePage: boolean };
export const waterBillDateFields = ["invoiceDate", "dueDate", "previousDate", "currentDate"] as const;
const dateFields = new Set<WaterBillField>(waterBillDateFields);
const moneyFields = new Set<WaterBillField>(["waterAmount", "wastewaterAmount", "fixedAmount", "gst", "currentCharges", "amountDue"]);
export const emptyWaterBill = Object.fromEntries(waterBillFields.map((field) => [field, ""])) as WaterBillValues;

const monthNames = "jan feb mar apr may jun jul aug sep oct nov dec".split(" ");
export function waterBillDate(text: string) {
  const value = text.trim();
  if (z.iso.date().safeParse(value).success) return value;
  const short = /^(\d{1,2})[-\s]+([a-z]{3,9})[-\s]+(\d{2}|\d{4})$/i.exec(value);
  const numeric = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value);
  if (!short && !numeric) return undefined;
  const month = short ? monthNames.indexOf(short[2].slice(0, 3).toLowerCase()) + 1 : Number(numeric![2]);
  const year = (short ?? numeric!)[3];
  const format = `${year.length === 2 ? `20${year}` : year}-${String(month).padStart(2, "0")}-${(short ?? numeric!)[1].padStart(2, "0")}`;
  return z.iso.date().safeParse(format).success ? format : undefined;
}

export function validWaterBillValue(field: WaterBillField, value: string) {
  if (dateFields.has(field)) return z.iso.date().safeParse(value).success;
  if (field === "days") return /^\d{1,3}$/.test(value) && Number(value) > 0 && Number(value) <= 366;
  if (moneyFields.has(field)) return /^\d{1,8}(?:\.\d{1,2})?$/.test(value);
  return /^\d{1,6}(?:\.\d{1,3})?$/.test(value) && (field !== "wastewaterPercent" || Number(value) <= 100);
}

export type WaterBillCell = { text: string; x: number; y: number };
const numeric = String.raw`((?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d{1,3})?)`;
const nzd = String.raw`\$\s*${numeric}`;
const volumeCharge = new RegExp(String.raw`^(Water|Wastewater)\s+${numeric}\s*kL\s*${nzd}\s*/\s*kL\s+${nzd}$`, "i");
const fixedCharge = new RegExp(String.raw`^Wastewater\s+(\d{1,3})\s*days?\s+${nzd}\s*(?:p\.?a\.?|per year)\s+${nzd}$`, "i");
const volumeDetail = new RegExp(String.raw`^Wastewater\s+@\s*${numeric}\s*%\s+${numeric}\s*kL$`, "i");
const consumptionDetail = new RegExp(String.raw`^Consumption\s+${numeric}\s*kL$`, "i");
const chartAverage = new RegExp(String.raw`^Average daily usage(?: in [a-z]+)?\s+${numeric}\s*(?:L|litres)$`, "i");
const endMoney = new RegExp(`${nzd}$`);
const readingDate = /^(This|Last) reading\s+(\d{4}-\d{2}-\d{2}|\d{1,2}[- /][A-Za-z0-9]{2,9}[- /]\d{2,4})(?=\s|$)/i;
const summaryFields: [RegExp, WaterBillField][] = [
  [/^Water consumption\s+\$/, "waterAmount"], [/^Wastewater consumption\s+\$/, "wastewaterAmount"], [/^Wastewater fixed\s+\$/, "fixedAmount"],
  [/^(?:Balance of c|C)urrent charges\s+\$/i, "currentCharges"], [/^Total (?:amount )?due\s+\$/i, "amountDue"],
  [/^(?=.*\bcurrent charges\b).*\b(?:includes?|including|incl\.?)\s+15\s*%\s+GST\s*:/i, "gst"],
];
const clean = (value: string) => value.replace(/[\u00a0\u202f]/g, " ").replace(/\s+/g, " ").trim();
const isWatercare = (text: string) => /^watercare(?:\s|$)|\bwatercare\.co\.nz\b/i.test(text);

// Detail and summary columns can share a baseline with unrelated text.
function chargeSegments(row: WaterBillCell[], line: string) {
  const segments = new Set([line]);
  for (const [start, cell] of row.entries()) {
    if (!/^(?:Water|Wastewater|Balance|Current|Your|Total|Average)\b/i.test(cell.text)) continue;
    for (let end = start + 1; end <= Math.min(row.length, start + 6); end++) {
      if (row[end - 1].x - cell.x > 300) break;
      segments.add(row.slice(start, end).map(({ text }) => text).join(" "));
    }
  }
  return segments;
}

export function extractWatercareBill(pages: WaterBillCell[][], unreadablePage = false): WaterBill | null {
  const found = new Map<WaterBillField, Set<string>>();
  const readings = new Set<Reading>();
  let hasBrand = false, hasDetail = false, historicalBenchmark = false;
  const add = (field: WaterBillField, candidate: string | undefined) => {
    if (!candidate) return;
    const value = dateFields.has(field) ? waterBillDate(candidate) : candidate.replace(/,/g, "");
    if (!value || !validWaterBillValue(field, value)) return;
    const set = found.get(field) ?? new Set<string>();
    set.add(dateFields.has(field) ? value : moneyFields.has(field) ? Number(value).toFixed(2) : String(Number(value)));
    found.set(field, set);
  };

  for (const page of pages) {
    const cells = page.map((cell) => ({ ...cell, text: clean(cell.text) })).filter((cell) => cell.text).sort((a, b) => b.y - a.y || a.x - b.x);
    hasBrand ||= cells.some((cell) => isWatercare(cell.text));
    const pageText = cells.map(({ text }) => text).join(" ");
    historicalBenchmark ||= /usage target/i.test(pageText) && /water efficiency targets\s+2021\s*[-–—]\s*2025/i.test(pageText) && cells.some(({ text }) => /^155(?:\s*L)?$/.test(text));
    const rows: WaterBillCell[][] = [];
    for (const cell of cells) {
      const row = rows.at(-1);
      if (row && Math.abs(row[0].y - cell.y) <= 2) row.push(cell);
      else rows.push([cell]);
    }
    let section: "usage" | "fixed" | "meter" | undefined;
    for (const row of rows) {
      row.sort((a, b) => a.x - b.x);
      const line = row.map(({ text }) => text).join(" ");
      if (/^Consumption charges\b/i.test(line)) section = "usage";
      else if (/^Fixed charges\b/i.test(line)) section = "fixed";
      else if (/^Consumption details\b/i.test(line)) section = "meter";
      for (const segment of chargeSegments(row, line)) {
        const usage = section === "usage" && volumeCharge.exec(segment);
        if (usage) {
          hasDetail = true;
          const water = usage[1].toLowerCase() === "water";
          add(water ? "kl" : "wastewaterKl", usage[2]);
          add(water ? "waterRate" : "wastewaterRate", usage[3]);
          add(water ? "waterAmount" : "wastewaterAmount", usage[4]);
        }
        const fixed = section === "fixed" && fixedCharge.exec(segment);
        if (fixed) { hasDetail = true; add("days", fixed[1]); add("annualFixedRate", fixed[2]); add("fixedAmount", fixed[3]); }
        for (const [pattern, field] of summaryFields) if (pattern.test(segment)) add(field, endMoney.exec(segment)?.[1]);
        add("dailyLitres", chartAverage.exec(segment)?.[1]);
      }
      if (section === "meter") {
        const detail = volumeDetail.exec(line);
        if (detail) { add("wastewaterPercent", detail[1]); add("wastewaterKl", detail[2]); }
        add("days", /\bConsumption period\s+(\d{1,3})\s*days?\s*$/i.exec(line)?.[1]);
        add("kl", consumptionDetail.exec(line)?.[1]);
        const reading = readingDate.exec(line);
        if (reading) {
          const current = reading[1].toLowerCase() === "this";
          add(current ? "currentDate" : "previousDate", reading[2]);
          if (current && /\sactual$/i.test(line)) readings.add("actual");
          if (current && /\sestimated$/i.test(line)) readings.add("estimated");
        }
      }
      for (const [label, field] of [["Invoice date", "invoiceDate"], ["Due date", "dueDate"], ["Total due", "amountDue"]] as const) {
        const index = row.findIndex(({ text }) => text.toLowerCase() === `${label.toLowerCase()}:`);
        if (index < 0) continue;
        const isMoney = field === "amountDue";
        const next = row[index + 1];
        const value = (candidate: string) => isMoney ? endMoney.exec(candidate)?.[1] : waterBillDate(candidate);
        const anchor = row[index];
        const below = cells.find((cell) => Math.abs(cell.x - anchor.x) <= 3 && anchor.y - cell.y > 3 && anchor.y - cell.y < 22);
        add(field, (next && value(next.text)) || (below && value(below.text)));
      }
    }
  }
  if (!hasBrand || (!hasDetail && !(found.has("currentCharges") && found.has("waterAmount")))) return null;
  const values = { ...emptyWaterBill };
  const uncertain: WaterBillField[] = [];
  for (const [field, candidates] of found) {
    if (candidates.size === 1) values[field] = [...candidates][0];
    else uncertain.push(field);
  }
  return { values, reading: readings.size === 1 ? [...readings][0] : "unknown", historicalBenchmark, uncertain, unreadablePage };
}

export function checkWaterBill(values: WaterBillValues, occupants: string, reference: { lowerLitres: number; upperLitres: number }, schedules: readonly WaterSchedule[]) {
  const usage = assessWaterUsage({ occupants, volume: values.kl, unit: "kL", days: values.days }, reference);
  if (!usage.ok) return { usage, schedule: null, estimate: null, discrepancies: [], periodMismatch: false };
  const valid = (field: WaterBillField) => validWaterBillValue(field, values[field]);
  const periodMismatch = valid("previousDate") && valid("currentDate") &&
    (Date.parse(values.currentDate) - Date.parse(values.previousDate)) / 86_400_000 !== usage.days;
  const schedule = valid("currentDate") ? findWaterSchedule(schedules, values.currentDate, usage.days) : null;
  const discrepancies: WaterBillField[] = [];
  if (valid("dailyLitres") && Math.abs(usage.householdDaily - Number(values.dailyLitres)) > 0.5) discrepancies.push("dailyLitres");
  const thousandths = (value: string) => BigInt(Math.round(Number(value) * 1000));
  if (valid("wastewaterKl") && valid("wastewaterPercent")) {
    const roundedHundredths = (thousandths(values.kl) * thousandths(values.wastewaterPercent) + 500000n) / 1000000n;
    if (Number(roundedHundredths) / 100 !== Number(values.wastewaterKl)) discrepancies.push("wastewaterKl");
  }
  const needed = ["waterRate", "wastewaterRate", "annualFixedRate", "wastewaterKl"] as const;
  const estimate = !periodMismatch && schedule?.status === "matched" && needed.every(valid) ? estimateWaterCharges({
    millilitres: usage.millilitres, days: usage.days, scheduleDays: schedule.scheduleDays,
    rates: { water: values.waterRate, wastewater: values.wastewaterRate, annual: values.annualFixedRate },
    wastewaterPercent: 0, billedWastewaterKl: values.wastewaterKl, gstPercent: 15, billTotal: "",
  }) : null;
  if (estimate?.ok) for (const [field, expected] of [["waterAmount", estimate.water], ["wastewaterAmount", estimate.wastewater], ["fixedAmount", estimate.fixed], ["gst", estimate.gst], ["currentCharges", estimate.total]] as const) {
    if (valid(field) && Math.round(Number(values[field]) * 100) !== Math.round(expected * 100)) discrepancies.push(field);
  }
  const efficiency: "meets" | "near" | "above" = usage.personDaily < 165 ? "meets" : usage.personDaily <= reference.upperLitres ? "near" : "above";
  return { usage, schedule, estimate: estimate?.ok ? estimate : null, discrepancies, periodMismatch, efficiency };
}
