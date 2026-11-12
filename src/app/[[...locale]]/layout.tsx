import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { languageTags, localeFromPath, messages } from "@/i18n";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ locale?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const locale = localeFromPath((await params).locale);
  if (!locale) notFound();
  const t = messages[locale];
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false, follow: false } };
}

export default async function RootLayout({ children, params }: Props) {
  const locale = localeFromPath((await params).locale);
  if (!locale) notFound();
  return (
    <html lang={languageTags[locale]}>
      <head>
        <meta name="referrer" content="no-referrer" />
        {process.env.NODE_ENV === "production" && <meta httpEquiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'" />}
      </head>
      <body>{children}</body>
    </html>
  );
}
