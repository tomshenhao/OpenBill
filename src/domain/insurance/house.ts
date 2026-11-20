import { z } from "zod";
import { parseNzdCents } from "../nzd.ts";

export const houseEventGroups = {
  natural: ["earthquake", "flood", "storm", "landslide", "otherHazards"],
  accidental: ["fire", "malicious", "burglary", "accidental", "suddenWater", "gradualWater"],
} as const;
export type HouseEvent = (typeof houseEventGroups)[keyof typeof houseEventGroups][number];

export const evidenceStates = ["unverified", "covered", "excluded", "conditional"] as const;
export type EvidenceState = (typeof evidenceStates)[number];
export const settlementBases = ["replacement", "indemnity", "other"] as const;
export type SettlementBasis = (typeof settlementBases)[number];
export const coverProviders = ["private", "nhcover", "both"] as const;
export type CoverProvider = (typeof coverProviders)[number];

// This is a status for personal notes only. It does not establish provider coverage.
export function reviewedEventState(state: EvidenceState, wordingVersion: string, reference: string): EvidenceState {
  return wordingVersion.trim() && reference.trim() ? state : "unverified";
}

export const quoteAmounts = ["premium", "sumInsured", "standardExcess", "hazardExcess"] as const;
export const basicHouseAmounts = ["sumInsured", "standardExcess", "premium"] as const;
export const quoteCover = ["flood", "accidental", "suddenWater", "gradualWater", "accommodation"] as const;
type QuoteAmount = (typeof quoteAmounts)[number];
type QuoteCover = (typeof quoteCover)[number];

export type HouseQuote = Record<QuoteAmount, string> & Record<QuoteCover, EvidenceState> & {
  insurer: string;
  product: string;
  date: string;
  settlement: SettlementBasis | "";
  conditions: string;
};

export const emptyHouseQuote: HouseQuote = {
  insurer: "", product: "", date: "", premium: "", sumInsured: "", standardExcess: "", hazardExcess: "",
  settlement: "", flood: "unverified", accidental: "unverified", suddenWater: "unverified",
  gradualWater: "unverified", accommodation: "unverified", conditions: "",
};

export function houseAmountInvalid(field: QuoteAmount, value: string, cents = parseNzdCents(value)): boolean {
  return value.trim() !== "" && (cents === null || ((field === "premium" || field === "sumInsured") && cents === 0));
}

export function readHouseQuote(quote: HouseQuote) {
  const amounts = {
    premium: parseNzdCents(quote.premium),
    sumInsured: parseNzdCents(quote.sumInsured),
    standardExcess: parseNzdCents(quote.standardExcess),
    hazardExcess: parseNzdCents(quote.hazardExcess),
  };
  const invalidAmounts = quoteAmounts.filter((key) => houseAmountInvalid(key, quote[key], amounts[key]));
  for (const key of invalidAmounts) amounts[key] = null;
  const invalid: (QuoteAmount | "date")[] = [...invalidAmounts];
  if (quote.date && !z.iso.date().safeParse(quote.date).success) invalid.push("date");
  return { amounts, invalid };
}

export function housePremiumEquivalents(annualCents: number) {
  return { monthly: Math.round(annualCents / 12), weekly: Math.round(annualCents / 52) };
}

export function formatHouseMoney(cents: number, locale: string) {
  const amount = new Intl.NumberFormat(locale, { useGrouping: true, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `NZ$${amount.format(cents / 100)}`;
}

type ComparisonField = Exclude<QuoteAmount, "premium"> | QuoteCover | "settlement" | "conditions";
type ComparisonValue = string | number | null;
type ComparisonCheck = { field: ComparisonField; baseline: ComparisonValue; alternative: ComparisonValue; uncertain: boolean };

export function compareHouseQuotes(baseline: HouseQuote, alternative: HouseQuote) {
  const base = readHouseQuote(baseline);
  const other = readHouseQuote(alternative);
  if (base.amounts.premium === null || other.amounts.premium === null) return null;

  const checks: ComparisonCheck[] = [];
  for (const field of ["sumInsured", "standardExcess", "hazardExcess"] as const) {
    const a = base.amounts[field];
    const b = other.amounts[field];
    if (a !== b || a === null) checks.push({ field, baseline: a, alternative: b, uncertain: a === null || b === null });
  }
  for (const field of ["settlement", ...quoteCover, "conditions"] as const) {
    const a = baseline[field].trim();
    const b = alternative[field].trim();
    const notSpecified = (value: string) => value === "" || value === "unverified";
    const uncertain = notSpecified(a) || notSpecified(b) || (quoteCover.some((key) => key === field) && (a === "conditional" || b === "conditional"));
    if (a !== b || uncertain) checks.push({ field, baseline: a, alternative: b, uncertain });
  }
  return { annualDifference: other.amounts.premium - base.amounts.premium, checks };
}
