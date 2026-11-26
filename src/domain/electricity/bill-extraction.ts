import { amountInput, centsToNzd, kwhInput, kwhToMilli } from "./bill.ts";
import { billingPeriod } from "./billing-period.ts";
import { billToleranceCents, reviewElectricityBill, validBillDays, validUsageRate, type Adjustment, type TaxBasis, type UsageCharge, type UsageKind } from "./bill-review.ts";
import { genesisChargeRow } from "./genesis-bill-layout.ts";

type ExtractedUsage = UsageCharge & { printed?: string };
type PrintedAmountIssue = "fixedAmount" | "usageAmount" | "subtotalAmount" | "gstAmount";
export type BillIssue = "period" | "days" | "fixedDays" | "usage" | "dailyRate" | "usageRate" | "tax" | "total"
  | "fixedChargeRow" | "usageChargeRow" | "adjustmentTax" | "unclassifiedAmount" | "unreadablePage" | PrintedAmountIssue;
const printedAmountIssues = { fixed: "fixedAmount", usage: "usageAmount", subtotal: "subtotalAmount", gst: "gstAmount" } as const;
export function isPrintedAmountIssue(issue: BillIssue): issue is PrintedAmountIssue {
  return issue === "fixedAmount" || issue === "usageAmount" || issue === "subtotalAmount" || issue === "gstAmount";
}
export type ElectricityExtraction = {
  retailer: "genesis" | "mercury" | "unknown";
  period?: { start: string; end: string };
  days: string;
  fixedDays: string;
  kwh: string;
  dailyNzd: string;
  gst: TaxBasis | "";
  totalNzd: string;
  reading?: "actual" | "estimated";
  finalReading: boolean;
  usage: ExtractedUsage[];
  adjustments: Adjustment[];
  printed: { fixed?: string; usage?: string; subtotal?: string; gst?: string };
  account: { gas?: string; previous?: string; payments?: string; transactions?: string; due?: string };
  issues: BillIssue[];
};

export type BillLayoutRule = "genesis-marker" | "mercury-marker" | "genesis-token" | "mercury-token" | "electricity-heading" | "electricity-token" | "usage-row" | "fixed-row" | "usage-quantity" | "fixed-quantity" | "electricity-total-label" | "gst-label" | "rate-per-unit" | "rate-at" | "gas-section" | "usage-math" | "fixed-math" | "usage-math-starts-with-quantity" | "fixed-math-starts-with-quantity" | "usage-math-with-money" | "fixed-math-with-money" | "standalone-money" | "electricity-total-with-money" | "electricity-specific-detail" | "subtotal-with-money" | "gst-with-money" | "explicit-tax-note" | "period-days" | "charges-detail-heading" | "fixed-label" | "usage-label" | "usage-symbol-cents" | "fixed-symbol-cents" | "electricity-section-total";

