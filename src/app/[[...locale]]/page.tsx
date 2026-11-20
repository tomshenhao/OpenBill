import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { ElectricityAnalysis } from "@/components/electricity-analysis";
import { WaterAnalysis } from "@/components/water-analysis";
import { MortgageCalculator } from "@/components/mortgage-calculator";
import { SiteHeader } from "@/components/site-header";
import { coreCategories } from "@/config/categories";
import { localeFromPath } from "@/i18n";

export const dynamicParams = false;

const toolPages = { electricity: ElectricityAnalysis, water: WaterAnalysis, mortgage: MortgageCalculator };

export function generateStaticParams() {
  return [
    { locale: [] }, { locale: ["zh"] },
    { locale: ["electricity"] }, { locale: ["zh", "electricity"] },
    { locale: ["water"] }, { locale: ["zh", "water"] },
    { locale: ["mortgage"] }, { locale: ["zh", "mortgage"] },
  ];
}

export default async function Page({ params }: { params: Promise<{ locale?: string[] }> }) {
  const segments = (await params).locale;
  const locale = localeFromPath(segments);
  if (!locale) notFound();

  const slug = segments?.at(-1);
  const category = coreCategories.find(({ id }) => id === slug);
  const tool = category?.status === "available" ? category : undefined;
  const Content = tool ? toolPages[tool.id] : HomePage;
  return (
    <>
      <SiteHeader locale={locale} tool={tool} />
      <Content locale={locale} />
    </>
  );
}
