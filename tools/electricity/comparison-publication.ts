import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { comparisonBundleSchema, entryIsCurrent, type ComparisonEntry } from "../../src/domain/electricity/comparison.ts";
import { reviewSchema } from "../../src/domain/electricity/tariff.ts";
import { openRepository, nzDate, type JsonTariffRepository } from "./repository.ts";
import { loadEvidence } from "./evidence.ts";
import { jsonBytes, readJson, writeOnce } from "./files.ts";

export async function validateComparisonPublication(raw: unknown, repository: JsonTariffRepository, now = new Date()) {
  const bundle = comparisonBundleSchema.parse(raw);
  const inspected = await repository.inspect(now);
  if (inspected.issues.length) throw new Error("Invalid source catalogue");
  const seen = new Set<string>();
  for (const entry of bundle.entries) {
    const { record: r, review } = entry;
    if (seen.has(r.recordId)) throw new Error("Duplicate publication");
    seen.add(r.recordId);
    const assessment = inspected.assessments.find((a) => a.record.recordId === r.recordId);
    if (!assessment?.eligible || assessment.record.dataKind !== "official" || assessment.recordSha256 !== entry.recordSha256 || assessment.verifiedAt !== review.reviewedAt || assessment.reviewerId !== review.reviewerId || JSON.stringify(assessment.record) !== JSON.stringify(r)) throw new Error("Publication does not match a current eligible official record");
    const storedReview = reviewSchema.parse(await readJson(resolve(repository.dataRoot, "reviews", r.recordId, `${review.reviewId}.json`)));
    if (JSON.stringify(storedReview) !== JSON.stringify(review)) throw new Error("Publication review mismatch");
    const evidence = await loadEvidence(repository.evidenceRoot, r.retailerId, r.provenance.evidenceId, now);
    if (evidence.rights.redistribution !== "permission-granted" || evidence.rights.permissionReference !== entry.rights.permissionReference) throw new Error("Public tariff redistribution permission has not been recorded");
    if (!entryIsCurrent(entry, repository.policy, now, nzDate(now))) throw new Error("Publication fails consumer gates");
  }
  return bundle;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repository = await openRepository();
  if (process.argv[2] === "stage") {
    // Explicit local manifest containing selected records, reviews and rights-review receipts.
    // There is deliberately no automatic mapping, verification or public overwrite command.
    if (!process.argv[3]) throw new Error("Provide a local comparison bundle for review");
    const bundle = await validateComparisonPublication(JSON.parse(await readFile(process.argv[3], "utf8")), repository);
    await writeOnce(resolve(".local-data/publication", `${Date.now()}-comparison-plans.json`), jsonBytes(bundle));
    console.log(`Staged ${bundle.entries.length} records locally for publication review.`);
  } else {
    const bundle = await validateComparisonPublication(await readJson(resolve(repository.dataRoot, "comparison-plans.json")), repository);
    console.log(`Validated ${bundle.entries.length} published comparison records against evidence, reviews and rights.`);
  }
}

export type { ComparisonEntry };
