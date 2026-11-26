import { electricityLayoutRules, extractElectricityBill, isElectricitySectionItem, printedElectricityConflicts, type BillIssue, type BillLayoutRule, type ElectricityExtraction } from "@/domain/electricity/bill-extraction";
import { genesisChargeRow } from "@/domain/electricity/genesis-bill-layout";

export type PdfIssue = "type" | "size" | "pages" | "timeout" | "encrypted" | "image" | "unsupported" | "invalid";
type PdfResult = { bill: ElectricityExtraction } | { issue: PdfIssue };
export type PdfDiagnostics = {
  stage: "file" | "worker" | "text" | "layout";
  outcome: "recognised" | PdfIssue;
  positionedRules: BillLayoutRule[];
  itemRules: BillLayoutRule[];
  unresolved: BillIssue[];
};
const maxBytes = 8 * 1024 * 1024;
const maxPages = 12;
const maxTextItems = 20_000;
const maxCharacters = 250_000;

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
  const finish = (result: PdfResult) => {
    report?.({ stage, outcome: "issue" in result ? result.issue : "recognised", positionedRules, itemRules: [...itemRules].sort(), unresolved: "bill" in result ? [...new Set([...result.bill.issues, ...printedElectricityConflicts(result.bill)])] : [] });
    return result;
  };
  if ((file.type && !["application/pdf", "application/octet-stream"].includes(file.type)) || !/\.pdf$/i.test(file.name)) return finish({ issue: "type" });
  if (!file.size || file.size > maxBytes) return finish({ issue: "size" });

  let worker: Worker | undefined;
  let encrypted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  let destroy: (() => void) | undefined;
  const stopped = new Promise<PdfResult>((resolve) => {
    timer = setTimeout(() => resolve({ issue: "timeout" }), 10_000);
    abort = () => resolve({ issue: "invalid" });
    signal.addEventListener("abort", abort, { once: true });
  });
  const parse = async (): Promise<PdfResult> => {
    const data = new Uint8Array(await file.arrayBuffer());
    if (signal.aborted || !timer) return { issue: "invalid" };
    if (new TextDecoder().decode(data.subarray(0, 5)) !== "%PDF-") return { issue: "invalid" };
    stage = "worker";
    const pdf = await import("pdfjs-dist");
    if (signal.aborted || !timer) return { issue: "invalid" };
    const port = new Worker("/_openbill/pdf.worker.mjs", { type: "module" });
    worker = port;
    const pdfWorker = pdf.PDFWorker.create({ port, verbosity: 0 });
    const task = pdf.getDocument({
      data, worker: pdfWorker, disableRange: true, disableStream: true, disableAutoFetch: true,
      disableFontFace: true, useSystemFonts: false, useWorkerFetch: false, useWasm: false,
      enableXfa: false, stopAtErrors: true, verbosity: 0,
    });
    destroy = () => { void task.destroy().catch(() => {}); };
    const locked = new Promise<never>((_, reject) => {
      task.onPassword = () => { encrypted = true; reject(new Error("Encrypted PDF")); };
      port.addEventListener("error", () => reject(new Error("Unavailable PDF worker")), { once: true });
    });
    const document = await Promise.race([task.promise, locked]);
    stage = "text";
    if (document.numPages > maxPages) return { issue: "pages" };
    const lines: string[] = [];
    let itemCount = 0, characters = 0, imageOnlyPage = false;
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const reader = page.streamTextContent().getReader();
      const items: Parameters<typeof pageLines>[0][number][] = [];
      try {
        for (;;) {
          const chunk = await reader.read();
          if (chunk.done) break;
          itemCount += chunk.value.items.length;
          if (itemCount > maxTextItems) return { issue: "size" };
          for (const item of chunk.value.items) {
            if (!("str" in item)) continue;
            characters += item.str.length;
            if (characters > maxCharacters) return { issue: "size" };
            items.push(item);
          }
        }
      } finally {
        void reader.cancel().catch(() => {});
      }
      const pageText = pageLines(items);
      for (const rule of electricityLayoutRules(items.flatMap((item) => item.str ? [item.str] : []))) itemRules.add(rule);
      if (!pageText.length) imageOnlyPage = true;
      lines.push(...pageText);
    }
    if (!lines.length) return { issue: "image" };
    stage = "layout";
    if (report) positionedRules = electricityLayoutRules(lines);
    const bill = extractElectricityBill(lines, [...itemRules]);
    if (bill && imageOnlyPage) bill.issues.push("unreadablePage");
    return bill ? { bill } : { issue: "unsupported" };
  };

  try {
    if (signal.aborted) return { issue: "invalid" };
    return finish(await Promise.race([parse().catch((): PdfResult => ({ issue: encrypted ? "encrypted" : "invalid" })), stopped]));
  } finally {
    clearTimeout(timer);
    timer = undefined;
    if (abort) signal.removeEventListener("abort", abort);
    destroy?.();
    worker?.terminate();
  }
}
