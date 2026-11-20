import { insuranceModules, insuranceRoutes, insuranceSources, type InsuranceModule } from "@/config/insurance";
import { insuranceFollowUps } from "@/config/roadmap";
import { messages, type Locale } from "@/i18n";
import { Icon } from "./icon";

export function InsuranceDirectory({ locale }: { locale: Locale }) {
  const t = messages[locale].insurance;
  return (
    <main id="main" tabIndex={-1}>
      <div className="page-width home-hero">
        <h1 className="hero-title">{t.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted">{t.intro}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{t.directoryNote}</p>
      </div>
      <ul role="list" className="page-width category-grid border-t border-line pt-6 pb-12">
        {insuranceModules.map(({ id, route, icon, status }) => (
          <li key={id} className="category-card category-available" data-status={status}>
            <div className="flex items-center gap-3">
              <span className="category-icon"><Icon name={icon} className="size-5" /></span>
              <h2 className="text-lg font-semibold">
                <a href={route[locale]} className="category-link" aria-describedby={`insurance-${id}-summary`}>
                  {t.modules[id].title}<Icon name="arrow" className="size-4 shrink-0" />
                </a>
              </h2>
            </div>
            <p id={`insurance-${id}-summary`} className="mt-3 text-sm leading-6 text-muted">{t.modules[id].summary}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}

export function InsuranceGuide({ locale, guide }: { locale: Locale; guide: InsuranceModule }) {
  const { insurance: t, product } = messages[locale];
  const { title, summary, cover, terms, review, planned } = t.modules[guide.id];
  const followUp = insuranceFollowUps[guide.id];

  return (
    <main id="main" tabIndex={-1} className="page-width pb-12">
      <div className="home-hero">
        <a href={insuranceRoutes[locale]} className="text-action mb-3">
          <Icon name="arrow" className="size-4 rotate-180" />{t.back}
        </a>
        <h1 className="hero-title">{title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted">{summary}</p>
        <p className="mt-3 text-sm leading-6 text-muted">{t.guideOnly}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <section aria-labelledby="cover-heading" className="analysis-card">
          <h2 id="cover-heading" className="text-xl font-semibold">{t.coverHeading}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
            {cover.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
        <section aria-labelledby="terms-heading" className="analysis-card">
          <h2 id="terms-heading" className="text-xl font-semibold">{t.termsHeading}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 leading-7">
            {terms.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      </div>
      <section aria-labelledby="review-heading" className="mt-8">
        <h2 id="review-heading" className="section-title">{t.reviewHeading}</h2>
        <ol className="mt-3 max-w-3xl list-decimal space-y-2 pl-5 leading-7">
          {review.map((item) => <li key={item}>{item}</li>)}
        </ol>
      </section>
      <section aria-labelledby="planned-heading" className="mt-8 rounded-xl border border-line bg-[#f0f3ec] p-5">
        <h2 id="planned-heading" className="text-xl font-semibold">{t.plannedHeading}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          <strong>{product.milestoneStatus[followUp.status]}</strong> · {planned}
        </p>
      </section>
      <section aria-labelledby="sources-heading" className="mt-8">
        <h2 id="sources-heading" className="text-xl font-semibold">{t.sourcesHeading}</h2>
        <ul role="list" className="mt-2">
          {guide.sources.map((source) => (
            <li key={source}><a className="text-action" href={insuranceSources[source]} rel="noreferrer">{t.sources[source]}</a></li>
          ))}
        </ul>
      </section>
    </main>
  );
}
