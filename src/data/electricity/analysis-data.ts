import rawBenchmark from "../../../data/electricity/benchmarks/regional-monthly.json";
import rawDistribution from "../../../data/electricity/benchmarks/regional-monthly-distribution.json";
import rawPlans from "../../../data/electricity/comparison-plans.json";
import retailers from "../../../data/electricity/retailers.json";
import networks from "../../../data/electricity/networks.json";
import { benchmarkSchema, distributionSchema, assertSameBenchmarkSnapshot } from "../../domain/electricity/benchmark";
import { comparisonBundleSchema } from "../../domain/electricity/comparison";

export const regionalBenchmark = benchmarkSchema.parse(rawBenchmark);
export const regionalDistribution = distributionSchema.parse(rawDistribution);
assertSameBenchmarkSnapshot(regionalBenchmark, regionalDistribution);
export const comparisonPlans = comparisonBundleSchema.parse(rawPlans);
export const comparisonPolicy = { retailers: retailers.retailers, networks: networks.networks };
