export type PdfIssue = "type" | "size" | "pages" | "timeout" | "encrypted" | "image" | "unsupported" | "invalid";
type LocalPdfResult<T> = { bill: T } | { issue: PdfIssue };
export type PdfTextItem = { str: string; transform: number[]; width: number };
const maxBytes = 8 * 1024 * 1024;
const maxPages = 12;
const maxTextItems = 20_000;
const maxCharacters = 250_000;

export async function readLocalPdf<T>(
  file: File, signal: AbortSignal, onPage: (items: PdfTextItem[]) => void,
  extract: (imageOnlyPage: boolean) => T | null, stages?: (stage: "worker" | "text" | "layout") => void,
): Promise<LocalPdfResult<T>> {
  if ((file.type && !["application/pdf", "application/octet-stream"].includes(file.type)) || !/\.pdf$/i.test(file.name)) return { issue: "type" };
  if (!file.size || file.size > maxBytes) return { issue: "size" };

  let worker: Worker | undefined;
  let encrypted = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let abort: (() => void) | undefined;
  let destroy: (() => void) | undefined;
  const stopped = new Promise<LocalPdfResult<T>>((resolve) => {
    timer = setTimeout(() => resolve({ issue: "timeout" }), 10_000);
    abort = () => resolve({ issue: "invalid" });
    signal.addEventListener("abort", abort, { once: true });
  });
  const parse = async (): Promise<LocalPdfResult<T>> => {
    const data = new Uint8Array(await file.arrayBuffer());
    if (signal.aborted || !timer) return { issue: "invalid" };
    if (new TextDecoder().decode(data.subarray(0, 5)) !== "%PDF-") return { issue: "invalid" };
    stages?.("worker");
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
    stages?.("text");
    if (document.numPages > maxPages) return { issue: "pages" };
    let itemCount = 0, characters = 0, hasText = false, imageOnlyPage = false;
    for (let i = 1; i <= document.numPages; i++) {
      const page = await document.getPage(i);
      const reader = page.streamTextContent().getReader();
      const items: PdfTextItem[] = [];
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
      const pageHasText = items.some((item) => item.str.trim());
      hasText ||= pageHasText;
      imageOnlyPage ||= !pageHasText;
      onPage(items);
    }
    if (!hasText) return { issue: "image" };
    stages?.("layout");
    const bill = extract(imageOnlyPage);
    return bill ? { bill } : { issue: "unsupported" };
  };

  try {
    if (signal.aborted) return { issue: "invalid" };
    return await Promise.race([parse().catch((): LocalPdfResult<T> => ({ issue: encrypted ? "encrypted" : "invalid" })), stopped]);
  } finally {
    clearTimeout(timer);
    timer = undefined;
    if (abort) signal.removeEventListener("abort", abort);
    destroy?.();
    worker?.terminate();
  }
}
