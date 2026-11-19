import { randomUUID } from "node:crypto";
import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { hasOfficialMortgageSource, mortgageCatalogue } from "../../src/data/mortgage/catalogue.ts";
import { artifactSchema, idSchema, officialUrlSchema, utcSchema } from "../../src/domain/provenance.ts";
import { filterMortgageRates, mortgageCatalogueSchema, mortgageRateDetailsSchema, mortgageRateSchema, mortgageReviewSchema, mortgageRightsSchema } from "../../src/domain/mortgage/rates.ts";
import { archiveFile, jsonBytes, sha256, writeOnce } from "../electricity/files.ts";

const root = resolve(".local-data/mortgage");
const text = z.string().trim().min(1).max(1000);
export const mortgageCaptureRequestSchema = z.strictObject({
  dataKind: z.literal("official"),
  publicNonPersonalSourceConfirmed: z.literal(true),
  localCapturePermitted: z.literal(true),
  termsUrl: officialUrlSchema,
  termsNotes: text,
  sourceUrl: officialUrlSchema,
  collectedBy: idSchema, collectedAt: utcSchema, sourceRevision: text,
  sourceFile: z.string().regex(/^[a-z0-9-]+\.(html|pdf)$/),
  screenshotFile: z.string().regex(/^[a-z0-9-]+\.png$/),
  rate: mortgageRateDetailsSchema,
});

const evidenceSchema = z.strictObject({
  sourceUrl: officialUrlSchema, termsUrl: officialUrlSchema, termsNotes: text,
  source: artifactSchema, screenshot: artifactSchema,
});
const readJson = (bytes: Buffer) => JSON.parse(bytes.toString("utf8")) as unknown;
const pngMagic = "89504e470d0a1a0a";
const incomingName = z.string().regex(/^[a-z0-9-]+\.(json|html|pdf|png)$/);
const incoming = (file: string) => archiveFile(root, `incoming/${incomingName.parse(file)}`);

async function archive(file: string) {
  const request = mortgageCaptureRequestSchema.parse(readJson(await incoming(file)));
  if (Date.parse(request.collectedAt) > Date.now()) throw new Error("Capture date is in the future.");
  if (!hasOfficialMortgageSource(request.rate.lenderId, request.sourceUrl)) {
    throw new Error("Unknown lender or unregistered rate source.");
  }
  const [source, screenshot] = await Promise.all([incoming(request.sourceFile), incoming(request.screenshotFile)]);
  if (screenshot.subarray(0, 8).toString("hex") !== pngMagic) throw new Error("Expected a PNG screenshot.");
  if (request.sourceFile.endsWith(".pdf") && source.subarray(0, 5).toString() !== "%PDF-") throw new Error("Expected source PDF bytes.");
  const evidenceId = randomUUID();
  const artifact = (path: string, bytes: Buffer) => ({ path, sha256: sha256(bytes), bytes: bytes.length });
  const evidence = evidenceSchema.parse({
    sourceUrl: request.sourceUrl, termsUrl: request.termsUrl, termsNotes: request.termsNotes,
    source: artifact(request.sourceFile, source), screenshot: artifact(request.screenshotFile, screenshot),
  });
  const manifest = jsonBytes(evidence);
  const candidate = mortgageRateSchema.parse({
    ...request.rate,
    provenance: {
      evidenceId, evidenceManifestSha256: sha256(manifest), sourceUrl: request.sourceUrl,
      collectedAt: request.collectedAt, collectedBy: request.collectedBy, sourceRevision: request.sourceRevision,
      sourceContentSha256: evidence.source.sha256, screenshotSha256: evidence.screenshot.sha256,
    },
  });
  const dir = resolve(root, "records", evidenceId);
  await writeOnce(resolve(dir, evidence.source.path), source);
  await writeOnce(resolve(dir, evidence.screenshot.path), screenshot);
  await writeOnce(resolve(dir, "evidence.json"), manifest);
  const bytes = jsonBytes(candidate);
  await writeOnce(resolve(dir, "rate.json"), bytes);
  process.stdout.write(`Pending record ${evidenceId}\nRecord SHA-256 ${sha256(bytes)}\nEvidence SHA-256 ${sha256(manifest)}\n`);
}

async function inspect(id: string) {
  const relative = `records/${idSchema.parse(id)}`;
  const record = await archiveFile(root, `${relative}/rate.json`);
  const manifest = await archiveFile(root, `${relative}/evidence.json`);
  const rate = mortgageRateSchema.parse(readJson(record));
  const evidence = evidenceSchema.parse(readJson(manifest));
  const provenance = rate.provenance;
  if (provenance.evidenceId !== id || provenance.evidenceManifestSha256 !== sha256(manifest) ||
      provenance.sourceUrl !== evidence.sourceUrl || !hasOfficialMortgageSource(rate.lenderId, provenance.sourceUrl) ||
      provenance.sourceContentSha256 !== evidence.source.sha256 || provenance.screenshotSha256 !== evidence.screenshot.sha256 ||
      !record.equals(jsonBytes(rate))) throw new Error("Rate or manifest integrity mismatch.");
  for (const artifact of [evidence.source, evidence.screenshot]) {
    const bytes = await archiveFile(root, `${relative}/${artifact.path}`);
    if (bytes.length !== artifact.bytes || sha256(bytes) !== artifact.sha256) throw new Error("Archived artifact integrity mismatch.");
  }
  return { rate, recordSha256: sha256(record), relative };
}

