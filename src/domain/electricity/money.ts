import { decimalSchema, type Price } from "./tariff.ts";

// Exact arithmetic shared by bill diagnostics and the guarded comparison engine.
export function nzdToMicros(amount: string): bigint {
  decimalSchema.parse(amount);
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

export function chargeInNanoNzd(price: Price, quantity: { amount: string; unit: "day" | "kWh" }): bigint {
  const rate = nzdToMicros(price.amount);
  if (price.currency !== "NZD") throw new Error("Unsupported currency");
  if (price.unit === "NZD/day" && quantity.unit === "day" && /^\d{1,6}$/.test(quantity.amount)) {
    return rate * BigInt(quantity.amount) * 1000n;
  }
  if (price.unit === "NZD/kWh" && quantity.unit === "kWh" && /^\d{1,6}(\.\d{1,3})?$/.test(quantity.amount)) {
    const [whole, fraction = ""] = quantity.amount.split(".");
    return rate * (BigInt(whole) * 1000n + BigInt(fraction.padEnd(3, "0")));
  }
  throw new Error("Quantity and tariff units do not match, or quantity is invalid");
}

export function roundNanoNzdToCents(total: bigint): bigint {
  if (total < 0n) throw new Error("Negative charge");
  return (total + 5_000_000n) / 10_000_000n; // Round half up, once after summing.
}
