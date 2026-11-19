import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { idSchema, officialUrlSchema, utcSchema } from "../../src/domain/electricity/tariff.ts";
import { parseEiep14a, readProductJson } from "./adapters/eiep14a.ts";
import { sha256, writeOnce, jsonBytes } from "./files.ts";

export const eiepRequestSchema = z.strictObject({ sourceFile: z.string().min(1), retailerId: idSchema, officialSourceUrl: officialUrlSchema, collectedAt: utcSchema, collectedBy: idSchema, receiptReference: z.string().min(1).max(2000), publicNonPersonalProductFileConfirmed: z.literal(true), dataKind: z.enum(["official", "synthetic"]) });
export function prepareEiepImport(bytes: Buffer, rawRequest: unknown, now = new Date()) {
  const request = eiepRequestSchema.parse(rawRequest);
  if (!bytes.length || bytes.length > 5_000_000 || Date.parse(request.collectedAt) > now.getTime()) throw new Error("Invalid source size or collection time");
  const product = parseEiep14a(readProductJson(new TextDecoder("utf-8", { fatal: true }).decode(bytes)));
  if ((product.rundatetime && Date.parse(product.rundatetime) > Date.parse(request.collectedAt)) || (product.extractdatetime && Date.parse(product.extractdatetime) > Date.parse(request.collectedAt))) throw new Error("Source timestamps follow collection");
  return {
    schemaVersion: 1, adapter: "eiep14a-normative-json-v1.1", dataKind: request.dataKind,
    retailerId: request.retailerId, status: "pending-verification", comparisonEligible: false,
    provenance: { sourceUrl: request.officialSourceUrl, collectedAt: request.collectedAt, collectedBy: request.collectedBy, receiptReference: request.receiptReference, sourceContentSha256: sha256(bytes), sourceRevision: product.uniquifier ?? product.rundatetime ?? sha256(bytes), screenshotSha256: null },
    rights: { redistribution: "local-only", permissionReference: null },
    gst: "exclusive", discounts: "removed-in-source", product,
    outstanding: ["Confirm protocol version, electricity scope, initial/replacement semantics and source run time with sender where optional JSON header fields are absent; do not infer them", "Independently confirm retailer identity and receipt provenance", "Review source screenshot and archive it through existing evidence workflow", "Resolve every inherited attribute, geographic/network restriction, register and schedule", "Confirm complete recurring components, GST and discounts without double counting", "Check plan start/end/close dates and new-customer availability", "Obtain redistribution permission and an independent rights review", "Manually map supported scopes to immutable v0.2 tariff records, then perform independent price review"],
  };
}
// Dry-run inventory, not an attestation that the components are complete.
export function inspectEiepReceipt(bytes: Buffer, rawRequest: unknown, now = new Date()) {
  const candidate = prepareEiepImport(bytes, rawRequest, now);
  return {
    retailerId: candidate.retailerId, sourceSha256: candidate.provenance.sourceContentSha256,
    status: candidate.status, comparisonEligible: false,
    plans: candidate.product.retailers.flatMap((retailer) => retailer.customergroups.flatMap((group) => group.plans.map((plan) => {
      const types = new Map(retailer.tarifftypes.map((type) => [type.tarifftypeid.toUpperCase(), type]));
      const fixed = plan.tariffs.filter((tariff) => types.get(tariff.tarifftypeid.toUpperCase())?.fixedvariable === "F").length;
      const variable = plan.tariffs.length - fixed;
      return { planId: plan.planid, fixedComponents: fixed, variableComponents: variable,
        warnings: [...(!fixed ? ["No fixed component: obtain explicit confirmation; never infer a zero charge"] : []), ...(!variable ? ["No variable component: obtain explicit confirmation"] : []),
          "Manual network/register and inherited-condition mapping required", "GST-exclusive source: retain raw precision and review any conversion", "Plan availability, complete fees, evidence and rights remain unverified"] };
    }))),
    outstanding: candidate.outstanding,
  };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (!process.argv[2]) throw new Error("Usage: npm run data:eiep14a -- <local-request.json>");
  const request = eiepRequestSchema.parse(JSON.parse(await readFile(process.argv[2], "utf8")));
  const bytes = await readFile(request.sourceFile);
  if (process.argv[3] === "--check") {
    console.log(JSON.stringify(inspectEiepReceipt(bytes, request), null, 2));
  } else {
    const candidate = prepareEiepImport(bytes, request);
    const directory = resolve(".local-data/imports/eiep14a", request.retailerId, candidate.provenance.sourceContentSha256);
    await writeOnce(resolve(directory, "source.json"), bytes);
    await writeOnce(resolve(directory, "candidate.json"), jsonBytes(candidate));
    console.log(`Archived local ${request.dataKind} product candidate. Pending verification; no tariffs published.`);
  }
}