const numeric = String.raw`\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?`;
const amountEnd = new RegExp(String.raw`(?:^|\s|[:=])\s*([+-]?)\s*\$?\s*([+-]?)((?:${numeric}))\s*(CR)?$`, "i");
const billedUsage = new RegExp(String.raw`^(?:total )?(?:electricity )?billed (?:electricity )?(?:usage|consumption)\s*:?\s*((?:${numeric}))\s*kwh$`, "i");
const usageRow = new RegExp(String.raw`^((?:(?:uncontrolled|standard|anytime|all day|general|electricity|energy|usage|consumption|peak|off[ -]?peak|day|night|controlled|shoulder)\s*)+?)(?:charges?|rate)?\s*:?\s*((?:${numeric}))\s*kwh\s*(?:[@×x]|at)?\s*([\$¢c]?)\s*((?:${numeric}))\s*(cents?|c|¢|nzd)?\s*(?:/\s*kwh|per\s+kwh)?\s+(.*)$`, "i");
const fixedRow = new RegExp(String.raw`^(?:(?:daily|fixed|supply|connection)\s+)+(?:charges?|rate|fee)?\s*:?\s*(\d{1,3})\s*days?\s*(?:[@×x]|at)?\s*([\$¢c]?)\s*((?:${numeric}))\s*(cents?|c|¢|nzd)?\s*(?:/\s*day|per\s+day)?\s+(.*)$`, "i");
const dateToken = String.raw`(?:20\d{2}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]20\d{2}|\d{1,2} [A-Za-z]{3,9} 20\d{2})`;
const periodRow = new RegExp(String.raw`^(?:(?:electricity )?(?:billing|bill|charging) period|period)\s*:?\s*(${dateToken})\s*(?:to|–|—|-)\s*(${dateToken})(?:\s*\(?(\d{1,3}) days?\)?)?$`, "i");
const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function isoDate(value: string) {
  if (/^20\d{2}-/.test(value)) return value;
  const [day, month, year] = value.split(/[ /-]/);
  const monthNumber = /^\d+$/.test(month) ? Number(month) : months.indexOf(month.toLowerCase().slice(0, 3)) + 1;
  return `${year}-${String(monthNumber).padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function unique<T>(values: Set<T>) {
  return values.size === 1 ? [...values][0] : undefined;
}

function decimal(value: string) {
  return value.replaceAll(",", "").replace(/^0+(?=\d)/, "").replace(/(\.\d*?)0+$/, "$1").replace(/\.$/, "");
}

function uniquePrintedAmount(values: Set<string>) {
  return new Set([...values].map(decimal)).size === 1 ? values.values().next().value : undefined;
}

function moneyAtEnd(line: string) {
  const match = amountEnd.exec(line);
  if (!match) return;
  const value = match[3].replaceAll(",", "").replace(/^0+(?=\d)/, "");
  if (!amountInput.safeParse(value).success) return;
  return { value, negative: match[1] === "-" || match[2] === "-" || !!match[4] };
}

function inCents(prefix: string, value: string, unit: string | undefined) {
  const rate = decimal(value);
  if (prefix === "$" || unit?.toLowerCase() === "nzd") {
    if (!/^\d{1,2}(\.\d{1,6})?$/.test(rate)) return;
    const [whole, fraction = ""] = rate.split(".");
    const micros = BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
    return decimal(`${micros / 10_000n}.${String(micros % 10_000n).padStart(4, "0")}`);
  }
  if ((prefix || unit) && validUsageRate(rate)) return rate;
}

function usageKind(label: string): UsageKind {
  if (/off[ -]?peak|night/i.test(label)) return "offPeak";
  if (/peak|^day$/i.test(label)) return "peak";
  if (/\bcontrolled\b/i.test(label)) return "controlled";
  return /shoulder/i.test(label) ? "other" : "standard";
}

const accountLabels = {
  gas: /^(?:(?:total )?(?:natural )?gas charges|(?:natural )?gas total)\b/i,
  previous: /^(?:previous (?:account )?balance|balance brought forward)\b/i,
  payments: /^(?:total payments|payments received|payments since|payment received)\b/i,
  transactions: /^(?:total )?other transactions?(?: (?:credit|debit))?\b/i,
  due: /^(?:(?:total )?(?:amount|balance) (?:now )?due|please pay)\b/i,
};

const normaliseLine = (line: string) => line.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/[\u2212\u2012]/g, "-").replace(/\s+/g, " ").trim();
const genesisMarker = /^(?:genesis energy(?: limited)?|genesisenergy\.co\.nz)\b/i;
const mercuryMarker = /^(?:mercury(?: nz)?(?: limited)?|mercury\.co\.nz)(?:\s*[®™])?$/i;
const electricityHeading = /^(?:your |current )?electricity(?: (?:charges|charge details|charge breakdown|detail|details|breakdown|supply charges|charges this period))?\s*:?$/i;
const electricityTotal = /^(?:(?:total |current(?:[ -]period)? )?electricity (?:charges?|total)|total electricity)\b/i;
const isMoneyOnly = /^\$?\s*[+-]?\s*\d[\d,.]*\.\d{2}(?:\s*CR)?$/i;

export function isElectricitySectionItem(text: string) {
  return electricityHeading.test(normaliseLine(text));
}

// A closed vocabulary. The diagnostic never returns the input used to match a rule.
export function electricityLayoutRules(rawLines: readonly string[]): BillLayoutRule[] {
  const rules: Record<BillLayoutRule, RegExp> = {
    "genesis-marker": genesisMarker, "mercury-marker": mercuryMarker, "genesis-token": /\bgenesis\b/i, "mercury-token": /\bmercury\b/i,
    "electricity-heading": electricityHeading, "electricity-token": /\belectricity\b/i, "usage-row": usageRow, "fixed-row": fixedRow,
    "usage-quantity": /\d\s*kwh\b/i, "fixed-quantity": /\d\s*days?\b/i, "electricity-total-label": electricityTotal,
    "gst-label": /\bgst\b/i, "rate-per-unit": /(?:\/|\bper )\s*(?:kwh|day)\b/i, "rate-at": /(?:[@×]|\bat)\s*\$?\s*\d[\d,.]*/i,
    "gas-section": /^(?:(?:natural )?gas|your (?:natural )?gas)(?:\s|$)/i,
    "usage-math": /\d\s*kwh\b.*(?:\d\s*(?:cents?|¢|c)\b|(?:\/|\bper )\s*kwh\b)/i,
    "fixed-math": /\d\s*days?\b.*(?:\d\s*(?:cents?|¢|c)\b|(?:\/|\bper )\s*day\b)/i,
    "usage-math-starts-with-quantity": /^\d[\d.,]*\s*kwh\b.*\d/i,
    "fixed-math-starts-with-quantity": /^\d{1,3}\s*days?\b.*\d/i,
    "usage-math-with-money": /\d\s*kwh\b.*\$\s*\d[\d,.]*\.\d{2}$/i,
    "fixed-math-with-money": /\d\s*days?\b.*\$\s*\d[\d,.]*\.\d{2}$/i,
    "standalone-money": /^\$\s*\d[\d,.]*\.\d{2}$/,
    "electricity-total-with-money": /^(?:total (?:current )?electricity|current electricity|electricity total)\b.*\d+\.\d{2}\s*$/i,
    "electricity-specific-detail": /\belectricity\b.*\b(?:breakdown|detail|charges?|consumption|usage)\b/i,
    "electricity-section-total": /\b(?:electricity\s+(?:charges?|total)|total\s+electricity)\b.*\d+\.\d{2}/i,
    "subtotal-with-money": /\bsubtotal\b.*\d+\.\d{2}\s*$/i,
    "gst-with-money": /\bgst\b.*\d+\.\d{2}\s*$/i,
    "explicit-tax-note": /(?:excl(?:uding|udes)?|incl(?:uding|udes)?|exclusive of|inclusive of)\.?\s+gst/i,
    "period-days": /\(\s*\d+\s*days?\s*\)/i,
    "charges-detail-heading": /^(?:(?:your|current|new|power|energy|electricity) )*(?:charges? (?:details?|breakdown|summary|for this period)|(?:details?|breakdown) of (?:your )?(?:electricity )?charges?)\b/i,
    "fixed-label": /\b(?:daily (?:fixed |supply )?charge|fixed (?:daily )?charge|daily rate|low user)\b/i,
    "usage-label": /\b(?:uncontrolled|anytime|usage charge|energy charge|electricity usage)\b/i,
    "usage-symbol-cents": /\d\s*(?:cents?|¢|c)\s*(?:\/|per\s+)\s*kwh\b/i,
    "fixed-symbol-cents": /\d\s*(?:cents?|¢|c)\s*(?:\/|per\s+)\s*day\b/i,
  };
  const lines = rawLines.map(normaliseLine).filter((line) => line.length <= 512);
  return (Object.keys(rules) as BillLayoutRule[]).filter((rule) => lines.some((line) => rules[rule].test(line)));
}

export function extractElectricityBill(rawLines: readonly string[], itemRules: readonly BillLayoutRule[] = []): ElectricityExtraction | null {
  const lines = rawLines.map(normaliseLine);
  const genesis = lines.some((line) => genesisMarker.test(line));
  const mercury = lines.some((line) => mercuryMarker.test(line)) || itemRules.includes("mercury-token") || lines.some((line) => /\bmercury\b/i.test(line));
  const retailer = genesis && !mercury ? "genesis" : mercury && !genesis ? "mercury" : "unknown";

  const period = new Set<string>(), days = new Set<string>(), kwh = new Set<string>(), gst = new Set<TaxBasis>();
  const fixed: { days: string; rate: string; printed?: string }[] = [], usage: ExtractedUsage[] = [], adjustments: Adjustment[] = [];
  const printed = { fixed: new Set<string>(), usage: new Set<string>(), subtotal: new Set<string>(), gst: new Set<string>(), total: new Set<string>() };
  const account = { gas: new Set<string>(), previous: new Set<string>(), payments: new Set<string>(), transactions: new Set<string>(), due: new Set<string>() };
  const readings = new Set<"estimated" | "actual">();
  const lineIssues = new Set<BillIssue>();
  let scope: "electricity" | "other" = "other", finalReading = false;

  for (const line of lines) {
    if (line.length > 512) {
      if (scope === "electricity" && line.includes("$")) lineIssues.add("unclassifiedAmount");
      continue;
    }
    if (electricityHeading.test(line)) {
      scope = "electricity";
      continue;
    }
    if (/^(?:your |current )?(?:(?:natural )?gas|other transactions|account (?:summary|activity|transactions|totals?)|broadband|previous balance|payments)(?: (?:charges|details|this period))?\s*:?$/i.test(line)) {
      scope = "other";
      continue;
    }
    const money = moneyAtEnd(line);
    const accountKey = (Object.keys(accountLabels) as (keyof typeof accountLabels)[]).find((key) => accountLabels[key].test(line));
    if (accountKey && money) {
      const negative = money.negative || (/\bcredits?\b/i.test(line) && accountKey === "transactions");
      account[accountKey].add(`${negative ? "-" : ""}${money.value}`);
      if (accountKey === "gas") scope = "other";
      continue;
    }
    if (electricityTotal.test(line) && money && !money.negative && !/\b(?:kwh|days?)\b/i.test(line)) {
      if (/\b(?:before|excl(?:uding)?\.?) gst\b/i.test(line)) printed.subtotal.add(money.value);
      else {
        printed.total.add(money.value);
        // A billed total after the detailed lines ends the electricity block.
        // A labelled account-summary total before those lines does not open it.
        if (fixed.length || usage.length) scope = "other";
      }
      continue;
    }
    if (scope !== "electricity") continue;

    const dates = periodRow.exec(line);
    if (dates) {
      const start = isoDate(dates[1]), end = isoDate(dates[2]);
      if (billingPeriod(start, end)) period.add(`${start}/${end}`);
      if (dates[3]) days.add(dates[3]);
      continue;
    }
    const day = /^(?:electricity )?(?:billing days|number of days|days in (?:billing )?period|bill period length)\s*:?\s*(\d{1,3})(?: days)?$/i.exec(line);
    if (day) { days.add(day[1]); continue; }
    const reading = /^(?:(final) )?(?:meter )?reading(?: type| status)?\s*:?\s*(?:([a-z]+)\s*)?$/i.exec(line);
    if (reading || /^(?:actual|estimated|final) meter reading\b/i.test(line)) {
      if (/estimated/i.test(line)) readings.add("estimated");
      if (/actual/i.test(line)) readings.add("actual");
      if (/final/i.test(line)) finalReading = true;
      continue;
    }
    if (/^(?:(?:electricity |all )?rates?|line charges|prices)\s+(?:(?:are )?including|(?:are )?inclusive of|include|incl\.?)\s+gst\.?$/i.test(line)) { gst.add("inclusive"); continue; }
    if (/^(?:(?:electricity |all )?rates?|line charges|prices)\s+(?:(?:are )?excluding|(?:are )?exclusive of|exclude|excl\.?)\s+gst\.?$/i.test(line)) { gst.add("exclusive"); continue; }

    const billed = billedUsage.exec(line);
    if (billed && kwhInput.safeParse(decimal(billed[1])).success) { kwh.add(decimal(billed[1])); continue; }
    const genesisRow = retailer === "genesis" ? genesisChargeRow(line) : undefined;
    if (genesisRow) {
      const printedAmount = isMoneyOnly.test(genesisRow.amount) ? moneyAtEnd(genesisRow.amount) : undefined;
      if (!printedAmount || printedAmount.negative || !validUsageRate(decimal(genesisRow.cents))) {
        lineIssues.add(genesisRow.kind === "fixed" ? "fixedChargeRow" : "usageChargeRow");
        continue;
      }
      if (genesisRow.kind === "fixed") fixed.push({ days: genesisRow.quantity, rate: centsToNzd(decimal(genesisRow.cents)), printed: printedAmount.value });
      else if (kwhInput.safeParse(decimal(genesisRow.quantity)).success) usage.push({ kind: "standard", kwh: decimal(genesisRow.quantity), cents: decimal(genesisRow.cents), printed: printedAmount.value });
      else lineIssues.add("usageChargeRow");
      continue;
    }
    const f = fixedRow.exec(line), u = usageRow.exec(line);
    if (f) {
      const rate = inCents(f[2], f[3], f[4]), printedAmount = moneyAtEnd(f[5]);
      if (rate !== undefined && !printedAmount?.negative) fixed.push({ days: f[1], rate: centsToNzd(rate), printed: printedAmount?.value });
      else lineIssues.add("fixedChargeRow");
      continue;
    }
    if (u) {
      const rate = inCents(u[3], u[4], u[5]), quantity = decimal(u[2]), printedAmount = moneyAtEnd(u[6]);
      if (rate !== undefined && kwhInput.safeParse(quantity).success && !printedAmount?.negative) usage.push({ kind: usageKind(u[1].trim()), kwh: quantity, cents: rate, printed: printedAmount?.value });
      else lineIssues.add("usageChargeRow");
      continue;
    }

    const summary = /^(?:electricity )?(total usage charges?|total fixed charges?|(?:sub ?total)(?: (?:before|excl(?:uding)?\.?) gst)?|gst(?: \(15%\)| 15%)?|total (?:electricity|charges?)(?: charges?)?)(?=[\s:$]|$)/i.exec(line)?.[1].toLowerCase();
    const summaryAmount = money;
    if (summary && summaryAmount && !summaryAmount.negative) {
      const key = summary.startsWith("total usage") ? "usage" : summary.startsWith("total fixed") ? "fixed"
        : /^sub ?total/.test(summary) ? "subtotal" : summary.startsWith("gst") ? "gst" : "total";
      printed[key].add(summaryAmount.value);
      if (key === "total") scope = "other";
      continue;
    }
    if (!money || isMoneyOnly.test(line)) continue;
    // Account payment methods and their fees do not describe a supply charge.
    if (/^(?:credit|debit) card\b/i.test(line)) continue;
    if (/^(?:(?:unallocated|bundle|account) (?:discount|credit)|discounts? across services)\b/i.test(line)) {
      account.transactions.add(`${money.negative ? "-" : ""}${money.value}`);
      continue;
    }
    if (/^(?:(?:electricity )?(?:discount|credit|rebate)|solar export credit|(?:electricity )?adjustment|gst adjustment|(?:additional|other) electricity charge)\b/i.test(line)) {
      const kind = /^gst adjustment/i.test(line) ? money.negative ? "gstCredit" : "gstAdd"
        : /^solar export/i.test(line) ? "solar"
          : /discount|credit|rebate/i.test(line) || money.negative ? "credit" : "fee";
      const basis = /(?:incl(?:uding)?\.?|including) gst/i.test(line) ? "inclusive" : /(?:excl(?:uding)?\.?|excluding) gst/i.test(line) ? "exclusive" : undefined;
      const requiresGst = !basis && kind !== "gstAdd" && kind !== "gstCredit";
      adjustments.push({ kind, amount: money.value, gst: basis, requiresGst });
      if (requiresGst) lineIssues.add("adjustmentTax");
    } else if (line.includes("$") && Number(money.value) !== 0) lineIssues.add("unclassifiedAmount");
  }

  if (!fixed.length && !usage.length && !kwh.size && !printed.total.size && !printed.subtotal.size && !printed.fixed.size && !printed.usage.size) return null;
  const uniqueFixed = fixed.length === 1 ? fixed[0] : undefined;
  const usageMillis = usage.reduce((sum, row) => sum + kwhToMilli(row.kwh), 0n);
  const sumUsage = decimal(`${usageMillis / 1000n}.${String(usageMillis % 1000n).padStart(3, "0")}`);
  const totalUsage = kwh.size ? unique(kwh) : usage.length && kwhInput.safeParse(sumUsage).success ? sumUsage : undefined;
  const dates = unique(period)?.split("/");
  const billingDays = unique(days) ?? (days.size ? undefined : uniqueFixed?.days);
  const billDays = billingDays && Number(billingDays) >= 1 && Number(billingDays) <= 366 ? billingDays : undefined;
  const totalNzd = uniquePrintedAmount(printed.total);
  const printedSubtotal = uniquePrintedAmount(printed.subtotal), printedGst = uniquePrintedAmount(printed.gst);
  const tax = unique(gst) ?? (!gst.size && printedSubtotal && printedGst && totalNzd && uniqueFixed && totalUsage && billDays &&
    supportsExclusiveTax({ subtotal: printedSubtotal, gst: printedGst, totalNzd, days: billDays, kwh: totalUsage, fixed: uniqueFixed, usage, adjustments }) ? "exclusive" : undefined);
  const issues: BillIssue[] = [];
  if (!dates) issues.push("period");
  if (!billDays) issues.push("days");
  if (uniqueFixed && !validBillDays(uniqueFixed.days)) issues.push("fixedDays");
  if (!totalUsage || (usage.length && kwhToMilli(totalUsage) !== usageMillis)) issues.push("usage");
  if (!uniqueFixed) issues.push("dailyRate");
  if (!usage.length) issues.push("usageRate");
  if (!tax) issues.push("tax");
  if (!totalNzd) issues.push("total");
  for (const key of Object.keys(printedAmountIssues) as (keyof typeof printedAmountIssues)[]) {
    if (printed[key].size > 1 && uniquePrintedAmount(printed[key]) === undefined) issues.push(printedAmountIssues[key]);
  }
  for (const issue of lineIssues) issues.push(issue);

  const extraction: ElectricityExtraction = {
    retailer,
    period: dates ? { start: dates[0], end: dates[1] } : undefined,
    days: billDays ?? "", fixedDays: uniqueFixed?.days ?? "", kwh: totalUsage ?? "",
    dailyNzd: uniqueFixed?.rate ?? "", gst: tax ?? "", totalNzd: totalNzd ?? "",
    reading: unique(readings), finalReading, usage, adjustments, issues,
    printed: { fixed: uniquePrintedAmount(printed.fixed) ?? uniqueFixed?.printed, usage: uniquePrintedAmount(printed.usage) ?? (usage.length === 1 ? usage[0].printed : undefined), subtotal: printedSubtotal, gst: printedGst },
    account: { gas: unique(account.gas), previous: unique(account.previous), payments: unique(account.payments), transactions: unique(account.transactions), due: unique(account.due) },
  };
  return extraction;
}

export function printedElectricityConflicts(
  extraction: ElectricityExtraction, charges = reviewElectricityBill(extraction).charges,
): PrintedAmountIssue[] {
  if (!charges) return [];
  const differs = (printed: string | undefined, calculated: bigint) => printed !== undefined &&
    Math.abs(Math.round(Number(printed) * 100) - Number(calculated)) > billToleranceCents;
  const usage = charges.usageLines.reduce((total, line) => total + line.cents, 0n);
  const totals = { fixed: charges.fixed, usage, subtotal: charges.subtotalCents, gst: charges.gstCents };
  const usageLineConflict = extraction.usage.length === charges.usageLines.length && extraction.usage.some(
    (line, index) => differs(line.printed, charges.usageLines[index].cents),
  );
  const conflicts: PrintedAmountIssue[] = [];
  for (const key of Object.keys(totals) as (keyof typeof totals)[]) {
    if (differs(extraction.printed[key], totals[key]) || (key === "usage" && usageLineConflict)) {
      conflicts.push(printedAmountIssues[key]);
    }
  }
  return conflicts;
}

function supportsExclusiveTax({ subtotal, gst, totalNzd, days, kwh, fixed, usage, adjustments }: {
  subtotal: string; gst: string; totalNzd: string; days: string; kwh: string;
  fixed: { days: string; rate: string; printed?: string }; usage: ExtractedUsage[]; adjustments: Adjustment[];
}) {
  const result = reviewElectricityBill({ days, fixedDays: fixed.days, kwh, dailyNzd: fixed.rate, gst: "exclusive", usage, adjustments, totalNzd });
  const amountIs = (value: string | undefined, cents: bigint) => value !== undefined && Math.round(Number(value) * 100) === Number(cents);
  return !!result.charges && result.differenceCents === 0 && amountIs(subtotal, result.charges.subtotalCents) &&
    amountIs(gst, result.charges.gstCents) && amountIs(fixed.printed, result.charges.fixed) &&
    usage.every((line, index) => amountIs(line.printed, result.charges!.usageLines[index].cents));
}
