import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { ElectricityAnalysis } from "@/components/electricity-analysis";
import { WaterAnalysis } from "@/components/water-analysis";
import { MortgageCalculator } from "@/components/mortgage-calculator";
import { InsuranceDirectory, InsuranceGuide } from "@/components/insurance-pages";
import { HouseInsurancePage } from "@/components/house-insurance-page";
import { SiteHeader } from "@/components/site-header";
import { localizedRoutes, resolvePage } from "@/config/routes";

export const dynamicParams = false;

const toolPages = { electricity: ElectricityAnalysis, water: WaterAnalysis, mortgage: MortgageCalculator, insurance: InsuranceDirectory };

export function generateStaticParams() {
  return localizedRoutes.flatMap(({ en, zh }) => [en, zh].map((path) => ({ locale: path.split("/").filter(Boolean) })));
}

export default async function Page({ params }: { params: Promise<{ locale?: string[] }> }) {
  const page = resolvePage((await params).locale);
  if (!page) notFound();
  const { locale } = page;
  if (page.kind === "insurance-guide") {
    return (
      <>
        <SiteHeader locale={locale} tool={{ id: "insurance", route: page.guide.route }} />
        {page.guide.id === "house" ? <HouseInsurancePage locale={locale} /> : <InsuranceGuide locale={locale} guide={page.guide} />}
      </>
    );
  }
  const tool = page.kind === "tool" ? page.category : undefined;
  const Content = tool ? toolPages[tool.id] : HomePage;
  return (
    <>
      <SiteHeader locale={locale} tool={tool} />
      <Content locale={locale} />
    </>
  );
}
