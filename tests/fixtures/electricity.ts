import type { ElectricityTariff, TariffReview } from "../../src/domain/electricity/tariff.ts";
import type { DataPolicy } from "../../src/domain/electricity/validation.ts";

// SYNTHETIC ONLY. Reserved example domain, fake retailer/network, no real tariff.
export const testPolicy: DataPolicy = {
  retailers: [{ id: "synthetic", officialHosts: ["retailer.example"], sourceUrls: ["https://retailer.example/tariffs"], automation: "permitted" }],
  networks: [{ id: "synthetic-network", regionCodes: ["NZ-AUK"], sourceUrl: "https://retailer.example/networks" }],
};
export const testNow = new Date("2026-11-13T00:00:00.000Z");
export const hash = "a".repeat(64);
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII=", "base64");

export function syntheticTariff(): ElectricityTariff {
  return {
    schemaVersion: 1, dataKind: "synthetic", recordId: "synthetic-r1", revision: "r1", supersedes: null, retailerId: "synthetic",
    plan: { id: "synthetic-plan", name: "SYNTHETIC TEST ONLY - NOT A RETAIL OFFER" },
    coverage: { regionCodes: ["NZ-AUK"], networkIds: ["synthetic-network"], sourceDescription: "Synthetic scope, not actual supply availability" },
    metering: { configuration: "smart", registers: ["uncontrolled"], sourceDescription: "Synthetic metering" },
    eligibility: { userCategory: "standard", primaryResidenceOnly: false, minimumAnnualKwh: null, maximumAnnualKwh: null, conditions: [], unresolved: false },
    contract: { termMonths: 0, earlyTerminationFee: { amount: "0", currency: "NZD", unit: "NZD" }, discounts: [], conditions: [], unresolved: false },
    gst: { treatment: "inclusive", ratePercent: "15", sourceDescription: "Synthetic GST treatment for arithmetic tests" },
    effectiveFrom: "2026-11-01", effectiveTo: "2026-12-01",
    charges: { daily: [{ id: "daily", label: "Synthetic fixed charge", price: { amount: "1.234567", currency: "NZD", unit: "NZD/day" } }], usage: [{ id: "anytime", label: "Synthetic anytime", register: "uncontrolled", kind: "flat", price: { amount: "0.123456", currency: "NZD", unit: "NZD/kWh" } }] },
    provenance: { evidenceId: "synthetic-evidence", evidenceManifestSha256: hash, sourceUrl: "https://retailer.example/tariffs", collectedAt: "2026-11-12T00:00:00.000Z", collectedBy: "test-collector", sourceContentSha256: hash, sourceRevision: "synthetic-source-r1", screenshotSha256: hash },
    status: "pending-verification",
  };
}

export function syntheticReview(recordId: string, recordSha256: string): TariffReview {
  return { schemaVersion: 1, reviewId: "test-review-1", previousReviewId: null, recordId, recordSha256, status: "verified", reviewedAt: "2026-11-12T12:00:00.000Z", reviewerId: "independent-test-reviewer", rationale: "SYNTHETIC TEST REVIEW ONLY", checks: { officialSource: true, exactPricesAndUnits: true, geographyAndMetering: true, eligibilityAndConditions: true, gstAndDates: true, screenshotMatchesSource: true } };
}
