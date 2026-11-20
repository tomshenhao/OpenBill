import type { IconName } from "../components/icon.tsx";

export const insuranceRoutes = { en: "/insurance/", zh: "/zh/insurance/" } as const;

export const insuranceSources = {
  consumerInsurance: "https://www.consumerprotection.govt.nz/help-product-service/managing-money/insurance",
  naturalHazards: "https://www.naturalhazards.govt.nz/insurance-and-claims/about-nhcover/",
  consumerCar: "https://www.consumerprotection.govt.nz/help-product-service/cars/paying-registering-insuring-car/car-insurance",
  sortedTypes: "https://sorted.org.nz/guides/protecting-wealth/insurance-types/",
  fmaInsurance: "https://www.fma.govt.nz/consumer/everyday-finance/insurance/",
  fmaAdvice: "https://www.fma.govt.nz/consumer/getting-advice/insurance-advice/",
  publicHealth: "https://www.immigration.govt.nz/process-to-apply/applying-for-a-visa/providing-evidence-and-documents-to-support-your-visa-application/health-requirements/who-can-get-public-health-care/",
  safeTravel: "https://www.safetravel.govt.nz/before-you-go/general-advice/travel-insurance",
  consumerTravel: "https://www.consumerprotection.govt.nz/help-product-service/travel-and-events/travel-insurance",
} as const;

export type InsuranceSource = keyof typeof insuranceSources;

// This registry describes guides and their references. Each product can have its own
// policy model, provider evidence, and calculation rules when those features begin.
export const insuranceModules = [
  { id: "house", icon: "house", status: "available", route: { en: "/insurance/house/", zh: "/zh/insurance/house/" }, sources: ["consumerInsurance", "naturalHazards"] },
  { id: "car", icon: "car", status: "available", route: { en: "/insurance/car/", zh: "/zh/insurance/car/" }, sources: ["consumerCar", "consumerInsurance"] },
  { id: "contents", icon: "key", status: "available", route: { en: "/insurance/contents/", zh: "/zh/insurance/contents/" }, sources: ["consumerInsurance", "sortedTypes"] },
  { id: "health", icon: "heart", status: "available", route: { en: "/insurance/health/", zh: "/zh/insurance/health/" }, sources: ["sortedTypes", "fmaAdvice", "publicHealth"] },
  { id: "life", icon: "shield", status: "available", route: { en: "/insurance/life/", zh: "/zh/insurance/life/" }, sources: ["sortedTypes", "fmaInsurance", "fmaAdvice"] },
  { id: "travel", icon: "globe", status: "available", route: { en: "/insurance/travel/", zh: "/zh/insurance/travel/" }, sources: ["safeTravel", "consumerTravel"] },
] as const satisfies readonly {
  id: string;
  icon: IconName;
  status: "available";
  route: { en: string; zh: string };
  sources: readonly InsuranceSource[];
}[];

export type InsuranceModule = (typeof insuranceModules)[number];
export type InsuranceModuleId = InsuranceModule["id"];
