// Small RFC 4180 reader. Used offline; never receives household bills.
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false, closed = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') { quoted = false; closed = true; }
      else cell += c;
    } else if (c === '"') {
      if (cell || closed) throw new Error("Invalid CSV quote");
      quoted = true;
    } else if (c === ",") { row.push(cell); cell = ""; closed = false; }
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); rows.push(row); row = []; cell = ""; closed = false;
    } else { if (closed) throw new Error("Characters after CSV quote"); cell += c; }
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  if (cell || row.length || closed) { row.push(cell); rows.push(row); }
  return rows;
}
