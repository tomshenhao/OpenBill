import { randomUUID } from "node:crypto";
import { mkdir, readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { z } from "zod";
import { evidenceSchema, idSchema, officialUrlSchema, utcSchema, type EvidenceManifest } from "../../src/domain/electricity/tariff.ts";
import type { DataPolicy } from "../../src/domain/electricity/validation.ts";
import { archiveFile, jsonBytes, readJson, sha256, writeOnce } from "./files.ts";
import { mercuryManualAdapter, type ManualCollectionAdapter } from "./adapters/mercury.ts";

export const archiveRequestSchema = evidenceSchema.omit({ schemaVersion: true, category: true, evidenceId: true, archivedAt: true, sourceContent: true, screenshot: true, collectionStatus: true, verificationStatus: true }).extend({
  sourceFile: z.string().min(1), screenshotFile: z.string().min(1).nullable(),
});

export function isPng(bytes: Buffer): boolean {
  return bytes.length >= 45 && bytes.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) && bytes.toString("ascii", 12, 16) === "IHDR" && bytes.readUInt32BE(16) > 0 && bytes.readUInt32BE(20) > 0 && bytes.toString("ascii", bytes.length - 8, bytes.length - 4) === "IEND";
}

export function assertOfficialSource(retailerId: string, url: string, policy: DataPolicy) {
  officialUrlSchema.parse(url);
  const retailer = policy.retailers.find((entry) => entry.id === retailerId);
  if (!retailer || !retailer.officialHosts.includes(new URL(url).hostname) || !retailer.sourceUrls.includes(url)) throw new Error("Source is not an approved public official URL");
}

export async function archiveEvidence(input: unknown, root: string, policy: DataPolicy, now = new Date(), adapter: ManualCollectionAdapter = mercuryManualAdapter): Promise<EvidenceManifest> {
  const request = archiveRequestSchema.parse(input);
  assertOfficialSource(request.retailerId, request.sourceUrl, policy);
  const retailer = policy.retailers.find((entry) => entry.id === request.retailerId)!;
  if (adapter.retailerId !== request.retailerId || !retailer.officialHosts.includes(new URL(request.terms.url).hostname) || (retailer.termsUrl && request.terms.url !== retailer.termsUrl)) throw new Error("Adapter or terms source does not match the retailer policy");
  if (new Date(request.collectedAt) > now || new Date(request.terms.reviewedAt) > new Date(request.collectedAt)) throw new Error("Collection and terms-review timestamps are inconsistent");
  if (request.captureMethod === "playwright" && retailer.automation !== "permitted") throw new Error("Automated capture is not permitted by retailer policy");
  if (!request.screenshotFile && !request.screenshotUnavailableReason) throw new Error("Explain why screenshot evidence is unavailable");
  if (request.screenshotFile && request.screenshotUnavailableReason) throw new Error("Screenshot status is contradictory");
  if (request.rights.redistribution === "permission-granted" && !request.rights.permissionReference) throw new Error("Permission reference is required");
  const suffix = extname(request.sourceFile).toLowerCase();
  if (![".html", ".pdf", ".txt"].includes(suffix)) throw new Error("Archive an original HTML, PDF or text source");
  const source = await readFile(request.sourceFile);
  const screenshot = request.screenshotFile ? await readFile(request.screenshotFile) : null;
  if (!source.length || source.length > 25_000_000 || (screenshot && (screenshot.length > 25_000_000 || !isPng(screenshot)))) throw new Error("Empty, oversized or invalid source/screenshot");
  const evidenceId = randomUUID();
  const directory = `electricity/${request.retailerId}/${evidenceId}`;
  const manifest = evidenceSchema.parse({
    schemaVersion: 1, category: "electricity", evidenceId, retailerId: request.retailerId, plan: request.plan,
    sourceUrl: request.sourceUrl, collectedAt: request.collectedAt, archivedAt: now.toISOString(), collectedBy: request.collectedBy,
    sourceRevision: request.sourceRevision,
    sourceContent: { path: `${directory}/source${suffix}`, sha256: sha256(source), bytes: source.length },
    screenshot: screenshot ? { path: `${directory}/source.png`, sha256: sha256(screenshot), bytes: screenshot.length } : null,
    screenshotUnavailableReason: request.screenshotUnavailableReason, captureMethod: request.captureMethod,
    collectionStatus: "collected", verificationStatus: "pending-verification", terms: request.terms, rights: request.rights,
    publicNonPersonalSourceConfirmed: true,
  });
  adapter.validate(manifest);
  // A fresh directory per capture; no update or overwrite operation exists.
  await mkdir(resolve(root, directory), { recursive: true });
  await writeOnce(resolve(root, manifest.sourceContent.path), source);
  if (screenshot && manifest.screenshot) await writeOnce(resolve(root, manifest.screenshot.path), screenshot);
  await writeOnce(resolve(root, directory, "manifest.json"), jsonBytes(manifest));
  return manifest;
}

