import { mkdir, readFile } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";
import { z } from "zod";
import { dateSchema, idSchema, reviewSchema, type ElectricityTariff, type TariffReview, type VerificationStatus } from "../../src/domain/electricity/tariff.ts";
import { validateHistory, validateTariff, type DataPolicy, type Issue } from "../../src/domain/electricity/validation.ts";
import { assertOfficialSource, evidenceManifestDigest, loadEvidence } from "./evidence.ts";
import { jsonBytes, jsonFiles, readJson, sha256, writeOnce } from "./files.ts";

export const MAX_VERIFICATION_AGE_DAYS = 30; // Project policy, not a claim about tariff stability.
export type CatalogueQuery = { retailerId?: string; planId?: string; regionCode?: string; networkId?: string; metering?: string; registers?: string[]; userCategory?: string; asOf: string; eligibleOnly?: boolean };
export type Assessment = { record: ElectricityTariff; recordSha256: string; status: VerificationStatus; verifiedAt: string | null; reviewerId: string | null; eligible: boolean; reasons: string[] };

export async function loadPolicy(dataRoot: string): Promise<DataPolicy> {
  const retailers = z.object({ schemaVersion: z.literal(1), retailers: z.array(z.object({ id: idSchema, officialHosts: z.array(z.string()).min(1), sourceUrls: z.array(z.url()).min(1), automation: z.enum(["prohibited", "not-reviewed", "permitted"]), termsUrl: z.url().nullable().optional() })) }).parse(await readJson(resolve(dataRoot, "retailers.json")));
  const networks = z.object({ schemaVersion: z.literal(1), networks: z.array(z.object({ id: idSchema, regionCodes: z.array(z.string()).min(1), sourceUrl: z.url() })) }).parse(await readJson(resolve(dataRoot, "networks.json")));
  if (new Set(retailers.retailers.map((entry) => entry.id)).size !== retailers.retailers.length || new Set(networks.networks.map((entry) => entry.id)).size !== networks.networks.length) throw new Error("Duplicate registry identifiers");
  return { retailers: retailers.retailers, networks: networks.networks };
}

