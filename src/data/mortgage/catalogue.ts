import { z } from "zod";
import { lenderSchema, mortgageCatalogueSchema } from "../../domain/mortgage/rates.ts";
import lendersJson from "../../../data/mortgage/lenders.json" with { type: "json" };
import publishedJson from "../../../data/mortgage/published.json" with { type: "json" };

export const mortgageLenders = z.array(lenderSchema).min(1).refine(
  (entries) => new Set(entries.map(({ id }) => id)).size === entries.length,
).parse(lendersJson);

export function hasOfficialMortgageSource(lenderId: string, sourceUrl: string) {
  return mortgageLenders.some(({ id, url }) => id === lenderId && url === sourceUrl);
}

export const mortgageCatalogue = mortgageCatalogueSchema.refine(
  ({ entries }) => entries.every(({ rate }) => hasOfficialMortgageSource(rate.lenderId, rate.provenance.sourceUrl)),
  "Unknown lender or unregistered rate source",
).parse(publishedJson);
