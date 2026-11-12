import { messages, type Locale } from "@/i18n";
import { HomeIllustration } from "./home-illustration";
import { Icon } from "./icon";
import { UsageForm } from "./usage-form";
import { CoreCategorySection, MoreWaysToSave } from "./category-sections";
import { RoadmapSection } from "./roadmap-section";
import { CommunitySection } from "./community-section";

export function HomePage({ locale }: { locale: Locale }) {
  const t = messages[locale];
  return (
    <>
      <a className="skip-link" href="#main">{t.skip}</a>
      <header className="site-header">
        <div className="page-width flex min-h-22 flex-wrap items-center justify-between gap-4 py-4">
          <a href={locale === "en" ? "/" : "/zh/"} className="brand" aria-label="OpenBill">
            <span className="brand-mark"><Icon name="leaf" /></span>OpenBill<span className="brand-period">.</span>
          </a>
          <nav aria-label={t.navigation} className="flex flex-wrap items-center gap-4 sm:gap-8">
            <a href="#categories" className="nav-link hidden md:inline-flex">{t.product.categoriesNav}</a>
            <a href="#roadmap" className="nav-link hidden md:inline-flex">{t.product.roadmapNav}</a>
            <a href="#community" className="nav-link hidden lg:inline-flex">{t.product.communityNav}</a>
            <a href={locale === "en" ? "/zh/" : "/"} hrefLang={locale === "en" ? "zh-Hans" : "en-NZ"} lang={locale === "en" ? "zh-Hans" : "en-NZ"} className="language-link"><Icon name="globe" className="size-4" />{t.otherLanguage}</a>
          </nav>
        </div>
      </header>
      <main id="main" tabIndex={-1}>
        <section className="page-width hero-grid">
          <div>
            <p className="eyebrow"><span className="status-dot" aria-hidden="true" />{t.eyebrow}</p>
            <h1 className="hero-title">{t.heroTitle}</h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted">{t.heroDescription}</p>
            <p className="mt-4 max-w-lg text-sm leading-7 text-muted">{t.product.growthNote}</p>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-3">
              <a className="button-primary" href="#categories">{t.product.explore}<Icon name="arrow" /></a>
              <a className="text-action" href="#usage">{t.product.checkElectricity}</a>
            </div>
            <p className="mt-5 flex items-start gap-2 text-sm leading-6 text-muted"><Icon name="check" className="mt-0.5 size-5 shrink-0" />{t.heroNote}</p>
          </div>
          <figure className="hero-figure">
            <HomeIllustration label={t.illustrationLabel} />
            <figcaption className="text-center text-sm text-muted">{t.illustrationCaption}</figcaption>
          </figure>
        </section>
        <CoreCategorySection locale={locale} />
        <section id="usage" className="usage-section section-anchor">
          <div className="page-width grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
            <div className="lg:pt-9">
              <p className="eyebrow">{t.stage}</p>
              <h2 className="section-title mt-4">{t.stageTitle}</h2>
              <p className="mt-5 max-w-lg leading-7 text-muted">{t.stageBody}</p>
              <p className="mt-7 inline-flex items-center gap-2 rounded-full border border-line bg-white px-4 py-2 text-xs font-semibold text-green"><span className="status-dot" aria-hidden="true" />{t.status}</p>
              <aside className="evidence-note mt-9" aria-labelledby="evidence-heading">
                <Icon name="shield" className="mt-1 shrink-0" />
                <div><h3 id="evidence-heading" className="font-semibold">{t.noPricesTitle}</h3><p className="mt-2 text-sm leading-6 text-muted">{t.noPricesBody}</p></div>
              </aside>
            </div>
            <UsageForm locale={locale} />
          </div>
        </section>
        <section id="principles" className="section-spacing section-anchor">
          <div className="page-width">
            <p className="eyebrow">{t.principlesEyebrow}</p>
            <h2 className="section-title mt-4">{t.principlesTitle}</h2>
            <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-12">
              {t.principles.map((principle, index) => (
                <div key={principle.title}>
                  <Icon name={(["leaf", "check", "shield"] as const)[index]} className="size-7 text-green" />
                  <h3 className="mt-4 text-lg font-semibold">{principle.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-muted">{principle.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
        <MoreWaysToSave locale={locale} />
        <RoadmapSection locale={locale} />
        <CommunitySection locale={locale} />
      </main>
      <footer className="border-t border-line">
        <div className="page-width flex flex-col justify-between gap-5 py-8 sm:flex-row sm:items-center">
          <div><p className="text-lg font-bold tracking-tight">OpenBill<span className="text-green">.</span></p><p className="mt-2 text-xs leading-5 text-muted">{t.footerMission}</p></div>
          <p className="max-w-xs text-xs leading-5 text-muted">{t.footerStatus}</p>
        </div>
      </footer>
    </>
  );
}
