// Both supported NZ locales use a decimal point and comma grouping.
const amount = /^(?:(?:\d{1,9}|\d{1,3}(?:,\d{3}){1,2})(?:\.\d{0,2})?|\.\d{1,2})$/;

export function parseMortgageMoney(value: string): number | null {
  const draft = value.trim().replace(/^(?:NZ\$|NZD\b)\s*/i, "");
  if (!amount.test(draft)) return null;
  const [whole, fraction = ""] = draft.replaceAll(",", "").split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

export function formatMortgageAmountOnBlur(value: string, locale: string): string {
  const cents = parseMortgageMoney(value);
  if (cents === null) return value;
  const fractionDigits = value.trim().split(".")[1]?.length ?? 0;
  return new Intl.NumberFormat(locale, {
    useGrouping: true, minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}
