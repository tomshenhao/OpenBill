import rawBenchmark from "../../../data/electricity/benchmarks/regional-monthly.json";
import rawDistribution from "../../../data/electricity/benchmarks/regional-monthly-distribution.json";
import rawUsageRatings from "../../../data/electricity/benchmarks/regional-monthly-ratings.json";
import { usageRatingDatasetSchema } from "../../domain/electricity/ratings";
import { benchmarkSchema, distributionSchema, assertSameBenchmarkSnapshot } from "../../domain/electricity/benchmark";

export { comparisonPlans, comparisonPolicy, priceRatingCoverage } from "./comparison-data";

export const regionalBenchmark = benchmarkSchema.parse(rawBenchmark);
export const regionalDistribution = distributionSchema.parse(rawDistribution);
assertSameBenchmarkSnapshot(regionalBenchmark, regionalDistribution);
export const usageRatingData = usageRatingDatasetSchema.parse(rawUsageRatings);
if (JSON.stringify(usageRatingData.source) !== JSON.stringify(regionalBenchmark.source) || usageRatingData.rows.length !== regionalDistribution.rows.length || usageRatingData.rows.some((row) => !regionalDistribution.rows.some((r) => r.region === row.region && r.month === row.month && r.p75Kwh === row.p75Kwh))) throw new Error("Rating data must match the archived distribution snapshot");
