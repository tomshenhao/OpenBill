import rawPlans from "../../../data/electricity/comparison-plans.json";
import retailers from "../../../data/electricity/retailers.json";
import networks from "../../../data/electricity/networks.json";
import rawPriceCoverage from "../../../data/electricity/price-rating-coverage.json";
import { priceCoverageSchema } from "../../domain/electricity/ratings";
import { comparisonBundleSchema } from "../../domain/electricity/comparison";

export const comparisonPlans = comparisonBundleSchema.parse(rawPlans);
export const comparisonPolicy = { retailers: retailers.retailers, networks: networks.networks };
export const priceRatingCoverage = priceCoverageSchema.parse(rawPriceCoverage);
