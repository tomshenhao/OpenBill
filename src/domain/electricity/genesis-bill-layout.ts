// Genesis describes an electricity consumption kWh as a unit in the
// Uncontrolled charge row. Apply these shapes inside the electricity section.
const quantity = String.raw`(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?`;
const cents = String.raw`(?:cents?|c|¢)`;
const price = String.raw`(\$?\s*\d[\d,]*\.\d{2})$`;
const unitRate = new RegExp(String.raw`\b(${quantity})\s*(?:k\s*w[.\s]*h|units?)?\s*(?:@|at|×|x)\s*(${quantity})\s*${cents}\s*(?:(?:per|/)\s*(?:units?|k\s*w[.\s]*h))?\s*\)?\s+${price}`, "i");
const dayRate = new RegExp(String.raw`\b(\d{1,3})\s*days?\s*(?:@|at|×|x)\s*(${quantity})\s*${cents}\s*(?:(?:per|/)\s*day)?\s*\)?\s+${price}`, "i");

export function genesisChargeRow(line: string) {
  const fixed = /\bdaily\b/i.test(line) ? dayRate.exec(line) : null;
  if (fixed) return { kind: "fixed" as const, quantity: fixed[1], cents: fixed[2], amount: fixed[3] };
  const usage = /\b(?:uncontrolled|anytime)\b/i.test(line) ? unitRate.exec(line) : null;
  if (usage) return { kind: "usage" as const, quantity: usage[1], cents: usage[2], amount: usage[3] };
}
