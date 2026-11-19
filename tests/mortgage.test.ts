import { describe, expect, it } from "vitest";
import { hasOfficialMortgageSource, mortgageCatalogue, mortgageLenders } from "@/data/mortgage/catalogue";
import { formatMortgageAmountOnBlur, parseMortgageMoney } from "@/domain/mortgage/money";
import { frequencies, estimateMortgage, parseExtraRepayment, parseMortgage, type Frequency, type MortgageInput } from "@/domain/mortgage/repayment";
import { filterMortgageRates, formatAdvertisedMortgageRate, listMortgageRates, mortgageCatalogueSchema, type PublishedRate, type RateFilters } from "@/domain/mortgage/rates";
import { mortgageCaptureRequestSchema } from "../tools/mortgage/catalogue.ts";

const input: MortgageInput = { amount: "400000", annualRate: "4", years: "20", type: "principal", frequency: "monthly", interestOnlyYears: "" };
function loan(overrides: Partial<MortgageInput> = {}) {
  const result = parseMortgage({ ...input, ...overrides });
  if (!result.ok) throw new Error("Invalid synthetic loan");
  return result;
}

// Independently discount each individual payment to its present value.
function discountedPayment(principal: number, annual: number, periods: number, perYear: number) {
  let discountSum = 0;
  for (let k = 1; k <= periods; k++) discountSum += (1 + annual / perYear) ** -k;
  return Math.round(principal * 100 / discountSum);
}

describe("mortgage repayment estimates", () => {
  it.each(Object.keys(frequencies) as Frequency[])("matches independently discounted %s payments and clears principal", (frequency) => {
    const result = estimateMortgage(loan(), frequency);
    const perYear = frequencies[frequency];
    expect(result.regularPayment).toBe(discountedPayment(400000, 0.04, perYear * 20, perYear));
    expect(result.balance).toBe(0);
    expect(result.paid).toBe(40_000_000 + result.interest);
    expect(result.balances[0]).toEqual({ period: 0, balance: 40_000_000 });
    expect(result.balances.at(-1)?.balance).toBe(0);
    expect(result.balances[1].balance).toBeLessThan(40_000_000);
  });

  it("reconciles a short term with zero interest and a fractional cent payment", () => {
    const result = estimateMortgage(loan({ amount: "1000", annualRate: "0", years: "0.5" }), "monthly");
    expect(result).toMatchObject({ regularPayment: 16667, paid: 100000, interest: 0, balance: 0, periods: 6 });
  });

  it("keeps principal outstanding during interest-only payments", () => {
    const result = estimateMortgage(loan({ amount: "120000", annualRate: "6", years: "10", type: "interest-only" }), "monthly");
    expect(result).toMatchObject({ regularPayment: 60000, paid: 7200000, interest: 7200000, balance: 12000000, transitionPayment: null });
    expect(result.balances.every(({ balance }) => balance === 12000000)).toBe(true);
  });

  it.each(Object.keys(frequencies) as Frequency[])("uses the remaining term after a half-year-aligned interest-only period at a %s frequency", (frequency) => {
    const result = estimateMortgage(loan({ amount: "120000", annualRate: "6", years: "10", type: "interest-only", interestOnlyYears: "1.5" }), frequency);
    const perYear = frequencies[frequency];
    expect(result.regularPayment).toBe(Math.round(12000000 * 0.06 / perYear));
    expect(result.transitionPayment).toBe(discountedPayment(120000, 0.06, perYear * 8.5, perYear));
    expect(result.balances).toContainEqual({ period: perYear * 1.5, balance: 12000000 });
    expect(result.balance).toBe(0);
    expect(result.paid - result.interest).toBe(12000000);
  });

  it("estimates an earlier payoff and reduced interest with recurring extra payments", () => {
    const baseline = estimateMortgage(loan(), "fortnightly");
    const extra = estimateMortgage(loan(), "fortnightly", parseExtraRepayment("100")!);
    expect(extra.periods).toBeLessThan(baseline.periods);
    expect(extra.interest).toBeLessThan(baseline.interest);
    expect(extra.balance).toBe(0);
    expect(parseExtraRepayment("-5")).toBeNull();
  });

  it.each([["amount", "0"], ["amount", "1000000000"], ["annualRate", "-1"], ["annualRate", "101"], ["annualRate", "2e0"], ["years", "0"], ["years", "40.5"], ["years", "1.25"], ["interestOnlyYears", "20"], ["interestOnlyYears", "0"]] as const)(
    "rejects invalid %s %s", (key, value) => {
      expect(parseMortgage({ ...input, type: "interest-only", [key]: value })).toEqual({ ok: false, field: key });
    },
  );
  it("accepts the upper term boundary", () => {
    expect(loan({ years: "40" }).years).toBe(40);
  });
});

