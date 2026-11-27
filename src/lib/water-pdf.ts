import { extractWatercareBill, type WaterBillCell } from "../domain/water/pdf-bill.ts";
import { readLocalPdf } from "./local-pdf.ts";

export function readWatercarePdf(file: File, signal: AbortSignal) {
  const pages: WaterBillCell[][] = [];
  return readLocalPdf(file, signal, (items) => pages.push(items.map(({ str, transform }) => ({
    text: str, x: transform[4], y: transform[5],
  }))), (imageOnlyPage) => extractWatercareBill(pages, imageOnlyPage));
}
