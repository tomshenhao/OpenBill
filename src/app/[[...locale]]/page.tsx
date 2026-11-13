import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { ElectricityAnalysis } from "@/components/electricity-analysis";
import { localeFromPath } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: [] }, { locale: ["zh"] }, { locale: ["electricity"] }, { locale: ["zh", "electricity"] }];
}

export default async function Page({ params }: { params: Promise<{ locale?: string[] }> }) {
  const segments = (await params).locale;
  const locale = localeFromPath(segments);
  if (!locale) notFound();
  return segments?.at(-1) === "electricity" ? <ElectricityAnalysis locale={locale} /> : <HomePage locale={locale} />;
}
