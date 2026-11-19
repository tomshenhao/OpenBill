import { z } from "zod";
import { officialUrlSchema } from "../../domain/provenance.ts";
import data from "../../../data/water/watercare.json" with { type: "json" };

const watercareUrl = officialUrlSchema.refine((value) => {
  const url = new URL(value);
  return !url.port && ["www.watercare.co.nz", "assets.watercare.co.nz"].includes(url.hostname);
});

const schedule = z.strictObject({
  from: z.iso.date(), until: z.iso.date(), url: watercareUrl,
  tariffStatus: z.literal("pending-verification"),
});

const watercareData = z.strictObject({
  provider: z.literal("Watercare"),
  region: z.literal("NZ-AUK"),
  reviewedOn: z.iso.date(),
  sources: z.strictObject({
    faq: watercareUrl, charges: watercareUrl, billing: watercareUrl, efficiency: watercareUrl,
    targets: watercareUrl, leaks: watercareUrl, saving: watercareUrl, garden: watercareUrl,
    meters: watercareUrl, terms: watercareUrl,
  }),
  reference: z.strictObject({
    kind: z.literal("general-per-person-range"),
    lowerLitres: z.number().int().positive(), upperLitres: z.number().int().positive(),
  }).refine(({ lowerLitres, upperLitres }) => lowerLitres < upperLitres),
  billing: z.strictObject({
    gstPercent: z.number().int().min(0).max(100),
    standardWastewaterPercent: z.number().min(0).max(100),
    apartmentWastewaterPercent: z.number().min(0).max(100),
  }),
  schedules: z.array(schedule).min(1).refine((entries) => entries.every(({ from, until, url }, index) =>
    from.endsWith("-07-01") && until === `${Number(from.slice(0, 4)) + 1}-07-01` &&
    new URL(url).hostname === "assets.watercare.co.nz" && url.endsWith(".pdf") &&
    (index === 0 || entries[index - 1].until === from)
  ), "Expected consecutive Watercare July-to-June source schedules"),
});

export const watercare = watercareData.parse(data);
