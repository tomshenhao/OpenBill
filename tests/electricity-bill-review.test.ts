import { describe, expect, it } from "vitest";
import { extractElectricityBill, printedElectricityConflicts } from "../src/domain/electricity/bill-extraction.ts";
import { electricitySavingScenarios, reviewElectricityBill, supportsUsageReference, type BillCharges } from "../src/domain/electricity/bill-review.ts";
import { genesisLines, mercuryLines } from "./fixtures/electricity-bills.ts";

const flat: BillCharges = {
  days: "31", kwh: "211", dailyNzd: "1.375", gst: "exclusive", totalNzd: "115.37",
  usage: [{ kind: "standard", kwh: "211", cents: "27.3400" }], adjustments: [],
};

describe("current-period electricity bill review", () => {
  it("calculates the Genesis example and leaves gas and account credits outside electricity", () => {
    const extracted = extractElectricityBill(genesisLines)!;
    expect(extracted).toMatchObject({
      retailer: "genesis", days: "31", kwh: "211", fixedDays: "31", totalNzd: "115.37", gst: "exclusive", reading: "actual", issues: [],
      period: { start: "2026-05-01", end: "2026-05-31" },
      printed: { fixed: "42.63", usage: "57.69", subtotal: "100.32", gst: "15.05" },
      account: { due: "219.14", gas: "111.22", transactions: "-7.45" },
    });
    const reviewed = reviewElectricityBill(extracted);
    expect(reviewed.charges).toMatchObject({ fixed: 4263n, subtotalCents: 10032n, gstCents: 1505n, totalCents: 11537n });
    expect(reviewed.verification).toBe("matches");
    expect(reviewElectricityBill(flat)).toMatchObject({ charges: { totalCents: 11537n }, verification: "matches" });
    expect(reviewElectricityBill(extracted, false).verification).toBe("unable");
  });

  it("uses 7.63 Mercury kWh and GST-inclusive component shares, excluding historical payments", () => {
    const extracted = extractElectricityBill(mercuryLines)!;
    expect(extracted).toMatchObject({
      retailer: "mercury", kwh: "7.63", days: "21", totalNzd: "68.82", finalReading: true, reading: "estimated", issues: [],
      printed: { fixed: "57.96", usage: "1.88", gst: "8.98" },
      account: { previous: "75.00", payments: "-75.00", due: "68.82" },
    });
    const result = reviewElectricityBill(extracted);
    expect(result).toMatchObject({ verification: "matches", charges: { fixed: 5796n, subtotalCents: 5984n, gstCents: 898n, totalCents: 6882n } });
    expect(result.fixedShare).toBeCloseTo(96.8468);
    expect(result.usageShare).toBeCloseTo(3.1386);
  });

  it("calculates inclusive tax without adding GST twice and applies separately labelled mixed-rate adjustments", () => {
    const inclusive = reviewElectricityBill({ ...flat, gst: "inclusive", totalNzd: "100.32" });
    expect(inclusive.charges).toMatchObject({ totalCents: 10032n, subtotalCents: 8723n, gstCents: 1309n });
    const result = reviewElectricityBill({
      ...flat, days: "10", fixedDays: "11", kwh: "100", dailyNzd: "1", totalNzd: "32.01",
      fixedGst: "inclusive",
      usage: [{ kind: "peak", kwh: "60", cents: "30" }, { kind: "controlled", kwh: "40", cents: "20", gst: "inclusive" }],
      adjustments: [{ kind: "fee", amount: "2", gst: "inclusive" }, { kind: "credit", amount: "4" }, { kind: "solar", amount: "5", gst: "inclusive" }, { kind: "gstAdd", amount: "0.50" }],
    });
    expect(result.charges).toMatchObject({ fixed: 1100n, totalCents: 3260n });
    expect(result).toMatchObject({ verification: "difference", differenceCents: -59 });
  });

  it("allows one cent of rounding and reports when a supplied total or reliable usage partition is missing", () => {
    expect(reviewElectricityBill({ ...flat, totalNzd: "115.38" }).verification).toBe("matches");
    expect(reviewElectricityBill({ ...flat, totalNzd: "115.39" }).verification).toBe("difference");
    expect(reviewElectricityBill({ ...flat, totalNzd: "" })).toMatchObject({ verification: "unable", charges: { totalCents: 11537n } });
    expect(reviewElectricityBill({ ...flat, kwh: "210" }).charges).toBeNull();
    expect(reviewElectricityBill({ ...flat, gst: "" }).charges).toBeNull();
  });

  it("keeps rates and fixed charges constant in savings scenarios and suppresses residential references for occasional use", () => {
    const result = electricitySavingScenarios(flat, true)!;
    expect(result.fixedCents).toBe(4902n);
    expect(result.reductions).toEqual([
      { percent: 5, savingCents: 333n, totalCents: 11204n },
      { percent: 10, savingCents: 664n, totalCents: 10873n },
      { percent: 20, savingCents: 1327n, totalCents: 10210n },
    ]);
    expect(electricitySavingScenarios(flat, false)).toBeNull();
    expect(["occupied", "unspecified", "vacant", "holiday"].map((property) => supportsUsageReference(property as Parameters<typeof supportsUsageReference>[0]))).toEqual([true, true, false, false]);
  });

  it("surfaces ambiguous totals, GST and unidentified rows without copying arbitrary bill text", () => {
    const extraction = extractElectricityBill([
      ...mercuryLines.filter((line) => !line.includes("Rates")),
      "Electricity charges",
      "Billed electricity usage 9 kWh", "Unmapped electricity charge $3.00", "Total electricity charges $70.00",
      "Account number: SYNTHETIC-NOT-FOR-OUTPUT",
    ])!;
    expect(extraction).toMatchObject({ totalNzd: "", gst: "", issues: ["usage", "tax", "total", "unclassifiedAmount"] });
    expect(JSON.stringify(extraction)).not.toContain("SYNTHETIC");
    expect(extractElectricityBill(["Unknown retailer", ...mercuryLines.slice(1)])).toMatchObject({ retailer: "unknown", kwh: "7.63", totalNzd: "68.82" });
    expect(extractElectricityBill(["Genesis Energy", "Amount due $219.14"])).toBeNull();
  });

  it("keeps separate peak, off-peak and controlled quantities and requires a basis for unreadable credits", () => {
    const extraction = extractElectricityBill([
      "Mercury", "Electricity charges", "Billing days: 30", "Rates include GST",
      "Daily charge 30 days @ $2.00 per day $60.00",
      "Peak charge 60 kWh @ 30 cents per kWh $18.00",
      "Off-peak charge 30 kWh @ 20 cents per kWh $6.00",
      "Controlled charge 10 kWh @ 15 cents per kWh $1.50",
      "Billed usage 100 kWh", "Solar export credit $5.00", "Electricity total $80.50",
    ])!;
    expect(extraction.usage.map(({ kind, kwh }) => ({ kind, kwh }))).toEqual([
      { kind: "peak", kwh: "60" }, { kind: "offPeak", kwh: "30" }, { kind: "controlled", kwh: "10" },
    ]);
    expect(extraction.issues).toContain("adjustmentTax");
    expect(reviewElectricityBill(extraction).charges).toBeNull();
    expect(reviewElectricityBill({ ...extraction, adjustments: [{ ...extraction.adjustments[0], gst: "inclusive" }] }).verification).toBe("matches");
  });

  it("flags printed usage lines that disagree even when their discrepancies cancel out", () => {
    const lines = [
      "Mercury", "Electricity charges", "Billing days: 30", "Rates include GST",
      "Daily charge 30 days @ $2.00 per day $60.00",
      "Peak charge 60 kWh @ 30 cents per kWh $18.00",
      "Off-peak charge 40 kWh @ 20 cents per kWh $8.00",
      "Total usage charges $26.00", "Electricity total $86.00",
    ];
    expect(printedElectricityConflicts(extractElectricityBill(lines)!)).toEqual([]);
    lines[5] = "Peak charge 60 kWh @ 30 cents per kWh $17.00";
    lines[6] = "Off-peak charge 40 kWh @ 20 cents per kWh $9.00";
    const extraction = extractElectricityBill(lines)!;
    expect(reviewElectricityBill(extraction).verification).toBe("matches");
    expect(printedElectricityConflicts(extraction)).toEqual(["usageAmount"]);
  });

  it("infers exclusive GST only when the printed charges agree, and excludes account card fees", () => {
    const lines = mercuryLines.filter((line) => !line.includes("Rates exclude"));
    lines.splice(lines.findIndex((line) => line.startsWith("Subtotal")), 0, "Credit card payment fee $0.20");
    const extraction = extractElectricityBill(lines)!;
    expect(extraction).toMatchObject({ gst: "exclusive", adjustments: [], issues: [] });
    expect(extractElectricityBill(lines.map((line) => line === "GST $8.98" ? "GST $9.02" : line))?.gst).toBe("");
    const conflicting = extractElectricityBill([...genesisLines].map((line) =>
      line.includes("57.69") ? line.replace("57.69", "57.00") : line));
    expect(printedElectricityConflicts(conflicting!)).toEqual(["usageAmount"]);
    const duplicate = extractElectricityBill([...genesisLines.slice(0, 10), "GST $17.99", ...genesisLines.slice(10)]);
    expect(duplicate?.issues).toContain("gstAmount");
    const repeated = extractElectricityBill([...mercuryLines.slice(0, -1), "Electricity total $69.00", "Electricity total $69"]);
    expect(repeated).toMatchObject({ totalNzd: "69.00", issues: [] });
  });

  it("keeps explicitly identified partial electricity amounts from a new layout", () => {
    const extraction = extractElectricityBill(["Unfamiliar provider", "Electricity charges", "Subtotal $20.00", "Previous balance $42.55"]);
    expect(extraction).toMatchObject({ retailer: "unknown", printed: { subtotal: "20.00" }, totalNzd: "" });
    expect(reviewElectricityBill(extraction!).verification).toBe("unable");
  });
});
