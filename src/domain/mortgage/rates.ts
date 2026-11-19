import { z } from "zod";
import { idSchema, officialUrlSchema, sha256Schema, sourceProvenanceSchema, utcSchema } from "../provenance.ts";

export const rateTerms = ["6", "12", "18", "24", "36", "48", "60", "floating"] as const;
export const rateBases = ["standard", "special"] as const;
export const occupancies = ["owner", "investment"] as const;

export type RateTerm = typeof rateTerms[number];
export type RateBasis = typeof rateBases[number];
export type Occupancy = typeof occupancies[number];

const lenderNote = z.string().trim().min(1).max(1000);
const bilingual = z.strictObject({ en: lenderNote, zh: lenderNote });
export const lenderSchema = z.strictObject({
  id: idSchema, name: lenderNote, url: officialUrlSchema, linkPermissionRequired: z.boolean().optional(),
});
export const mortgageRateDetailsSchema = z.strictObject({
  id: idSchema,
  lenderId: idSchema,
  product: lenderNote,
  annualRate: z.string().regex(/^\d{1,3}(\.\d{1,4})?$/).refine((rate) => Number(rate) > 0 && Number(rate) <= 100),
  term: z.enum(rateTerms),
  basis: z.enum(rateBases),
  occupancy: z.array(z.enum(occupancies)).min(1).refine((values) => new Set(values).size === values.length),
  minEquityPercent: z.number().min(0).max(100).nullable(),
  lowEquity: bilingual.nullable(),
  conditions: bilingual,
  effectiveFrom: z.iso.date().nullable(),
  effectiveUntil: z.iso.date().nullable(),
});
export const mortgageRateSchema = mortgageRateDetailsSchema.extend({ provenance: sourceProvenanceSchema })
  .refine(({ effectiveFrom, effectiveUntil }) => !effectiveFrom || !effectiveUntil || effectiveFrom < effectiveUntil);

export const mortgageReviewSchema = z.strictObject({
  recordSha256: sha256Schema,
  evidenceManifestSha256: sha256Schema,
  reviewer: idSchema,
  verifiedAt: utcSchema,
  decision: z.literal("verified"),
  publicNewLendingConfirmed: z.literal(true),
});

export const mortgageRightsSchema = z.strictObject({
  recordSha256: sha256Schema,
  evidenceManifestSha256: sha256Schema,
  reviewer: idSchema,
  reviewedAt: utcSchema,
  decision: z.literal("permission-granted"),
  permissionReference: lenderNote,
});

export const mortgageCatalogueSchema = z.strictObject({
  schemaVersion: z.literal(1),
  entries: z.array(z.strictObject({
    rate: mortgageRateSchema,
    review: mortgageReviewSchema,
    rights: mortgageRightsSchema,
  }).refine(({ rate, review, rights }) => {
    const source = rate.provenance;
    return source.screenshotSha256 !== null &&
      source.evidenceManifestSha256 === review.evidenceManifestSha256 &&
      source.evidenceManifestSha256 === rights.evidenceManifestSha256 &&
      review.recordSha256 === rights.recordSha256 &&
      review.reviewer !== source.collectedBy && rights.reviewer !== source.collectedBy &&
      review.verifiedAt >= source.collectedAt && rights.reviewedAt >= source.collectedAt;
  }, "Each offer requires independent price and rights reviews bound to the screenshot evidence.")).refine(
    (entries) => new Set(entries.map(({ rate }) => rate.id)).size === entries.length, "Duplicate rate IDs",
  ),
});

export type MortgageRate = z.infer<typeof mortgageRateSchema>;
export type PublishedRate = z.infer<typeof mortgageCatalogueSchema>["entries"][number];
export type RateFilters = { term: RateTerm | "all"; basis: RateBasis | "all"; occupancy: Occupancy | "all" };

const maxAgeMs = 30 * 86_400_000;
const nzDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" });

export function listMortgageRates(entries: readonly PublishedRate[], filters: RateFilters, asOf: string) {
  const current: PublishedRate[] = [];
  const outdated: PublishedRate[] = [];
  const instant = Date.parse(asOf);
  if (!Number.isFinite(instant)) return { current, outdated };
  const today = nzDate.format(instant);
  for (const entry of entries) {
    const { rate, review, rights } = entry;
    if ((filters.term !== "all" && filters.term !== rate.term) ||
        (filters.basis !== "all" && filters.basis !== rate.basis) ||
        (filters.occupancy !== "all" && !rate.occupancy.includes(filters.occupancy))) continue;
    const captureAge = instant - Date.parse(rate.provenance.collectedAt);
    const reviewAge = instant - Date.parse(review.verifiedAt);
    if (captureAge < 0 || reviewAge < 0 || Date.parse(rights.reviewedAt) > instant ||
        (rate.effectiveFrom && rate.effectiveFrom > today)) continue;
    if (captureAge >= maxAgeMs || reviewAge >= maxAgeMs || (rate.effectiveUntil && today >= rate.effectiveUntil)) {
      outdated.push(entry);
    } else {
      current.push(entry);
    }
  }
  return { current, outdated };
}

export function filterMortgageRates(entries: readonly PublishedRate[], filters: RateFilters, asOf: string) {
  return listMortgageRates(entries, filters, asOf).current;
}

export function formatAdvertisedMortgageRate(annualRate: string, locale: string) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(annualRate));
}
