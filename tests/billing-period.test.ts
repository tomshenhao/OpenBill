import { expect, it } from "vitest";
import { billingPeriod, compareBillingPeriod } from "@/domain/electricity/billing-period";
import { regionalBenchmark as mean, regionalDistribution as distribution } from "@/data/electricity/analysis-data";
it("recognises inclusive June dates and uses actual archived Auckland data", () => {
  expect(billingPeriod("2026-06-01", "2026-06-30")).toMatchObject({ days: 30, exactMonth: "2026-06" });
  const row = mean.rows.find((r) => r.region === "NZ-AUK" && r.month === "2026-06")!;
  expect(compareBillingPeriod(mean, distribution, { start: "2026-06-01", end: "2026-06-30", region: "NZ-AUK", kwh: "223", approximate: false })).toMatchObject({ available: true, meanKwh: row.meanKwh, householdSizeMatched: false, approximate: false });
});
it("weights only actual covered months with explicit approximation permission", () => {
  const input = { start: "2026-05-16", end: "2026-06-15", region: "NZ-AUK", kwh: "223", approximate: false };
  expect(compareBillingPeriod(mean, distribution, input)).toMatchObject({ available: false });
  const result = compareBillingPeriod(mean, distribution, { ...input, approximate: true });
  const may = mean.rows.find((r) => r.region === "NZ-AUK" && r.month === "2026-05")!.meanKwh;
  const june = mean.rows.find((r) => r.region === "NZ-AUK" && r.month === "2026-06")!.meanKwh;
  expect(result).toMatchObject({ available: true, approximate: true, meanKwh: may * 16 / 31 + june * 15 / 30 });
  expect(result).not.toHaveProperty("centralRange");
  expect(compareBillingPeriod(mean, distribution, { ...input, end: "2026-09-01", approximate: true })).toMatchObject({ available: false });
  expect(billingPeriod("2026-02-30", "2026-03-01")).toBeNull();
  expect(billingPeriod("2026-06-30", "2026-06-01")).toBeNull();
});
