import { notFound } from "next/navigation";
import { HomePage } from "@/components/home-page";
import { localeFromPath } from "@/i18n";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: [] }, { locale: ["zh"] }];
}

export default async function Page({ params }: { params: Promise<{ locale?: string[] }> }) {
  const locale = localeFromPath((await params).locale);
  if (!locale) notFound();
  return <HomePage locale={locale} />;
}
