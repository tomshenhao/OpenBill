import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { archiveEvidence, evidenceManifestDigest, loadEvidence, stageEvidencePublication } from "../tools/electricity/evidence.ts";
import { capturePermittedPage, unrestrictedRobots } from "../tools/electricity/capture.ts";
import { JsonTariffRepository } from "../tools/electricity/repository.ts";
import { jsonBytes, sha256, writeOnce } from "../tools/electricity/files.ts";
import { mercuryManualAdapter } from "../tools/electricity/adapters/mercury.ts";
import { png, syntheticReview, syntheticTariff, testNow, testPolicy } from "./fixtures/electricity.ts";

const temporaryRoots: string[] = [];
afterEach(async () => {
  for (const root of temporaryRoots.splice(0)) {
    if (!root.startsWith(`${resolve(tmpdir())}${sep}`) || !basename(root).startsWith("openbill-v02-")) throw new Error("Unsafe test cleanup target");
    await rm(root, { recursive: true, force: true });
  }
});

async function fixture(options: { screenshot?: boolean; permission?: boolean; importRecord?: boolean } = {}) {
  const root = await mkdtemp(resolve(tmpdir(), "openbill-v02-")); temporaryRoots.push(root);
  const dataRoot = resolve(root, "data"); const evidenceRoot = resolve(root, "archive");
  await mkdir(resolve(dataRoot, "records"), { recursive: true }); await mkdir(resolve(dataRoot, "reviews"));
  const sourceFile = resolve(root, "source.txt"); const screenshotFile = resolve(root, "source.png");
  await writeFile(sourceFile, "SYNTHETIC SOURCE ONLY - NOT A REAL TARIFF\n"); await writeFile(screenshotFile, png);
  const request = {
    retailerId: "synthetic", plan: syntheticTariff().plan.name, sourceUrl: "https://retailer.example/tariffs", collectedAt: "2026-11-12T00:00:00.000Z", collectedBy: "test-collector", sourceRevision: "synthetic-source-r1", sourceFile,
    screenshotFile: options.screenshot === false ? null : screenshotFile, screenshotUnavailableReason: options.screenshot === false ? "SYNTHETIC screenshot unavailable" : null,
    captureMethod: "manual" as const, terms: { url: "https://retailer.example/terms", reviewedAt: "2026-11-11T00:00:00.000Z", reviewedBy: "test-collector", notes: "SYNTHETIC permission only" },
    rights: { redistribution: options.permission ? "permission-granted" as const : "local-only" as const, permissionReference: options.permission ? "SYNTHETIC permission" : null }, publicNonPersonalSourceConfirmed: true as const,
  };
  const adapter = { retailerId: "synthetic", validate() { /* Synthetic adapter, no remote collection. */ } };
  const manifest = await archiveEvidence(request, evidenceRoot, testPolicy, testNow, adapter);
  const record = syntheticTariff();
  record.provenance.evidenceId = manifest.evidenceId; record.provenance.sourceContentSha256 = manifest.sourceContent.sha256; record.provenance.screenshotSha256 = manifest.screenshot?.sha256 ?? null;
  record.provenance.evidenceManifestSha256 = await evidenceManifestDigest(evidenceRoot, record.retailerId, manifest.evidenceId);
  const repository = new JsonTariffRepository({ dataRoot, evidenceRoot, policy: testPolicy, allowSynthetic: true });
  if (options.importRecord !== false) await repository.importRecord(record, testNow);
  return { root, dataRoot, evidenceRoot, request, adapter, manifest, record, repository };
}

