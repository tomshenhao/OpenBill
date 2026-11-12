import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";
import { archiveEvidence, evidenceManifestDigest, loadEvidence, stageEvidencePublication } from "./evidence.ts";
import { capturePermittedPage } from "./capture.ts";
import { readJson } from "./files.ts";
import { nzDate, openRepository } from "./repository.ts";

const [command, ...args] = process.argv.slice(2);
function option(flag: string, required = false) {
  const index = args.indexOf(flag);
  if (index === -1 || !args[index + 1] || args[index + 1].startsWith("--")) {
    if (required) throw new Error(`Missing ${flag}`);
    return undefined;
  }
  return args[index + 1];
}

try {
  const repository = await openRepository();
  if (command === "validate") {
    const report = await repository.inspect();
    console.info(JSON.stringify({ consumerComparisonsEnabled: false, records: report.assessments.length, eligible: report.assessments.filter((entry) => entry.eligible).length, issues: report.issues, states: report.assessments.map((entry) => ({ recordId: entry.record.recordId, status: entry.status, reasons: entry.reasons })) }, null, 2));
    if (report.issues.length) process.exitCode = 1;
  } else if (command === "archive") {
    const manifest = await archiveEvidence(await readJson(resolve(option("--request", true)!)), repository.evidenceRoot, repository.policy);
    console.info(JSON.stringify({ evidenceId: manifest.evidenceId, evidenceManifestSha256: await evidenceManifestDigest(repository.evidenceRoot, manifest.retailerId, manifest.evidenceId), status: manifest.verificationStatus, sourceContentSha256: manifest.sourceContent.sha256, screenshotSha256: manifest.screenshot?.sha256 ?? null }, null, 2));
  } else if (command === "import") {
    const record = await repository.importRecord(await readJson(resolve(option("--file", true)!)));
    console.info(JSON.stringify({ recordId: record.recordId, status: record.status }));
  } else if (command === "review") {
    const review = await repository.appendReview(await readJson(resolve(option("--file", true)!)));
    console.info(JSON.stringify({ reviewId: review.reviewId, recordId: review.recordId, status: review.status }));
  } else if (command === "query") {
    const matches = await repository.query({ asOf: option("--date") ?? nzDate(new Date()), retailerId: option("--retailer"), planId: option("--plan"), regionCode: option("--region"), networkId: option("--network"), metering: option("--metering"), registers: option("--registers")?.split(","), userCategory: option("--category"), eligibleOnly: args.includes("--eligible") });
    console.info(JSON.stringify(matches.map((entry) => ({ recordId: entry.record.recordId, recordSha256: entry.recordSha256, retailerId: entry.record.retailerId, plan: entry.record.plan.name, status: entry.status, verifiedAt: entry.verifiedAt, eligible: entry.eligible, reasons: entry.reasons })), null, 2));
  } else if (command === "stage-evidence") {
    const retailer = option("--retailer", true)!;
    const evidence = await loadEvidence(repository.evidenceRoot, retailer, option("--evidence", true)!);
    const output = resolve("evidence/published");
    await mkdir(output, { recursive: true });
    await stageEvidencePublication(repository.evidenceRoot, evidence, await readJson(resolve(option("--rights-review", true)!)), output);
    console.info("Evidence staged locally in ignored evidence/published/. Nothing was committed or uploaded.");
  } else if (command === "capture") {
    const root = resolve(".local-data/captures");
    await mkdir(root, { recursive: true });
    await capturePermittedPage(await readJson(resolve(option("--request", true)!)), repository.policy, resolve(root, randomUUID()), resolve(".local-data/rate-limits"));
    console.info("Permitted source captured locally. Archive and import separately; capture does not verify a tariff.");
  } else {
    throw new Error("Commands: validate, archive --request, import --file, review --file, query, capture --request, stage-evidence --retailer --evidence --rights-review");
  }
} catch (error) {
  // Report field paths, not input values or source document contents.
  if (error && typeof error === "object" && "issues" in error && Array.isArray(error.issues)) console.error(JSON.stringify({ error: "Schema validation failed", fields: error.issues.map((issue: { path: unknown[] }) => issue.path.join(".")) }));
  else console.error(error instanceof Error ? error.message : "Data command failed");
  process.exitCode = 1;
}