export async function loadEvidence(root: string, retailerId: string, evidenceId: string, now = new Date()): Promise<EvidenceManifest> {
  idSchema.parse(retailerId); idSchema.parse(evidenceId);
  const directory = `electricity/${retailerId}/${evidenceId}`;
  const bytes = await archiveFile(root, `${directory}/manifest.json`);
  const manifest = evidenceSchema.parse(JSON.parse(bytes.toString("utf8")));
  if (manifest.retailerId !== retailerId || manifest.evidenceId !== evidenceId) throw new Error("Evidence identity mismatch");
  if (new Date(manifest.collectedAt) > now || new Date(manifest.archivedAt) > now || manifest.archivedAt < manifest.collectedAt || manifest.terms.reviewedAt > manifest.collectedAt) throw new Error("Invalid evidence chronology");
  if (!manifest.screenshot && !manifest.screenshotUnavailableReason) throw new Error("Missing screenshot explanation");
  if (manifest.screenshot && manifest.screenshotUnavailableReason) throw new Error("Contradictory screenshot status");
  if (manifest.rights.redistribution === "permission-granted" && !manifest.rights.permissionReference) throw new Error("Missing permission reference");
  if (manifest.sourceContent.path === manifest.screenshot?.path) throw new Error("Source and screenshot must be separate artifacts");
  for (const artifact of [manifest.sourceContent, manifest.screenshot]) {
    if (!artifact) continue;
    if (!artifact.path.startsWith(`${directory}/`)) throw new Error("Artifact belongs to another collection");
    const content = await archiveFile(root, artifact.path);
    if (content.length !== artifact.bytes || sha256(content) !== artifact.sha256) throw new Error("Evidence checksum/size mismatch");
    if (artifact === manifest.screenshot && !isPng(content)) throw new Error("Screenshot is not a readable PNG header");
  }
  return manifest;
}

export async function evidenceManifestDigest(root: string, retailerId: string, evidenceId: string): Promise<string> {
  idSchema.parse(retailerId); idSchema.parse(evidenceId);
  return sha256(await archiveFile(root, `electricity/${retailerId}/${evidenceId}/manifest.json`));
}

export const publicationRequestSchema = z.strictObject({ evidenceId: idSchema, evidenceManifestSha256: z.string().regex(/^[a-f0-9]{64}$/), reviewerId: idSchema, reviewedAt: utcSchema, permissionReference: z.string().min(1), publicNonPersonalSourceConfirmed: z.literal(true) });

export async function stageEvidencePublication(root: string, manifest: EvidenceManifest, request: unknown, outputRoot: string, now = new Date()): Promise<void> {
  const approval = publicationRequestSchema.parse(request);
  const checked = await loadEvidence(root, manifest.retailerId, manifest.evidenceId, now);
  if (approval.evidenceManifestSha256 !== await evidenceManifestDigest(root, checked.retailerId, checked.evidenceId)) throw new Error("Rights review does not bind to this evidence manifest");
  if (approval.evidenceId !== checked.evidenceId || approval.reviewerId === checked.collectedBy || new Date(approval.reviewedAt) > now || approval.reviewedAt < checked.collectedAt) throw new Error("Independent rights review is required");
  if (checked.rights.redistribution !== "permission-granted" || checked.rights.permissionReference !== approval.permissionReference || !checked.screenshot) throw new Error("Screenshot publication lacks explicit permission");
  const destination = resolve(outputRoot, checked.evidenceId);
  await mkdir(destination, { recursive: false });
  await writeOnce(resolve(destination, "source.png"), await archiveFile(root, checked.screenshot.path));
  await writeOnce(resolve(destination, "attribution.json"), jsonBytes({ sourceUrl: checked.sourceUrl, collectedAt: checked.collectedAt, retailerId: checked.retailerId, plan: checked.plan, screenshotSha256: checked.screenshot.sha256, sourceContentSha256: checked.sourceContent.sha256, rightsReview: approval }));
}

export async function readArchiveRequest(path: string) { return archiveRequestSchema.parse(await readJson(path)); }
