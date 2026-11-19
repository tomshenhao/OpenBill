import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { ElectricityAnalysis } from "@/components/electricity-analysis";
import { WaterAnalysis } from "@/components/water-analysis";
import { localeFromPath } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return [
    { locale: [] }, { locale: ["zh"] },
    { locale: ["electricity"] }, { locale: ["zh", "electricity"] },
    { locale: ["water"] }, { locale: ["zh", "water"] },
  ];
}

export default async function Page({ params }: { params: Promise<{ locale?: string[] }> }) {
  const segments = (await params).locale;
  const locale = localeFromPath(segments);
  if (!locale) notFound();
  if (segments?.at(-1) === "water") return <WaterAnalysis locale={locale} />;
  if (segments?.at(-1) === "electricity") return <ElectricityAnalysis locale={locale} />;
  return <HomePage locale={locale} />;
}
