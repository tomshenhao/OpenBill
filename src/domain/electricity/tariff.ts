export type OfficialSource = {
  url: `https://${string}`;
  verifiedOn: string; // YYYY-MM-DD, the actual human verification date.
  evidenceScreenshot: `evidence/electricity/${string}.png`;
  verifiedBy: string; // Public reviewer handle; never customer information.
};

// Initial flat-rate schema only. No comparison engine consumes this type yet.
// Decimal strings preserve the source precision until money arithmetic is implemented.
export type VerifiedElectricityTariff = {
  id: string;
  provider: string;
  plan: string;
  region: string;
  eligibility: string;
  dailyChargeNzd: string;
  usageRateNzdPerKwh: string;
  gstIncluded: true;
  additionalFeesAndConditions: string;
  source: OfficialSource;
};
