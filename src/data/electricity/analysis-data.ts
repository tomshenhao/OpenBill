import rawBenchmark from "../../../data/electricity/benchmarks/regional-monthly.json";
import rawDistribution from "../../../data/electricity/benchmarks/regional-monthly-distribution.json";
import rawPlans from "../../../data/electricity/comparison-plans.json";
import retailers from "../../../data/electricity/retailers.json";
import networks from "../../../data/electricity/networks.json";
import rawUsageRatings from "../../../data/electricity/benchmarks/regional-monthly-ratings.json";
import rawPriceCoverage from "../../../data/electricity/price-rating-coverage.json";
import { usageRatingDatasetSchema, priceCoverageSchema } from "../../domain/electricity/ratings";
import { benchmarkSchema, distributionSchema, assertSameBenchmarkSnapshot } from "../../domain/electricity/benchmark";
import { comparisonBundleSchema } from "../../domain/electricity/comparison";

export const regionalBenchmark = benchmarkSchema.parse(rawBenchmark);
export const regionalDistribution = distributionSchema.parse(rawDistribution);
assertSameBenchmarkSnapshot(regionalBenchmark, regionalDistribution);
export const comparisonPlans = comparisonBundleSchema.parse(rawPlans);
export const comparisonPolicy = { retailers: retailers.retailers, networks: networks.networks };
export const usageRatingData = usageRatingDatasetSchema.parse(rawUsageRatings);
if (JSON.stringify(usageRatingData.source) !== JSON.stringify(regionalBenchmark.source) || usageRatingData.rows.length !== regionalDistribution.rows.length || usageRatingData.rows.some((row) => !regionalDistribution.rows.some((r) => r.region === row.region && r.month === row.month && r.p75Kwh === row.p75Kwh))) throw new Error("Rating data must match the archived distribution snapshot");
export const priceRatingCoverage = priceCoverageSchema.parse(rawPriceCoverage);