describe("NZD grouping and precise input parsing", () => {
  it.each(["en-NZ", "zh-Hans-NZ"])("groups amounts and preserves cents in %s", (locale) => {
    expect(formatMortgageAmountOnBlur("500000", locale)).toBe("500,000");
    expect(formatMortgageAmountOnBlur("1250000", locale)).toBe("1,250,000");
    expect(formatMortgageAmountOnBlur("2864.35", locale)).toBe("2,864.35");
    expect(formatMortgageAmountOnBlur("125000.50", locale)).toBe("125,000.50");
    expect(formatMortgageAmountOnBlur("1,25", locale)).toBe("1,25");
    expect(formatMortgageAmountOnBlur("", locale)).toBe("");
    expect(formatAdvertisedMortgageRate("5.2", locale)).toBe("5.20");
    expect(formatAdvertisedMortgageRate("4.1234", locale)).toBe("4.12");
  });

  it("reads grouped and ungrouped amounts as exact cents", () => {
    expect(parseMortgageMoney("1,250,000.50")).toBe(125000050);
    expect(parseMortgageMoney("1250000.50")).toBe(125000050);
    expect(parseMortgageMoney("NZ$125,000.50")).toBe(12500050);
    expect(parseMortgageMoney("NZD 125,000.50")).toBe(12500050);
    expect(parseMortgageMoney(".5")).toBe(50);
    expect(parseMortgageMoney("1000.")).toBe(100000);
    expect(parseMortgageMoney("999,999,999.99")).toBe(99999999999);
    expect(parseExtraRepayment("1,000.05")).toBe(100005);
    expect(loan({ amount: "1,250,000.50" }).cents).toBe(125000050);
  });

  it.each(["12,34", "1,23,456", "1,234,567,890", "-100", "1,000.001", "1e3", "1.000,25", "."])(
    "rejects invalid or ambiguous amounts %s", (value) => {
      expect(parseMortgageMoney(value)).toBeNull();
    },
  );
});

const manifest = "a".repeat(64);
const record = "b".repeat(64);
const at = "2026-11-20T00:00:00.000Z";
const effective = "2026-11-20";
const fixture: PublishedRate = {
  rate: {
    id: "synthetic-example", lenderId: "anz", product: "Synthetic test offer", annualRate: "4.1234",
    term: "12", basis: "special", occupancy: ["owner"], minEquityPercent: 20, lowEquity: null,
    conditions: { en: "Test condition", zh: "测试条件" }, effectiveFrom: effective, effectiveUntil: null,
    provenance: { evidenceId: "test-evidence", sourceUrl: mortgageLenders[0].url,
      collectedBy: "fixture-collector", collectedAt: at, sourceRevision: "synthetic",
      evidenceManifestSha256: manifest, sourceContentSha256: "c".repeat(64), screenshotSha256: "d".repeat(64) },
  },
  review: { decision: "verified", reviewer: "fixture-reviewer", recordSha256: record, evidenceManifestSha256: manifest, verifiedAt: at, publicNewLendingConfirmed: true },
  rights: { decision: "permission-granted", reviewer: "fixture-rights", recordSha256: record, evidenceManifestSha256: manifest, reviewedAt: at, permissionReference: "Test only" },
};
const all: RateFilters = { term: "all", basis: "all", occupancy: "all" };

