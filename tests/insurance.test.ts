import { describe, expect, it } from "vitest";
import { insuranceModules, insuranceRoutes, insuranceSources } from "@/config/insurance";
import { insuranceFollowUps } from "@/config/roadmap";
import { localizedRoutes, resolvePage } from "@/config/routes";
import { messages } from "@/i18n";

describe("insurance guide boundaries", () => {
  it("registers six guides and the directory while rejecting unsupported pages", () => {
    expect(insuranceModules.map(({ id }) => id)).toEqual(["house", "car", "contents", "health", "life", "travel"]);
    expect(localizedRoutes.flatMap(Object.values)).toHaveLength(22);
    expect(new Set(localizedRoutes.flatMap(Object.values)).size).toBe(22);
    for (const locale of ["en", "zh"] as const) {
      expect(resolvePage(insuranceRoutes[locale].split("/").filter(Boolean))).toMatchObject({
        kind: "tool", locale, category: { id: "insurance", calculation: null },
      });
    }
    for (const segments of [["insurance", "pet"], ["insurance", "car", "quote"], ["zh", "insurance", "quote"], ["car"], ["en", "insurance"], ["zh", "water", "car"]]) {
      expect(resolvePage(segments)).toBeNull();
    }
  });

  it.each(insuranceModules)("$id has its own data sources, two routes and an independent follow-up", (guide) => {
    const { id, route, status, sources } = guide;
    expect(status).toBe("available");
    expect(insuranceFollowUps[id].status).toBe(id === "house" ? "completed" : "planned");
    expect(new Set(Object.values(insuranceFollowUps).map(({ task }) => task)).size).toBe(6);
    expect(sources.length).toBeGreaterThanOrEqual(2);
    expect(new Set(sources).size).toBe(sources.length);
    for (const source of sources) {
      const url = new URL(insuranceSources[source]);
      expect(url.protocol).toBe("https:");
      expect(url.search).toBe("");
    }
    for (const locale of ["en", "zh"] as const) {
      expect(resolvePage(route[locale].split("/").filter(Boolean))).toEqual({ kind: "insurance-guide", locale, guide });
      const copy = messages[locale].insurance.modules[id];
      for (const items of [copy.cover, copy.terms, copy.review]) expect(items.length).toBeGreaterThanOrEqual(2);
      expect(copy.planned).toBeTruthy();
    }
  });

  it("describes life insurance as cover payable on death in each language", () => {
    expect(messages.en.insurance.modules.life.summary).toContain("insured person dies");
    expect(messages.zh.insurance.modules.life.summary).toContain("被保险人身故");
  });
});