export function nzDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export class JsonTariffRepository {
  readonly dataRoot: string;
  readonly evidenceRoot: string;
  readonly policy: DataPolicy;
  readonly allowSynthetic: boolean;

  constructor(options: { dataRoot: string; evidenceRoot: string; policy: DataPolicy; allowSynthetic?: boolean }) {
    this.dataRoot = resolve(options.dataRoot);
    this.evidenceRoot = resolve(options.evidenceRoot);
    this.policy = options.policy;
    this.allowSynthetic = options.allowSynthetic ?? false;
  }

  async inspect(now = new Date(), asOf = nzDate(now)): Promise<{ issues: Issue[]; assessments: Assessment[] }> {
    dateSchema.parse(asOf);
    const issues: Issue[] = [];
    const entries: { record: ElectricityTariff; digest: string }[] = [];
    for (const file of await jsonFiles(resolve(this.dataRoot, "records"))) {
      const raw = await readFile(file);
      let input: unknown;
      try { input = JSON.parse(raw.toString("utf8")); } catch { issues.push({ code: "invalid-json", path: relative(this.dataRoot, file) }); continue; }
      const validated = validateTariff(input, this.policy, now);
      issues.push(...validated.issues);
      if (!validated.record) continue;
      const record = validated.record;
      if (!this.allowSynthetic && record.dataKind !== "official") issues.push({ code: "synthetic-production-record", path: record.recordId });
      const expected = resolve(this.dataRoot, "records", record.retailerId, record.plan.id, `${record.revision}.json`);
      if (file !== expected) issues.push({ code: "record-file-identity", path: record.recordId });
      entries.push({ record, digest: sha256(raw) });
    }
    issues.push(...validateHistory(entries.map((entry) => entry.record)));
    const reviews: TariffReview[] = [];
    for (const file of await jsonFiles(resolve(this.dataRoot, "reviews"))) {
      try {
        const review = reviewSchema.parse(await readJson(file));
        if (file !== resolve(this.dataRoot, "reviews", review.recordId, `${review.reviewId}.json`)) throw new Error("Review identity mismatch");
        reviews.push(review);
      } catch { issues.push({ code: "invalid-review", path: relative(this.dataRoot, file) }); }
    }
    for (const review of reviews) {
      if (!entries.some((entry) => entry.record.recordId === review.recordId)) issues.push({ code: "orphan-review", path: review.reviewId });
    }
    const assessments: Assessment[] = [];
    for (const { record, digest } of entries) {
      const reasons: string[] = [];
      let integrity = true;
      let screenshot = false;
      try {
        const evidence = await loadEvidence(this.evidenceRoot, record.retailerId, record.provenance.evidenceId, now);
        assertOfficialSource(evidence.retailerId, evidence.sourceUrl, this.policy);
        const p = record.provenance;
        if (await evidenceManifestDigest(this.evidenceRoot, record.retailerId, p.evidenceId) !== p.evidenceManifestSha256 || evidence.sourceUrl !== p.sourceUrl || evidence.sourceContent.sha256 !== p.sourceContentSha256 || (evidence.screenshot?.sha256 ?? null) !== p.screenshotSha256 || evidence.collectedAt !== p.collectedAt || evidence.collectedBy !== p.collectedBy || evidence.sourceRevision !== p.sourceRevision || evidence.plan !== record.plan.name) throw new Error("Provenance mismatch");
        screenshot = evidence.screenshot !== null;
      } catch {
        integrity = false;
        issues.push({ code: "missing-or-invalid-evidence", path: record.recordId });
      }
      const history = reviews.filter((review) => review.recordId === record.recordId).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt));
      let previous: TariffReview | null = null;
      for (const review of history) {
        if (review.recordSha256 !== digest || review.previousReviewId !== (previous?.reviewId ?? null) || review.reviewedAt < record.provenance.collectedAt || new Date(review.reviewedAt) > now || (previous && review.reviewedAt <= previous.reviewedAt) || (review.status === "verified" && (review.reviewerId === record.provenance.collectedBy || !Object.values(review.checks).every(Boolean) || !screenshot))) {
          issues.push({ code: "invalid-verification-chain", path: review.reviewId });
          integrity = false;
        }
        previous = review;
      }
      let status: VerificationStatus = previous?.status ?? record.status;
      const verifiedAt = status === "verified" ? previous!.reviewedAt : null;
      if ((record.effectiveTo !== null && asOf >= record.effectiveTo) || now.getTime() - new Date(record.provenance.collectedAt).getTime() >= MAX_VERIFICATION_AGE_DAYS * 86_400_000 || (verifiedAt && now.getTime() - new Date(verifiedAt).getTime() >= MAX_VERIFICATION_AGE_DAYS * 86_400_000)) status = "expired";
      if (!integrity) reasons.push("evidence-or-review-invalid");
      if (!screenshot) reasons.push("manual-screenshot-verification-required");
      if (status !== "verified") reasons.push(`status-${status}`);
      if (asOf < record.effectiveFrom) reasons.push("not-yet-effective");
      // A known replacement suppresses its ancestors even while awaiting review.
      // Never silently fall back to an old price when a new record is rejected/stale.
      const byId = new Map(entries.map((entry) => [entry.record.recordId, entry.record]));
      if (entries.some(({ record: successor }) => {
        if (successor.effectiveFrom > asOf) return false;
        let parentId = successor.supersedes;
        const seen = new Set<string>();
        while (parentId && !seen.has(parentId)) {
          if (parentId === record.recordId) return true;
          seen.add(parentId); parentId = byId.get(parentId)?.supersedes ?? null;
        }
        return false;
      })) reasons.push("superseded");
      if (record.gst.treatment !== "inclusive") reasons.push("unsupported-or-unknown-gst");
      if (record.metering.configuration === "other") reasons.push("unsupported-metering");
      if (record.eligibility.unresolved || record.eligibility.userCategory === "unknown" || record.eligibility.primaryResidenceOnly === null || record.eligibility.minimumAnnualKwh !== null || record.eligibility.maximumAnnualKwh !== null || record.eligibility.conditions.length) reasons.push("eligibility-needs-future-matching");
      if (record.contract.unresolved || record.contract.discounts.length || record.contract.conditions.length) reasons.push("contract-needs-future-calculation");
      if (record.charges.usage.some((band) => band.kind === "tiered" || band.kind === "other")) reasons.push("unsupported-calculation-structure");
      if (!this.allowSynthetic && record.dataKind !== "official") reasons.push("synthetic");
      assessments.push({ record, recordSha256: digest, status, verifiedAt, reviewerId: previous?.reviewerId ?? null, eligible: reasons.length === 0, reasons });
    }
    // Fail closed on any corrupt history/evidence; don't publish a partial catalogue.
    if (issues.length) for (const assessment of assessments) { assessment.eligible = false; assessment.reasons.push("catalogue-invalid"); }
    return { issues, assessments };
  }

  async query(query: CatalogueQuery, now = new Date()): Promise<Assessment[]> {
    const result = await this.inspect(now, query.asOf);
    return result.assessments.filter(({ record, eligible }) => {
      if (query.eligibleOnly && (!eligible || !query.regionCode || !query.networkId || !query.metering || !query.registers?.length || !query.userCategory || record.eligibility.primaryResidenceOnly)) return false;
      if (query.registers && [...query.registers].sort().join() !== [...record.metering.registers].sort().join()) return false;
      return (!query.retailerId || record.retailerId === query.retailerId) && (!query.planId || record.plan.id === query.planId) && (!query.regionCode || record.coverage.regionCodes.includes(query.regionCode as ElectricityTariff["coverage"]["regionCodes"][number])) && (!query.networkId || record.coverage.networkIds.includes(query.networkId)) && (!query.metering || record.metering.configuration === query.metering) && (!query.userCategory || record.eligibility.userCategory === "unrestricted" || record.eligibility.userCategory === query.userCategory);
    });
  }

  async importRecord(input: unknown, now = new Date()): Promise<ElectricityTariff> {
    const result = validateTariff(input, this.policy, now);
    if (!result.record || result.issues.length || (!this.allowSynthetic && result.record.dataKind !== "official")) throw new Error("Tariff failed schema/quality/production validation");
    const record = result.record;
    const current = await this.inspect(now);
    if (current.issues.length || validateHistory([...current.assessments.map((entry) => entry.record), record]).length) throw new Error("Tariff conflicts with existing history");
    const evidence = await loadEvidence(this.evidenceRoot, record.retailerId, record.provenance.evidenceId, now);
    const p = record.provenance;
    if (await evidenceManifestDigest(this.evidenceRoot, record.retailerId, p.evidenceId) !== p.evidenceManifestSha256 || evidence.plan !== record.plan.name || evidence.sourceUrl !== p.sourceUrl || evidence.collectedAt !== p.collectedAt || evidence.collectedBy !== p.collectedBy || evidence.sourceRevision !== p.sourceRevision || evidence.sourceContent.sha256 !== p.sourceContentSha256 || (evidence.screenshot?.sha256 ?? null) !== p.screenshotSha256) throw new Error("Tariff provenance does not match the archived source");
    await writeOnce(resolve(this.dataRoot, "records", record.retailerId, record.plan.id, `${record.revision}.json`), jsonBytes(record));
    return record;
  }

  async appendReview(input: unknown, now = new Date()): Promise<TariffReview> {
    const review = reviewSchema.parse(input);
    const current = await this.inspect(now);
    if (current.issues.length) throw new Error("Resolve catalogue/evidence integrity errors before review");
    const assessment = current.assessments.find((entry) => entry.record.recordId === review.recordId);
    if (!assessment || assessment.recordSha256 !== review.recordSha256) throw new Error("Review does not bind to the current immutable record bytes");
    const history = (await jsonFiles(resolve(this.dataRoot, "reviews"))).map(async (file) => reviewSchema.parse(await readJson(file)));
    const previous = (await Promise.all(history)).filter((entry) => entry.recordId === review.recordId).sort((a, b) => a.reviewedAt.localeCompare(b.reviewedAt)).at(-1);
    if (review.previousReviewId !== (previous?.reviewId ?? null) || (previous && review.reviewedAt <= previous.reviewedAt) || review.reviewedAt < assessment.record.provenance.collectedAt || new Date(review.reviewedAt) > now) throw new Error("Review history/chronology is invalid");
    if (review.status === "verified" && (review.reviewerId === assessment.record.provenance.collectedBy || !Object.values(review.checks).every(Boolean) || !assessment.record.provenance.screenshotSha256 || assessment.status === "expired")) throw new Error("Verification requires an independent reviewer, all checks and screenshot evidence for a current record");
    await writeOnce(resolve(this.dataRoot, "reviews", review.recordId, `${review.reviewId}.json`), jsonBytes(review));
    return review;
  }
}

export async function openRepository(workspace = process.cwd()) {
  const dataRoot = resolve(workspace, "data/electricity");
  await mkdir(resolve(dataRoot, "records"), { recursive: true });
  await mkdir(resolve(dataRoot, "reviews"), { recursive: true });
  return new JsonTariffRepository({ dataRoot, evidenceRoot: resolve(workspace, ".local-data/evidence"), policy: await loadPolicy(dataRoot) });
}

export function safeRelativePath(root: string, path: string) { return relative(root, path).split(sep).join("/"); }