describe("mortgage rate visibility", () => {
  it("keeps initial coverage empty and limits source URLs to the eight registered lenders", () => {
    expect(mortgageLenders).toHaveLength(8);
    expect(mortgageCatalogue.entries).toEqual([]);
    expect(hasOfficialMortgageSource(fixture.rate.lenderId, fixture.rate.provenance.sourceUrl)).toBe(true);
    expect(hasOfficialMortgageSource(fixture.rate.lenderId, "https://example.invalid/")).toBe(false);
  });

  it("requires independently reviewed immutable evidence and permissions", () => {
    const valid = { schemaVersion: 1, entries: [fixture] };
    expect(mortgageCatalogueSchema.safeParse(valid).success).toBe(true);
    for (const entry of [
      { ...fixture, rights: undefined },
      { ...fixture, review: { ...fixture.review, reviewer: fixture.rate.provenance.collectedBy } },
      { ...fixture, review: { ...fixture.review, publicNewLendingConfirmed: false } },
      { ...fixture, rights: { ...fixture.rights, recordSha256: manifest } },
      { ...fixture, rate: { ...fixture.rate, provenance: { ...fixture.rate.provenance, screenshotSha256: null } } },
    ]) {
      expect(mortgageCatalogueSchema.safeParse({ ...valid, entries: [entry] }).success).toBe(false);
    }
  });

  it("requires official, permitted source captures and rejects synthetic imports", () => {
    const { provenance, ...rate } = fixture.rate;
    const request = {
      dataKind: "official", publicNonPersonalSourceConfirmed: true, localCapturePermitted: true,
      sourceUrl: provenance.sourceUrl, termsUrl: provenance.sourceUrl, termsNotes: "Illustrative test of the request structure.",
      collectedBy: provenance.collectedBy, collectedAt: provenance.collectedAt, sourceRevision: "Test contract",
      sourceFile: "source.html", screenshotFile: "source.png", rate,
    };
    expect(mortgageCaptureRequestSchema.safeParse(request).success).toBe(true);
    for (const invalid of [
      { dataKind: "synthetic" }, { localCapturePermitted: false }, { publicNonPersonalSourceConfirmed: false },
      { screenshotFile: "capture.pdf" }, { sourceUrl: "https://www.anz.co.nz/rates?account=example" },
    ]) {
      expect(mortgageCaptureRequestSchema.safeParse({ ...request, ...invalid }).success).toBe(false);
    }
  });

  it("filters term, advertised basis and explicitly supported property use", () => {
    expect(filterMortgageRates([fixture], all, at)).toEqual([fixture]);
    expect(filterMortgageRates([fixture], { term: "12", basis: "special", occupancy: "owner" }, at)).toEqual([fixture]);
    for (const filters of [{ ...all, term: "floating" }, { ...all, basis: "standard" }, { ...all, occupancy: "investment" }] as const) {
      expect(filterMortgageRates([fixture], filters, at)).toEqual([]);
    }
  });

  it("excludes expired, future and stale rates using New Zealand dates for effective windows", () => {
    expect(filterMortgageRates([fixture], all, "2026-12-20T00:00:00.000Z")).toEqual([]);
    expect(filterMortgageRates([fixture], all, "2026-11-19T23:59:59.999Z")).toEqual([]);
    const ending = { ...fixture, rate: { ...fixture.rate, effectiveUntil: "2026-11-21" } };
    expect(filterMortgageRates([ending], all, "2026-11-20T10:59:59.999Z")).toEqual([ending]);
    expect(filterMortgageRates([ending], all, "2026-11-20T11:00:00.000Z")).toEqual([]);
  });

  it("distinguishes outdated reviewed offers from missing, filtered and future rates", () => {
    expect(listMortgageRates([fixture], all, "2026-12-20T00:00:00.000Z")).toEqual({ current: [], outdated: [fixture] });
    expect(listMortgageRates([fixture], { ...all, basis: "standard" }, "2026-12-20T00:00:00.000Z"))
      .toEqual({ current: [], outdated: [] });
    expect(listMortgageRates([fixture], all, "2026-11-19T23:59:59.999Z")).toEqual({ current: [], outdated: [] });
    expect(listMortgageRates([], all, at)).toEqual({ current: [], outdated: [] });
  });
});
