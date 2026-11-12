import { z } from "zod";
import { idSchema, sha256Schema, utcSchema, sourceProvenanceSchema, sharedEvidenceSchema } from "../provenance.ts";
export { idSchema, sha256Schema, utcSchema, officialUrlSchema, artifactSchema } from "../provenance.ts";

export const decimalSchema = z.string().regex(/^(0|[1-9]\d{0,5})(\.\d{1,6})?$/);
export const dateSchema = z.iso.date();
const text = z.string().trim().min(1).max(2000);
export const regionSchema = z.enum(["NZ-NTL", "NZ-AUK", "NZ-WKO", "NZ-BOP", "NZ-GIS", "NZ-HKB", "NZ-TKI", "NZ-MWT", "NZ-WGN", "NZ-TAS", "NZ-NSN", "NZ-MBH", "NZ-WTC", "NZ-CAN", "NZ-OTA", "NZ-STL", "NZ-CIT"]);
export const statusSchema = z.enum(["collected", "pending-verification", "verified", "rejected", "expired"]);
const price = (unit: "NZD/day" | "NZD/kWh" | "NZD") => z.strictObject({ amount: decimalSchema, currency: z.literal("NZD"), unit: z.literal(unit) });
export const dailyPriceSchema = price("NZD/day");
export const usagePriceSchema = price("NZD/kWh");
export const moneySchema = price("NZD");
const bandBase = { id: idSchema, label: text, register: idSchema, price: usagePriceSchema };
const startTime = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const endTime = z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/);

export const usageBandSchema = z.discriminatedUnion("kind", [
  z.strictObject({ ...bandBase, kind: z.literal("flat") }),
  z.strictObject({ ...bandBase, kind: z.literal("time-of-use"), days: z.array(z.number().int().min(1).max(7)).min(1).max(7), start: startTime, end: endTime, timezone: z.literal("Pacific/Auckland") }),
  z.strictObject({ ...bandBase, kind: z.literal("tiered"), fromKwh: decimalSchema, toKwh: decimalSchema.nullable(), reset: z.enum(["day", "billing-period", "year"]) }),
  z.strictObject({ ...bandBase, kind: z.literal("other"), description: text }),
]);

export const tariffSchema = z.strictObject({
  schemaVersion: z.literal(1),
  dataKind: z.enum(["official", "synthetic"]),
  recordId: idSchema,
  revision: idSchema,
  supersedes: idSchema.nullable(),
  retailerId: idSchema,
  plan: z.strictObject({ id: idSchema, name: text }),
  coverage: z.strictObject({ regionCodes: z.array(regionSchema).min(1), networkIds: z.array(idSchema).min(1), sourceDescription: text }),
  metering: z.strictObject({ configuration: z.enum(["standard", "smart", "controlled", "day-night", "other"]), registers: z.array(idSchema).min(1), sourceDescription: text }),
  eligibility: z.strictObject({ userCategory: z.enum(["low", "standard", "unrestricted", "unknown"]), primaryResidenceOnly: z.boolean().nullable(), minimumAnnualKwh: decimalSchema.nullable(), maximumAnnualKwh: decimalSchema.nullable(), conditions: z.array(text), unresolved: z.boolean() }),
  contract: z.strictObject({ termMonths: z.number().int().min(0).max(120).nullable(), earlyTerminationFee: moneySchema.nullable(), discounts: z.array(z.strictObject({ description: text, conditions: text })), conditions: z.array(text), unresolved: z.boolean() }),
  gst: z.strictObject({ treatment: z.enum(["inclusive", "exclusive", "unknown"]), ratePercent: decimalSchema.nullable(), sourceDescription: text }),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.nullable(), // Exclusive end date; never infer one from collection time.
  charges: z.strictObject({ daily: z.array(z.strictObject({ id: idSchema, label: text, price: dailyPriceSchema })).min(1), usage: z.array(usageBandSchema).min(1) }),
  provenance: sourceProvenanceSchema,
  status: z.enum(["collected", "pending-verification"]), // Imports cannot self-verify.
});

export const evidenceSchema = sharedEvidenceSchema.extend({ category: z.literal("electricity") });

export const reviewSchema = z.strictObject({
  schemaVersion: z.literal(1), reviewId: idSchema, recordId: idSchema, previousReviewId: idSchema.nullable(),
  recordSha256: sha256Schema, status: z.enum(["verified", "rejected", "expired"]),
  reviewedAt: utcSchema, reviewerId: idSchema, rationale: text,
  checks: z.strictObject({ officialSource: z.boolean(), exactPricesAndUnits: z.boolean(), geographyAndMetering: z.boolean(), eligibilityAndConditions: z.boolean(), gstAndDates: z.boolean(), screenshotMatchesSource: z.boolean() }),
});

export type ElectricityTariff = z.infer<typeof tariffSchema>;
export type UsageBand = z.infer<typeof usageBandSchema>;
export type EvidenceManifest = z.infer<typeof evidenceSchema>;
export type TariffReview = z.infer<typeof reviewSchema>;
export type VerificationStatus = z.infer<typeof statusSchema>;
export type Price = z.infer<typeof dailyPriceSchema> | z.infer<typeof usagePriceSchema>;
