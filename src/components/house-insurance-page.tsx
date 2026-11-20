import { insuranceRoutes, insuranceSources } from "@/config/insurance";
import { messages, type Locale } from "@/i18n";
import { HousePolicyReview } from "./house-policy-review";
import { Icon } from "./icon";

export function HouseInsurancePage({ locale }: { locale: Locale }) {
  const { insurance, houseInsurance: t } = messages[locale];
  return (
    <main id="main" tabIndex={-1} className="page-width pb-12">
      <div className="home-hero">
        <a href={insuranceRoutes[locale]} className="text-action mb-3">
          <Icon name="arrow" className="size-4 rotate-180" />{insurance.back}
        </a>
        <h1 className="hero-title">{insurance.modules.house.title}</h1>
        <p className="mt-4 max-w-2xl text-lg leading-7 text-muted">{t.intro}</p>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t.privacy}</p>
        <nav className="mt-3 flex flex-wrap gap-x-6" aria-label={insurance.modules.house.title}>
          <a className="text-action" href="#enter-policy">{t.enterPolicy}</a>
          <a className="text-action" href="#understand-cover">{t.review}</a>
          <a className="text-action" href="#compare-quotes">{t.quotes}</a>
          <a className="text-action" href="#house-tips">{t.tips}</a>
        </nav>
      </div>
      <HousePolicyReview locale={locale} />
      <section className="mt-8 analysis-card" aria-labelledby="house-benchmark-heading">
        <h2 id="house-benchmark-heading" className="text-xl font-semibold">{t.pending}</h2>
        <p className="mt-2 text-sm leading-6 text-muted">{t.pendingBody}</p>
      </section>
      <section id="house-tips" className="section-anchor mt-8" aria-labelledby="house-tips-heading">
        <h2 id="house-tips-heading" className="section-title">{t.tips}</h2>
        <ul className="mt-3 max-w-3xl list-disc space-y-2 pl-5 leading-7">
          {t.tipItems.map((tip) => <li key={tip}>{tip}</li>)}
        </ul>
      </section>
      <section className="mt-8" aria-labelledby="house-sources-heading">
        <h2 id="house-sources-heading" className="text-xl font-semibold">{t.sources}</h2>
        <ul role="list" className="mt-2">
          <li><a className="text-action" href="https://www.icnz.org.nz/individuals/house-contents/" rel="noreferrer">{t.icnzLink}</a></li>
          <li><a className="text-action" href="https://www.icnz.org.nz/individuals/making-a-claim/" rel="noreferrer">{t.icnzClaimsLink}</a></li>
          <li><a className="text-action" href={insuranceSources.consumerInsurance} rel="noreferrer">{insurance.sources.consumerInsurance}</a></li>
        </ul>
      </section>
    </main>
  );
}
