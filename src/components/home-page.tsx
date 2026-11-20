import { messages, type Locale } from "@/i18n";
import { Icon } from "./icon";
import { CoreCategorySection } from "./category-sections";
import { CommunitySection } from "./community-section";

export function HomePage({ locale }: { locale: Locale }) {
  const t = messages[locale];
  return (
    <>
      <main id="main" tabIndex={-1}>
        <section className="page-width home-hero" aria-labelledby="home-heading">
          <h1 id="home-heading" className="hero-title">{t.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-lg leading-7 text-muted">{t.heroDescription}</p>
        </section>
        <CoreCategorySection locale={locale} />
        <section id="principles" className="principles-section section-anchor" aria-labelledby="principles-heading">
          <div className="page-width">
            <h2 id="principles-heading" className="section-title">{t.principlesTitle}</h2>
            <ul role="list" className="mt-5 grid gap-x-8 gap-y-3 text-sm leading-6 sm:grid-cols-2">
              {t.principles.map((principle) => (
                <li key={principle} className="flex items-start gap-2">
                  <Icon name="check" className="mt-0.5 size-5 shrink-0 text-green" />{principle}
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <CommunitySection locale={locale} />
    </>
  );
}
