import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { categoryCatalog, coreCategories, futureCategories } from "@/config/categories";
import { communityFeedbackUrl } from "@/config/community";
import { roadmapMilestones } from "@/config/roadmap";
import { categoryIds, coreCategoryIds, futureCategoryIds } from "@/domain/categories";
import { messages } from "@/i18n";
import { renderRoadmap, updateReadmeModules } from "../scripts/roadmap-content.ts";

describe("household product scope and truthful availability", () => {
  it("covers the six core and nine future categories exactly once", () => {
    expect(coreCategories.map((entry) => entry.id)).toEqual([...coreCategoryIds]);
    expect(futureCategories.map((entry) => entry.id)).toEqual([...futureCategoryIds]);
    expect(categoryCatalog).toHaveLength(15);
    expect(new Set(categoryCatalog.map((entry) => entry.id))).toEqual(new Set(categoryIds));
  });
  it("exposes the implemented tools and the insurance guides", () => {
    const available = categoryCatalog.filter((entry) => entry.status === "available");
    expect(available.map((entry) => entry.id)).toEqual(["electricity", "water", "mortgage", "insurance"]);
    const [electricity, water, mortgage, insurance] = available;
    expect(electricity.route).toEqual({ en: "/electricity/", zh: "/zh/electricity/" });
    expect(electricity.supportedFeatures).toEqual(["daily-usage-average", "bill-analysis", "contextual-saving-tips", "local-pdf-bill-review", "current-charge-reconciliation", "usage-savings-scenarios", "manual-rate-comparison"]);
    expect(water.route).toEqual({ en: "/water/", zh: "/zh/water/" });
    expect(water.supportedFeatures).toContain("manual-rate-bill-check");
    expect(mortgage.route).toEqual({ en: "/mortgage/", zh: "/zh/mortgage/" });
    expect(mortgage.supportedFeatures).toContain("repayment-estimates");
    expect(mortgage.futureFeatures).toContain("independently-reviewed-bank-rates");
    expect(insurance.route).toEqual({ en: "/insurance/", zh: "/zh/insurance/" });
    expect(insurance.calculation).toBeNull();
    expect(insurance.supportedFeatures).toContain("six-insurance-guides");
    for (const category of available) {
      if (category.id !== "insurance") expect(existsSync(resolve(category.calculation.module))).toBe(true);
    }
    for (const category of categoryCatalog.filter((entry) => entry.status !== "available")) {
      expect(category.route).toBeNull(); expect(category.calculation).toBeNull(); expect(category.supportedFeatures).toHaveLength(0);
      expect(category.dataSources.every((source) => source.readiness === "planned")).toBe(true);
    }
  });
  it("supplies bilingual descriptions and future scope for every category", () => {
    for (const category of categoryCatalog) {
      for (const locale of ["en", "zh"] as const) {
        expect(messages[locale].product.categories[category.id].name.length).toBeGreaterThan(0);
        expect(messages[locale].product.categories[category.id].description.length).toBeGreaterThan(0);
      }
      expect(category.futureFeatures.length).toBeGreaterThan(0); expect(category.dataSources.length).toBeGreaterThan(0);
    }
    for (const { id, status } of coreCategories) {
      for (const locale of ["en", "zh"] as const) {
        const { current, next } = messages[locale].product.coreProgress[id];
        expect(next.length).toBeGreaterThan(0);
        if (status === "available") expect(current?.length).toBeGreaterThan(0);
        else expect(current).toBeNull();
      }
    }
  });
  it("assigns expense ownership once and excludes important bundled duplicates", () => {
    const owned = categoryCatalog.flatMap((category) => [...category.accounting.owns]);
    expect(new Set(owned).size).toBe(owned.length);
    expect(categoryCatalog.find((entry) => entry.id === "transport")!.accounting.excludes).toEqual(expect.arrayContaining(["vehicle-insurance", "home-vehicle-charging"]));
    expect(categoryCatalog.find((entry) => entry.id === "waste-recycling")!.accounting.excludes).toContain("waste-included-in-rates");
    expect(categoryCatalog.find((entry) => entry.id === "water")!.accounting.excludes).toContain("water-included-in-rates");
  });
  it("keeps a unique, documented roadmap with real foundations and planned comparisons", () => {
    expect(new Set(roadmapMilestones.map((entry) => entry.id)).size).toBe(roadmapMilestones.length);
    expect(roadmapMilestones.find((entry) => entry.id === "v02")!.status).toBe("completed");
    expect(roadmapMilestones.find((entry) => entry.id === "verified-electricity")!.status).toBe("planned");
    expect(roadmapMilestones.find((entry) => entry.id === "electricity-comparison-framework")!.status).toBe("completed");
    expect(roadmapMilestones.find((entry) => entry.id === "electricity-household-data")!.status).toBe("planned");
    expect(roadmapMilestones.find((entry) => entry.id === "water-evidence")!.status).toBe("planned");
    for (const milestone of roadmapMilestones) {
      expect(existsSync(resolve(milestone.documentation!))).toBe(true);
      for (const locale of ["en", "zh"] as const) expect(messages[locale].product.milestones[milestone.id].description.length).toBeGreaterThan(0);
    }
  });
  it("keeps Markdown module status in sync with the homepage configuration", () => {
    expect(readFileSync(resolve("ROADMAP.md"), "utf8")).toBe(renderRoadmap());
    const readme = readFileSync(resolve("README.md"), "utf8");
    expect(readme).toBe(updateReadmeModules(readme));
  });
  it("uses the existing public Issues page without templates or household parameters in the URL", () => {
    expect(communityFeedbackUrl).toBe("https://github.com/tomshenhao/OpenBill/issues");
    const url = new URL(communityFeedbackUrl); expect(url.search).toBe(""); expect(url.hash).toBe("");
    const template = readFileSync(resolve(".github/ISSUE_TEMPLATE/feature_request.yml"), "utf8");
    expect(template).toContain("Do not paste calculator entries");
    for (const category of categoryCatalog) expect(template).toContain(`${messages.en.product.categories[category.id].name} / ${messages.zh.product.categories[category.id].name}`);
  });
});
