import { describe, expect, it } from "vitest";
import { recommendTips, tipSources, type TipContext } from "@/domain/electricity/tips";
import { messages } from "@/i18n";
const context: TipContext = { estimatedReading: false, heating: "unknown", hotWater: "unknown", timeOfUse: false, flexible: false, olderBulbs: false };
describe("contextual evidence-based advice", () => {
  it("prioritises low-cost relevant advice and caps the list at three", () => {
    expect(recommendTips({ ...context, estimatedReading: true, heating: "heat-pump", hotWater: "electric", olderBulbs: true })).toEqual(["reading", "heat", "hotWater"]);
    expect(recommendTips(context)).toHaveLength(2);
  });
  it("requires both a time-of-use plan and safe flexibility before suggesting timing", () => {
    expect(recommendTips({ ...context, timeOfUse: true })).not.toContain("timing");
    expect(recommendTips({ ...context, flexible: true })).not.toContain("timing");
    expect(recommendTips({ ...context, timeOfUse: true, flexible: true })).toContain("timing");
    expect(recommendTips({ ...context, olderBulbs: true })).toContain("led");
  });
  it("has bilingual explanations, conditions and official sources without exact savings claims", () => {
    for (const [id, source] of Object.entries(tipSources)) {
      expect(["www.ea.govt.nz", "www.eeca.govt.nz"]).toContain(new URL(source).hostname);
      for (const locale of ["en", "zh"] as const) {
        const tip = messages[locale].analysis.advice[id as keyof typeof tipSources];
        expect(tip.title.length).toBeGreaterThan(0);
        expect([tip.action, tip.why, tip.condition].every((text) => text.length > 10)).toBe(true);
        expect(Object.values(tip).join(" ")).not.toMatch(/\$\d|save \d|节省\s*\d/);
      }
    }
  });
});