describe("evidence archive - synthetic local files only", () => {
  it("hashes the original bytes, uses versioned directories and never overwrites", async () => {
    const f = await fixture(); const original = await readFile(resolve(f.evidenceRoot, f.manifest.sourceContent.path));
    expect(sha256(original)).toBe(f.manifest.sourceContent.sha256);
    const another = await archiveEvidence(f.request, f.evidenceRoot, testPolicy, testNow, f.adapter);
    expect(another.evidenceId).not.toBe(f.manifest.evidenceId);
    expect((await loadEvidence(f.evidenceRoot, "synthetic", f.manifest.evidenceId, testNow)).sourceContent.sha256).toBe(f.manifest.sourceContent.sha256);
    await expect(writeOnce(resolve(f.evidenceRoot, f.manifest.sourceContent.path), Buffer.from("overwrite"))).rejects.toThrow();
  });
  it("rejects missing, altered or wrongly labelled screenshot bytes", async () => {
    const f = await fixture(); await writeFile(resolve(f.evidenceRoot, f.manifest.screenshot!.path), "not a PNG");
    await expect(loadEvidence(f.evidenceRoot, "synthetic", f.manifest.evidenceId, testNow)).rejects.toThrow();
    const report = await f.repository.inspect(testNow); expect(report.issues.map((issue) => issue.code)).toContain("missing-or-invalid-evidence"); expect(report.assessments[0].eligible).toBe(false);
  });
  it("rejects archive traversal, cross-collection paths and impossible timestamps", async () => {
    const f = await fixture(); const manifestPath = resolve(f.evidenceRoot, "electricity/synthetic", f.manifest.evidenceId, "manifest.json");
    await writeFile(manifestPath, jsonBytes({ ...f.manifest, sourceContent: { ...f.manifest.sourceContent, path: "../source.txt" } }));
    await expect(loadEvidence(f.evidenceRoot, "synthetic", f.manifest.evidenceId, testNow)).rejects.toThrow();
    await expect(archiveEvidence({ ...f.request, collectedAt: "2027-01-01T00:00:00.000Z" }, f.evidenceRoot, testPolicy, testNow, f.adapter)).rejects.toThrow();
    await expect(archiveEvidence({ ...f.request, sourceUrl: "https://evil.example/tariffs" }, f.evidenceRoot, testPolicy, testNow, f.adapter)).rejects.toThrow();
  });
  it("detects changed evidence metadata even when source and screenshot bytes match", async () => {
    const f = await fixture();
    const path = resolve(f.evidenceRoot, "electricity/synthetic", f.manifest.evidenceId, "manifest.json");
    await writeFile(path, jsonBytes({ ...f.manifest, terms: { ...f.manifest.terms, notes: "ALTERED SYNTHETIC TERMS METADATA" } }));
    const report = await f.repository.inspect(testNow);
    expect(report.issues.map((issue) => issue.code)).toContain("missing-or-invalid-evidence");
    expect(report.assessments[0].eligible).toBe(false);
  });
  it("retains missing screenshots as pending, with a reason, and prevents verification", async () => {
    const f = await fixture({ screenshot: false }); const report = await f.repository.inspect(testNow);
    expect(report.issues).toEqual([]); expect(report.assessments[0].status).toBe("pending-verification");
    expect(report.assessments[0].reasons).toContain("manual-screenshot-verification-required");
    await expect(f.repository.appendReview(syntheticReview(f.record.recordId, report.assessments[0].recordSha256), testNow)).rejects.toThrow();
    await expect(archiveEvidence({ ...f.request, screenshotUnavailableReason: null }, f.evidenceRoot, testPolicy, testNow, f.adapter)).rejects.toThrow();
  });
  it("keeps publication local-only unless an independent rights review is supplied", async () => {
    const f = await fixture(); const output = resolve(f.root, "publication"); await mkdir(output);
    const review = { evidenceId: f.manifest.evidenceId, evidenceManifestSha256: f.record.provenance.evidenceManifestSha256, reviewerId: "rights-reviewer", reviewedAt: testNow.toISOString(), permissionReference: "SYNTHETIC permission", publicNonPersonalSourceConfirmed: true };
    await expect(stageEvidencePublication(f.evidenceRoot, f.manifest, review, output, testNow)).rejects.toThrow();
    expect(await readdir(output)).toEqual([]);
    const allowed = await fixture({ permission: true }); const allowedOutput = resolve(allowed.root, "publication"); await mkdir(allowedOutput);
    await stageEvidencePublication(allowed.evidenceRoot, allowed.manifest, { ...review, evidenceId: allowed.manifest.evidenceId, evidenceManifestSha256: allowed.record.provenance.evidenceManifestSha256 }, allowedOutput, testNow);
    expect((await readdir(resolve(allowedOutput, allowed.manifest.evidenceId))).sort()).toEqual(["attribution.json", "source.png"]);
    expect(await readFile(resolve(allowedOutput, allowed.manifest.evidenceId, "source.png"))).toEqual(png);
  });
  it("enforces the Mercury manual/image-permission adapter rules", async () => {
    const f = await fixture(); const mercury = { ...f.manifest, retailerId: "mercury" };
    expect(() => mercuryManualAdapter.validate(mercury)).toThrow();
    expect(() => mercuryManualAdapter.validate({ ...mercury, screenshot: null })).not.toThrow();
    expect(() => mercuryManualAdapter.validate({ ...mercury, captureMethod: "playwright" })).toThrow();
  });
});

