// Invented bill figures that exercise the same layout and arithmetic cases.
export const genesisLines = [
  "Genesis Energy",
  "Account summary",
  "Amount due $219.14",
  "Electricity charges",
  "Billing period: 1 May 2026 to 31 May 2026 (31 days)",
  "Rates exclude GST",
  "Reading type: Actual",
  "Electricity usage 211 kWh @ 27.3400 c/kWh $57.69",
  "Daily fixed charge 31 days @ 137.5000 c/day $42.63",
  "Subtotal before GST $100.32",
  "GST (15%) $15.05",
  "Total electricity charges $115.37",
  "Natural gas charges",
  "Usage charge 408 kWh @ 14.00 c/kWh $57.26",
  "Total gas charges $111.22",
  "Other transactions",
  "Other transaction credit $7.45",
];

export const mercuryLines = [
  "Mercury",
  "Account summary",
  "Usage summary 8 kWh",
  "Previous balance $75.00",
  "Payments received -$75.00",
  "Amount due $68.82",
  "Electricity charge details",
  "Total usage 8 kWh",
  "Billing period: 2026-06-01 to 2026-06-21 (21 days)",
  "Rates exclude GST",
  "Final meter reading",
  "Meter reading type: Estimated",
  "Uncontrolled 7.63 kWh @ 24.58 c/kWh $1.88",
  "Daily supply charge 21 days @ 276.00 c/day $57.96",
  "Subtotal before GST $59.84",
  "GST $8.98",
  "Current electricity charges $68.82",
];

// Build a minimal valid single- or multi-page PDF without extra test dependencies.
type TextCell = readonly [x: number, text: string];
type PdfRow = string | readonly TextCell[];

export function syntheticPdf(pages: PdfRow[][], passwordRequired = false) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${4 + i * 2} 0 R`).join(" ")}] >>`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  const escape = (line: string) => line.replace(/([\\()])/g, "\\$1");
  for (const [i, lines] of pages.entries()) {
    const stream = lines.length
      ? `BT /F1 12 Tf ${lines.flatMap((line, row) => {
        const cells: readonly TextCell[] = typeof line === "string" ? [[45, line]] : line;
        return cells.map(([x, text]) => `1 0 0 1 ${x} ${750 - row * 16} Tm (${escape(text)}) Tj`);
      }).join("\n")} ET`
      : "0 0 0 rg 40 40 50 50 re f";
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 3 0 R >> >> /Contents ${5 + i * 2} 0 R >>`,
      `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    );
  }
  const encryptId = passwordRequired ? objects.length + 1 : null;
  if (encryptId) objects.push(`<< /Filter /Standard /V 1 /R 2 /O <${"a1".repeat(32)}> /U <${"b2".repeat(32)}> /P -4 >>`);
  const encryption = encryptId ? ` /Encrypt ${encryptId} 0 R /ID [<${"c3".repeat(16)}> <${"c3".repeat(16)}>]` : "";
  let content = "%PDF-1.4\n";
  const offsets = objects.map((object, i) => {
    const offset = Buffer.byteLength(content);
    content += `${i + 1} 0 obj\n${object}\nendobj\n`;
    return offset;
  });
  const xref = Buffer.byteLength(content);
  content += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R${encryption} >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(content);
}

// Synthesised independent text cells. The right-hand price is written before its
// label in the content stream so the browser has to reconstruct visual order.
export const positionedGenesis: PdfRow[] = [
  "Genesis Energy", "Account summary", [[535, "219.14"], [510, "$"], [45, "Amount due"]],
  "Electricity", "Billing period: 1 May 2026 to 31 May 2026 (31 days)",
  [[535, "57.69"], [510, "$"], [45, "Uncontrolled"], [205, "211 @ 27.3400 c per unit"]],
  [[535, "42.63"], [510, "$"], [45, "Daily Fixed"], [205, "31 days @ 137.5000 c per day"]],
  [[535, "100.32"], [510, "$"], [45, "Subtotal"]],
  [[535, "15.05"], [510, "$"], [45, "GST"]],
  [[535, "115.37"], [510, "$"], [45, "Electricity charges"]],
  "Natural gas charges", [[535, "111.22"], [510, "$"], [45, "Total gas charges"]],
  "Other transactions", [[535, "7.45"], [510, "$"], [45, "Other transaction credit"]],
];

export const positionedMercury: PdfRow[] = [
  "Mercury customer service", "Account summary", "Usage summary 8 kWh",
  "Previous balance $75.00", "Payments received -$75.00", "Amount due $68.82",
  [[45, "Electricity"], [137, "Meter information"]],
  "Billing period: 2026-06-01 to 2026-06-21 (21 days)",
  "Final meter reading", "Meter reading type: Estimated",
  [[535, "1.88"], [510, "$"], [45, "Anytime"], [160, "7.63 kWh"], [235, "24.58 c/kWh"]],
  [[535, "57.96"], [510, "$"], [45, "Daily charge"], [160, "21 days"], [235, "276.00 c/day"]],
  [[535, "0.20"], [510, "$"], [45, "Credit card payment fee"]],
  [[535, "59.84"], [510, "$"], [45, "Subtotal"]],
  [[535, "8.98"], [510, "$"], [45, "GST"]],
  [[535, "68.82"], [510, "$"], [45, "Electricity total"]],
];
