import { describe, expect, it } from "vitest";
import { compareHouseQuotes, emptyHouseQuote, evidenceStates, formatHouseMoney, houseEventGroups, housePremiumEquivalents, readHouseQuote, reviewedEventState } from "@/domain/insurance/house";
import { formatNzdAmountOnBlur, parseNzdCents } from "@/domain/nzd";

describe("house policy evidence", () => {
  it("starts all eleven distinct house events as not verified without applicable wording", () => {
    expect(new Set(Object.values(houseEventGroups).flat()).size).toBe(11);
    for (const state of evidenceStates) {
      expect(reviewedEventState(state, "", "clause 2")).toBe("unverified");
      expect(reviewedEventState(state, "2026 edition", " ")).toBe("unverified");
      expect(reviewedEventState(state, "2026 edition", "clause 2")).toBe(state);
    }
  });
});

describe("manual house quote comparison", () => {
  const base = { ...emptyHouseQuote, premium: "NZ$ 1,820.17", sumInsured: "750,000", standardExcess: "750", hazardExcess: "1,000" };

  it("calculates the signed annual difference in cents", () => {
    expect(compareHouseQuotes(base, { ...base, premium: "1,700.03" })?.annualDifference).toBe(-12014);
    expect(compareHouseQuotes(base, { ...base, premium: "1820.18" })?.annualDifference).toBe(1);
    expect(compareHouseQuotes(base, base)?.annualDifference).toBe(0);
  });

  it("shows annual, monthly and weekly equivalents with two-decimal NZD formatting", () => {
    const annual = readHouseQuote({ ...emptyHouseQuote, premium: "NZ$1,500" }).amounts.premium;
    expect(annual).toBe(150000);
    const { monthly, weekly } = housePremiumEquivalents(150000);
    expect({ monthly, weekly }).toEqual({ monthly: 12500, weekly: 2885 });
    for (const locale of ["en-NZ", "zh-Hans-NZ"]) {
      expect(formatHouseMoney(150000, locale)).toBe("NZ$1,500.00");
      expect(formatHouseMoney(monthly, locale)).toBe("NZ$125.00");
      expect(formatHouseMoney(weekly, locale)).toBe("NZ$28.85");
    }
  });

  it("groups amounts in both languages while preserving cents and missing or invalid drafts", () => {
    for (const locale of ["en-NZ", "zh-Hans-NZ"]) {
      expect(formatNzdAmountOnBlur("750000", locale)).toBe("750,000");
      expect(formatNzdAmountOnBlur("NZ$ 1820.10", locale)).toBe("1,820.10");
      expect(parseNzdCents(formatNzdAmountOnBlur("1820.10", locale))).toBe(182010);
      expect(formatNzdAmountOnBlur("", locale)).toBe("");
      expect(formatNzdAmountOnBlur("18,20", locale)).toBe("18,20");
    }
  });

  it("flags differing, conditional and unknown terms ahead of the price difference", () => {
    const quote = { ...base, premium: "1700", sumInsured: "700000", standardExcess: "1500", hazardExcess: "", gradualWater: "excluded", conditions: "Owner occupied only" } as const;
    const baseline = { ...base, gradualWater: "conditional" } as const;
    expect(compareHouseQuotes(baseline, quote)?.checks).toEqual(expect.arrayContaining([
      { field: "sumInsured", baseline: 75000000, alternative: 70000000, uncertain: false },
      { field: "standardExcess", baseline: 75000, alternative: 150000, uncertain: false },
      { field: "hazardExcess", baseline: 100000, alternative: null, uncertain: true },
      { field: "gradualWater", baseline: "conditional", alternative: "excluded", uncertain: true },
      { field: "flood", baseline: "unverified", alternative: "unverified", uncertain: true },
      { field: "conditions", baseline: "", alternative: "Owner occupied only", uncertain: true },
    ]));
    expect(compareHouseQuotes(baseline, baseline)?.checks).toContainEqual({
      field: "gradualWater", baseline: "conditional", alternative: "conditional", uncertain: true,
    });
  });

  it("does not turn missing amounts into zero or accept invalid entries", () => {
    expect(compareHouseQuotes(base, emptyHouseQuote)).toBeNull();
    for (const premium of ["0", "abc", "-10", "17,00", "1e3", "1.234"]) {
      expect(compareHouseQuotes(base, { ...base, premium })).toBeNull();
    }
    expect(readHouseQuote({ ...base, sumInsured: "0", standardExcess: "0", hazardExcess: "5%", date: "2026-02-30" }).invalid)
      .toEqual(["sumInsured", "hazardExcess", "date"]);
    expect(readHouseQuote(emptyHouseQuote).amounts.hazardExcess).toBeNull();
    expect(readHouseQuote({ ...base, standardExcess: "0", date: "2026-11-20" }).invalid).toEqual([]);
  });

  it("compares valid premiums and flags an invalid coverage figure as unknown", () => {
    const result = compareHouseQuotes(base, { ...base, premium: "1520.17", sumInsured: "invalid" });
    expect(result?.annualDifference).toBe(-30000);
    expect(result?.checks).toContainEqual({ field: "sumInsured", baseline: 75000000, alternative: null, uncertain: true });
  });
});
