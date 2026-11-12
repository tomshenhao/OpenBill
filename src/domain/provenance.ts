import { z } from "zod";

// Category-independent provenance contracts, reusable by broadband/mobile adapters.
export const idSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,95}$/);
export const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const utcSchema = z.iso.datetime({ precision: 3 });
export const officialUrlSchema = z.url().refine((value) => {
  const url = new URL(value);
  return url.protocol === "https:" && !url.username && !url.password && !url.search && !url.hash;
}, "Use an HTTPS public source URL without credentials, query parameters or fragments.");
const text = z.string().trim().min(1).max(2000);
export const artifactSchema = z.strictObject({
  path: z.string().regex(/^[a-z0-9][a-z0-9/._-]*$/).refine((value) => !value.split("/").some((part) => part === ".." || part === "." || part === "")),
  sha256: sha256Schema,
  bytes: z.number().int().positive().max(25_000_000),
});
export const sourceProvenanceSchema = z.strictObject({ evidenceId: idSchema, evidenceManifestSha256: sha256Schema, sourceUrl: officialUrlSchema, collectedAt: utcSchema, collectedBy: idSchema, sourceContentSha256: sha256Schema, sourceRevision: text, screenshotSha256: sha256Schema.nullable() });
export const sharedEvidenceSchema = z.strictObject({
  schemaVersion: z.literal(1), category: z.enum(["electricity", "broadband", "mobile", "insurance"]),
  evidenceId: idSchema, retailerId: idSchema, plan: text,
  sourceUrl: officialUrlSchema, collectedAt: utcSchema, archivedAt: utcSchema, collectedBy: idSchema,
  sourceRevision: text, sourceContent: artifactSchema, screenshot: artifactSchema.nullable(),
  screenshotUnavailableReason: text.nullable(), captureMethod: z.enum(["manual", "playwright"]),
  collectionStatus: z.literal("collected"), verificationStatus: z.literal("pending-verification"),
  terms: z.strictObject({ url: officialUrlSchema, reviewedAt: utcSchema, reviewedBy: idSchema, notes: text }),
  rights: z.strictObject({ redistribution: z.enum(["local-only", "permission-granted"]), permissionReference: text.nullable() }),
  publicNonPersonalSourceConfirmed: z.literal(true),
});
