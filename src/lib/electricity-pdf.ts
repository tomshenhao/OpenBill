import { electricityLayoutRules, extractElectricityBill, isElectricitySectionItem, printedElectricityConflicts, type BillIssue, type BillLayoutRule, type ElectricityExtraction } from "@/domain/electricity/bill-extraction";
import { genesisChargeRow } from "@/domain/electricity/genesis-bill-layout";

import { readLocalPdf, type PdfIssue } from "./local-pdf";
export type { PdfIssue } from "./local-pdf";
type PdfResult = { bill: ElectricityExtraction } | { issue: PdfIssue };
export type PdfDiagnostics = {
  stage: "file" | "worker" | "text" | "layout";
  outcome: "recognised" | PdfIssue;
  positionedRules: BillLayoutRule[];
  itemRules: BillLayoutRule[];
  unresolved: BillIssue[];
};
function pageLines(items: readonly { str?: string; transform?: number[]; width?: number }[]) {
  const positioned = items.flatMap(({ str, transform, width }) =>
    str?.trim() && transform ? [{ text: str.trim(), x: transform[4], y: transform[5], width: width ?? 0, startsSpace: /^\s/.test(str), endsSpace: /\s$/.test(str) }] : []);
  positioned.sort((a, b) => b.y - a.y || a.x - b.x);
  const rows: { y: number; items: typeof positioned }[] = [];
  for (const item of positioned) {
    const previous = rows.at(-1);
    if (previous && Math.abs(previous.y - item.y) <= 2) previous.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  return rows.flatMap((row) => {
    const lines: string[] = [];
    let previous: (typeof positioned)[number] | undefined;
    for (const item of row.items.sort((a, b) => a.x - b.x)) {
      const gap = previous ? item.x - previous.x - previous.width : 0;
      if (!previous || gap > 100 && !/^(?:\$\s*$|[+$\-]?\s*\d)/.test(item.text)) lines.push(item.text);
      else {
        const joined = gap < 1 && !previous.endsSpace && !item.startsSpace && /[\w.]$/.test(previous.text) && /^[\w.]/.test(item.text);
        lines[lines.length - 1] += (joined ? "" : " ") + item.text;
      }
      previous = item;
    }
    const visualRow = row.items.map((item) => item.text).join(" ");
    if (lines.length > 1 && genesisChargeRow(visualRow)) return [visualRow];
    const first = row.items[0];
    if (first && isElectricitySectionItem(first.text) && !lines.some(isElectricitySectionItem)) lines.unshift(first.text);
    return lines;
  });
}

export async function readElectricityPdf(file: File, signal: AbortSignal, report?: (diagnostics: PdfDiagnostics) => void): Promise<PdfResult> {
  let stage: PdfDiagnostics["stage"] = "file";
  let positionedRules: BillLayoutRule[] = [];
  const itemRules = new Set<BillLayoutRule>();
  const lines: string[] = [];
  const result = await readLocalPdf(file, signal, (items) => {
    lines.push(...pageLines(items));
    for (const rule of electricityLayoutRules(items.map((item) => item.str))) itemRules.add(rule);
  }, (imageOnlyPage) => {
    if (report) positionedRules = electricityLayoutRules(lines);
    const bill = extractElectricityBill(lines, [...itemRules]);
    if (bill && imageOnlyPage) bill.issues.push("unreadablePage");
    return bill;
  }, (next) => { stage = next; });
  if (!signal.aborted) report?.({ stage, outcome: "issue" in result ? result.issue : "recognised", positionedRules, itemRules: [...itemRules].sort(), unresolved: "bill" in result ? [...new Set([...result.bill.issues, ...printedElectricityConflicts(result.bill)])] : [] });
  return result;
}