function validateReview(mode: "review" | "rights", value: unknown, { rate, recordSha256 }: Awaited<ReturnType<typeof inspect>>) {
  const review = mode === "review" ? mortgageReviewSchema.parse(value) : mortgageRightsSchema.parse(value);
  const date = "verifiedAt" in review ? review.verifiedAt : review.reviewedAt;
  if (review.recordSha256 !== recordSha256 || review.evidenceManifestSha256 !== rate.provenance.evidenceManifestSha256 ||
      review.reviewer === rate.provenance.collectedBy || date < rate.provenance.collectedAt || Date.parse(date) > Date.now()) {
    throw new Error("Independent reviewer, timestamps or receipt bindings are invalid.");
  }
  return review;
}

async function appendReview(mode: "review" | "rights", id: string, file: string) {
  const record = await inspect(id);
  const review = validateReview(mode, readJson(await incoming(file)), record);
  await writeOnce(resolve(root, record.relative, `${mode}.json`), jsonBytes(review));
}

async function listArchive() {
  let dirs;
  try {
    dirs = await readdir(resolve(root, "records"), { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
  const records = [];
  for (const dir of dirs) {
    if (!dir.isDirectory()) throw new Error("Unexpected archive entry.");
    const record = await inspect(dir.name);
    const missingReviews = [];
    for (const mode of ["review", "rights"] as const) {
      try {
        const receipt = await archiveFile(root, `${record.relative}/${mode}.json`);
        validateReview(mode, readJson(receipt), record);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        missingReviews.push(mode);
      }
    }
    const { rate } = record;
    records.push({
      id: dir.name, lender: rate.lenderId, offer: rate.id, term: rate.term, basis: rate.basis,
      collectedAt: rate.provenance.collectedAt, missingReviews,
      published: mortgageCatalogue.entries.some(({ rate: published }) => published.provenance.evidenceId === dir.name),
    });
  }
  return records;
}

function validateCatalogue(catalogue: typeof mortgageCatalogue) {
  for (const { rate, review } of catalogue.entries) {
    if (!hasOfficialMortgageSource(rate.lenderId, rate.provenance.sourceUrl) || sha256(jsonBytes(rate)) !== review.recordSha256) {
      throw new Error("Published rate or source does not match its approval.");
    }
  }
}

async function stage(ids: string[]) {
  const entries = [];
  for (const id of ids) {
    const { rate, relative } = await inspect(id);
    entries.push({
      rate, review: readJson(await archiveFile(root, `${relative}/review.json`)),
      rights: readJson(await archiveFile(root, `${relative}/rights.json`)),
    });
  }
  const catalogue = mortgageCatalogueSchema.parse({ schemaVersion: 1, entries });
  validateCatalogue(catalogue);
  if (filterMortgageRates(catalogue.entries, { term: "all", basis: "all", occupancy: "all" }, new Date().toISOString()).length !== entries.length) {
    throw new Error("Each staged offer must be current.");
  }
  const output = resolve(root, "staged", `${randomUUID()}.json`);
  await writeOnce(output, jsonBytes(catalogue));
  process.stdout.write(`Staged for maintainer approval: ${output}\n`);
}

async function cli([mode, ...args]: string[]) {
  if (mode === "check" && args.length === 0) {
    validateCatalogue(mortgageCatalogue);
    process.stdout.write(`Validated ${mortgageCatalogue.entries.length} published mortgage rate records.\n`);
  } else if (mode === "inventory" && args.length === 0) {
    process.stdout.write(`${JSON.stringify(await listArchive(), null, 2)}\n`);
  } else if (mode === "archive" && args.length === 1) {
    await archive(args[0]);
  } else if (mode === "inspect" && args.length === 1) {
    const { rate, recordSha256 } = await inspect(args[0]);
    process.stdout.write(`Record SHA-256 ${recordSha256}\nEvidence SHA-256 ${rate.provenance.evidenceManifestSha256}\n`);
  } else if ((mode === "review" || mode === "rights") && args.length === 2) {
    await appendReview(mode, args[0], args[1]);
  } else if (mode === "stage" && args.length > 0) {
    await stage(args);
  } else {
    throw new Error("Use check, inventory, archive <incoming request>, inspect <evidence ID>, review|rights <evidence ID> <incoming review>, or stage <evidence IDs>.");
  }
}

if (import.meta.main) await cli(process.argv.slice(2));
