import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { benchmarkSchema, daysInMonth, distributionSchema } from "../../src/domain/electricity/benchmark.ts";
import { parseCsv } from "./csv.ts";

export const regionIds: Record<string, string> = { "1": "NZ-NTL", "2": "NZ-AUK", "3": "NZ-WKO", "4": "NZ-BOP", "5": "NZ-GIS", "6": "NZ-HKB", "7": "NZ-TKI", "8": "NZ-MWT", "9": "NZ-WGN", "12": "NZ-WTC", "13": "NZ-CAN", "14": "NZ-OTA", "15": "NZ-STL", "16": "NZ-TAS", "17": "NZ-NSN", "18": "NZ-MBH" };
export const downloadUrl = "https://www.emi.ea.govt.nz/Retail/Download/DataReport/CSV/0YUCE0?DateFrom=20250101&DateTo=20260831&RegionType=REG_COUNCIL&Show=Avg&TempAdj=N";
export function importBenchmark(bytes: Buffer, collectedAt: string) {
  const csv = parseCsv(bytes.toString("utf8"));
  if (!csv.some((r) => r[0] === "Region type" && r[1] === "Regional council") || !csv.some((r) => r[0] === "Temperature adjusted" && r[1] === "No")) throw new Error("Wrong report parameters");
  const index = csv.findIndex((r) => r[0] === "Period start");
  const header = csv[index];
  if (!header || header[8] !== "Average consumption (kWh)" || header[15] !== "Coverage %") throw new Error("Unexpected source columns");
  const rows = csv.slice(index + 1).filter((r) => r.some(Boolean)).map((r) => {
    if (r.length !== header.length || !/^01\/\d{2}\/20\d{2}$/.test(r[0])) throw new Error("Invalid source row");
    const [day, m, y] = r[0].split("/");
    const month = `${y}-${m}`;
    if (day !== "01" || r[1] !== `${daysInMonth(month)}/${m}/${y}`) throw new Error("Not a full calendar month");
    return { region: regionIds[r[2]], month, meanKwh: Number(r[8]), coveragePercent: Number(r[15]) };
  });
  const result = benchmarkSchema.parse({ schemaVersion: 1, dataKind: "official-aggregate", source: {
    reportUrl: "https://www.emi.ea.govt.nz/Retail/Reports/0YUCE0", downloadUrl, collectedAt,
    sourceSha256: createHash("sha256").update(bytes).digest("hex"), sourceFile: "source/emi-2025-01-2026-08.csv",
    attribution: "Electricity Authority (New Zealand), EMI residential consumption trends. Mean and coverage columns extracted by OpenBill; original CSV retained.",
    licence: "CC-BY-4.0", licenceUrl: "https://www.ea.govt.nz/copyright-disclaimer-transparency/",
    verification: "source-checked-not-independently-reviewed", checkedAt: collectedAt,
    checkedBy: "openbill-task004-research",
    geography: "Regional council (2013 boundaries)", unit: "kWh/ICP/calendar-month",
    population: "Cleaned residential electricity connection (ICP) sample, including holiday homes; all household sizes. Not a census of occupied households.",
    caveats: ["Monthly grid offtake, excluding self-consumed solar; no loss adjustment or temperature adjustment.", "Source cleaning excludes annual usage below 1,000 or above 30,000 kWh and monthly usage above 5,000 kWh, with smoothing and residential classification exclusions.", "Sample coverage varies by region and month. Household size, heating, climate and occupancy are not controlled.", "Regional location uses ICP information, with NSP fallback where missing; means are rounded by the source.", "No individual household percentile or assessment of necessary consumption can be inferred from a mean."],
    householdSizeStratified: false, temperatureAdjusted: false, from: "2025-01", through: "2026-08",
  }, rows });
  // This importer deliberately pins one reviewed snapshot's scope; refreshes require review.
  if (rows.length !== 320 || new Set(rows.map((r) => r.region)).size !== 16) throw new Error("Incomplete snapshot");
  return result;
}
export function importDistribution(bytes: Buffer, collectedAt: string) {
  const mean = importBenchmark(bytes, collectedAt), csv = parseCsv(bytes.toString("utf8"));
  const index = csv.findIndex((r) => r[0] === "Period start");
  const columns = ["25th percentile (kWh)", "50th percentile (kWh)", "75th percentile (kWh)"] as const;
  if (columns.some((name, i) => csv[index][11 + i] !== name)) throw new Error("Unexpected distribution columns");
  return distributionSchema.parse({ schemaVersion: 1, dataKind: "official-aggregate", source: mean.source,
    derivation: { checkedAt: "2026-11-13T00:20:01.000Z", checkedBy: "openbill-task004-1", sampleSize: null,
      sampleSizeNote: "The CSV publishes coverage percentages, not per-cell sample counts.", columns },
    rows: csv.slice(index + 1).filter((r) => r.some(Boolean)).map((r) => ({ region: regionIds[r[2]], month: `${r[0].slice(6)}-${r[0].slice(3, 5)}`, p25Kwh: Number(r[11]), medianKwh: Number(r[12]), p75Kwh: Number(r[13]) })),
  });
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const target = resolve("data/electricity/benchmarks");
  const bytes = await readFile(resolve(target, "source/emi-2025-01-2026-08.csv"));
  const result = process.argv.includes("--distribution") ? importDistribution(bytes, "2026-11-12T22:41:41.000Z") : importBenchmark(bytes, "2026-11-12T22:41:41.000Z");
  const filename = process.argv.includes("--distribution") ? "regional-monthly-distribution.json" : "regional-monthly.json";
  const output = `${JSON.stringify(result, null, 2)}\n`;
  if (process.argv.includes("--check")) {
    if (await readFile(resolve(target, filename), "utf8") !== output) throw new Error("Benchmark drift");
  } else { await mkdir(target, { recursive: true }); await writeFile(resolve(target, filename), output, { flag: "wx" }); }
  console.log(`Validated ${result.rows.length} official aggregate observations; no supplier prices.`);
}
