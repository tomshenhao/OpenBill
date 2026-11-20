import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { languageTags, localeFromPath, messages } from "@/i18n";
import { resolvePage } from "@/config/routes";
import "../globals.css";

type Props = { children: React.ReactNode; params: Promise<{ locale?: string[] }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = resolvePage((await params).locale);
  if (!page) notFound();
  const copy = messages[page.locale];
  const tool = page.kind === "tool" ? page.category.id : undefined;
  const insurance = page.kind === "insurance-guide" ? copy.insurance.modules[page.guide.id] : undefined;
  const t = insurance ? { metaTitle: `${insurance.title} | OpenBill`, metaDescription: insurance.summary }
    : tool === "insurance" ? { metaTitle: `${copy.insurance.title} | OpenBill`, metaDescription: copy.insurance.intro }
    : tool === "mortgage" ? copy.mortgage : tool === "water" ? copy.water : tool === "electricity" ? copy.analysis : copy;
  return { title: t.metaTitle, description: t.metaDescription, robots: { index: false, follow: false } };
}

export default async function RootLayout({ children, params }: Props) {
  const locale = localeFromPath((await params).locale);
  if (!locale) notFound();
  return (
    <html lang={languageTags[locale]}>
      <head>
        <meta name="referrer" content="no-referrer" />
        <meta httpEquiv="Content-Security-Policy" content={process.env.NODE_ENV === "production"
          ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"
          : "form-action 'none'"} />
      </head>
      <body>{children}</body>
    </html>
  );
}