describe("verification, queries and history", () => {
  it("never treats a valid imported schema as verified", async () => {
    const f = await fixture(); const report = await f.repository.inspect(testNow);
    expect(report.issues).toEqual([]); expect(report.assessments[0].eligible).toBe(false); expect(report.assessments[0].verifiedAt).toBeNull();
  });
  it("requires an independent review, complete checklist and exact record hash", async () => {
    const f = await fixture(); const state = (await f.repository.inspect(testNow)).assessments[0]; const review = syntheticReview(f.record.recordId, state.recordSha256);
    await expect(f.repository.appendReview({ ...review, reviewerId: f.record.provenance.collectedBy }, testNow)).rejects.toThrow();
    await expect(f.repository.appendReview({ ...review, recordSha256: "0".repeat(64) }, testNow)).rejects.toThrow();
    await expect(f.repository.appendReview({ ...review, checks: { ...review.checks, exactPricesAndUnits: false } }, testNow)).rejects.toThrow();
    await f.repository.appendReview(review, testNow);
    const verified = (await f.repository.inspect(testNow)).assessments[0]; expect(verified.status).toBe("verified"); expect(verified.eligible).toBe(true);
    expect(await f.repository.query({ asOf: "2026-11-13", eligibleOnly: true }, testNow)).toEqual([]);
    expect(await f.repository.query({ asOf: "2026-11-13", eligibleOnly: true, regionCode: "NZ-AUK", networkId: "synthetic-network", metering: "smart", registers: ["uncontrolled"], userCategory: "standard" }, testNow)).toHaveLength(1);
    expect(await f.repository.query({ asOf: "2026-11-13", eligibleOnly: true, regionCode: "NZ-AUK", networkId: "synthetic-network", metering: "smart", registers: ["controlled"], userCategory: "standard" }, testNow)).toHaveLength(0);
    expect(await f.repository.query({ asOf: "2026-11-13", regionCode: "NZ-CAN" }, testNow)).toHaveLength(0);
    expect(await f.repository.query({ asOf: "2026-11-13", userCategory: "low" }, testNow)).toHaveLength(0);
    expect(await f.repository.query({ asOf: "2026-11-13", retailerId: "other" }, testNow)).toHaveLength(0);
  });
  it("preserves review revocations and binds verification to immutable bytes", async () => {
    const f = await fixture(); const state = (await f.repository.inspect(testNow)).assessments[0]; const review = syntheticReview(f.record.recordId, state.recordSha256);
    await f.repository.appendReview(review, testNow);
    await f.repository.appendReview({ ...review, reviewId: "test-review-2", previousReviewId: review.reviewId, status: "rejected", reviewedAt: "2026-11-12T13:00:00.000Z" }, testNow);
    expect((await f.repository.inspect(testNow)).assessments[0].status).toBe("rejected");
    const file = resolve(f.dataRoot, "records/synthetic/synthetic-plan/r1.json"); await writeFile(file, jsonBytes({ ...f.record, plan: { ...f.record.plan, name: "TAMPERED SYNTHETIC RECORD" } }));
    const tampered = await f.repository.inspect(testNow); expect(tampered.issues.map((issue) => issue.code)).toContain("invalid-verification-chain"); expect(tampered.assessments[0].eligible).toBe(false);
  });
  it("excludes expired, stale and not-yet-effective records", async () => {
    const f = await fixture(); const state = (await f.repository.inspect(testNow)).assessments[0]; await f.repository.appendReview(syntheticReview(f.record.recordId, state.recordSha256), testNow);
    expect((await f.repository.inspect(testNow, "2026-12-01")).assessments[0].status).toBe("expired");
    expect((await f.repository.inspect(testNow, "2026-10-31")).assessments[0].reasons).toContain("not-yet-effective");
    expect((await f.repository.inspect(new Date("2026-12-14T00:00:00.000Z"))).assessments[0].status).toBe("expired");
  });
  it("requires fresh source capture even after a recent review of an open-ended tariff", async () => {
    const f = await fixture({ importRecord: false }); f.record.effectiveTo = null;
    await f.repository.importRecord(f.record, testNow);
    const state = (await f.repository.inspect(testNow)).assessments[0]; const first = syntheticReview(f.record.recordId, state.recordSha256);
    await f.repository.appendReview(first, testNow);
    const later = new Date("2026-12-11T00:00:00.000Z");
    await f.repository.appendReview({ ...first, reviewId: "fresh-review", previousReviewId: first.reviewId, reviewedAt: later.toISOString() }, later);
    expect((await f.repository.inspect(later)).assessments[0].eligible).toBe(true);
    expect((await f.repository.inspect(new Date("2026-12-12T00:00:00.000Z"))).assessments[0].status).toBe("expired");
  });
  it("keeps historical versions and suppresses a replaced price pending review", async () => {
    const f = await fixture(); const state = (await f.repository.inspect(testNow)).assessments[0]; await f.repository.appendReview(syntheticReview(f.record.recordId, state.recordSha256), testNow);
    const next = { ...structuredClone(f.record), recordId: "synthetic-r2", revision: "r2", supersedes: f.record.recordId, effectiveFrom: "2026-11-13" };
    await f.repository.importRecord(next, testNow);
    const report = await f.repository.inspect(testNow); expect(report.assessments).toHaveLength(2); expect(report.assessments[0].reasons).toContain("superseded"); expect(report.assessments.every((entry) => !entry.eligible)).toBe(true);
    const historical = await f.repository.inspect(testNow, "2026-11-12"); expect(historical.assessments[0].eligible).toBe(true);
    await expect(f.repository.importRecord(next, testNow)).rejects.toThrow();
  });
  it("rejects synthetic records in the production repository", async () => {
    const f = await fixture({ importRecord: false }); const production = new JsonTariffRepository({ dataRoot: f.dataRoot, evidenceRoot: f.evidenceRoot, policy: testPolicy });
    await expect(production.importRecord(f.record, testNow)).rejects.toThrow();
  });
  it.each(["gst", "eligibility", "contract", "structure"])("keeps unresolved/unsupported %s out of eligible results", async (kind) => {
    const f = await fixture({ importRecord: false });
    if (kind === "gst") f.record.gst.treatment = "unknown";
    if (kind === "eligibility") f.record.eligibility.unresolved = true;
    if (kind === "contract") f.record.contract.discounts = [{ description: "Synthetic offer", conditions: "Synthetic conditional discount" }];
    if (kind === "structure") f.record.charges.usage[0] = { ...f.record.charges.usage[0], kind: "other", description: "Synthetic unsupported tariff" };
    await f.repository.importRecord(f.record, testNow); const state = (await f.repository.inspect(testNow)).assessments[0]; await f.repository.appendReview(syntheticReview(f.record.recordId, state.recordSha256), testNow);
    expect((await f.repository.inspect(testNow)).assessments[0].eligible).toBe(false);
  });
});

describe("conservative automated capture policy", () => {
  it("accepts only unrestricted robots policies", () => {
    expect(unrestrictedRobots("User-agent: *\nAllow: /\nSitemap: https://retailer.example/sitemap.xml")).toBe(true);
    for (const text of ["", "User-agent: *\nDisallow: /", "User-agent: *\nDisallow: /private", "User-agent: *\nCrawl-delay: 10", "User-agent: SpecialBot\nAllow: /", "not robots"]) expect(unrestrictedRobots(text)).toBe(false);
  });
  it("refuses prohibited or unreviewed automation before launching a browser", async () => {
    const request = { retailerId: "synthetic", plan: "SYNTHETIC ONLY", sourceUrl: "https://retailer.example/tariffs", termsReviewedAt: testNow.toISOString(), reviewerId: "test-reviewer", automationPermissionReference: "SYNTHETIC", termsPermitAutomationAndLocalCapture: true };
    for (const automation of ["prohibited", "not-reviewed"]) await expect(capturePermittedPage(request, { ...testPolicy, retailers: [{ ...testPolicy.retailers[0], automation }] }, "unused", "unused", undefined, testNow)).rejects.toThrow("not permitted");
  });
});
