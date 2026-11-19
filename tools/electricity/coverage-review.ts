import { resolve } from "node:path";
import { readJson } from "./files.ts";
import { openRepository, nzDate } from "./repository.ts";
import { validateComparisonPublication } from "./comparison-publication.ts";
import { validatePriceRatingCoverage } from "../../src/domain/electricity/ratings.ts";
import { archiveCoverageReceipt } from "./coverage.ts";

// Explicit local command: never generates a review or writes the consumer index.
if (!process.argv[2] || !process.argv[3]) throw new Error("Usage: npm run data:coverage-review -- <human-review.json> <comparison-bundle.json>");
const now = new Date(), repository = await openRepository();
const bundle = await validateComparisonPublication(await readJson(process.argv[3]), repository, now);
const receipt = validatePriceRatingCoverage(await readJson(process.argv[2]), bundle, repository.policy, now, nzDate(now));
await archiveCoverageReceipt(receipt, resolve(".local-data/coverage-reviews"));
console.info("Human-authored coverage receipt archived locally. No comparison bundle changed or published.");
