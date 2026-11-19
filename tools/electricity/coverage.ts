import { resolve } from "node:path";
import { priceCoverageSchema } from "../../src/domain/electricity/ratings.ts";
import { archiveFile, jsonBytes, writeOnce } from "./files.ts";

// Archive a human-authored receipt; this function does not perform or attest a review.
export async function archiveCoverageReceipt(raw: unknown, root: string) {
  const receipt = priceCoverageSchema.parse(raw);
  if (receipt.reviews.length !== 1) throw new Error("Archive exactly one new coverage review at a time");
  await writeOnce(resolve(root, `${receipt.reviews[0].reviewId}.json`), jsonBytes(receipt));
  return receipt;
}
export async function assertArchivedCoverageReviews(raw: unknown, root: string) {
  const coverage = priceCoverageSchema.parse(raw);
  for (const review of coverage.reviews) {
    const bytes = await archiveFile(root, `${review.reviewId}.json`);
    const receipt = priceCoverageSchema.parse(JSON.parse(bytes.toString("utf8")));
    if (JSON.stringify(receipt) !== JSON.stringify({ schemaVersion: 1, reviews: [review] })) throw new Error("Coverage review does not match its immutable archived receipt");
  }
}
