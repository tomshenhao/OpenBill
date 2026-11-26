import { messages, type Locale } from "@/i18n";
import { ElectricityBillReview } from "./electricity-bill-review";

export function ElectricityAnalysis({ locale }: { locale: Locale }) {
  const { analysis, electricityReview: review, heroNote, noScript } = messages[locale];

  return (
    <>
      <main id="main" tabIndex={-1}>
        <div className="page-width pt-10 sm:pt-14">
          <h1 className="hero-title">{analysis.title}</h1>
          <p className="mt-4 max-w-2xl text-muted">{analysis.intro}</p>
          <noscript><p className="field-hint mt-3">{noScript}</p></noscript>
        </div>
        <nav className="page-width journey-steps analysis-steps electricity-section-links mt-6" aria-label={review.sections}>
          <a href="#understand-bill">{review.understand}</a>
          <a href="#electricity-savings">{review.save}</a>
        </nav>
        <ElectricityBillReview locale={locale} />
      </main>
      <footer className="border-t border-line py-8">
        <p className="page-width text-sm text-muted">OpenBill · {heroNote}</p>
      </footer>
    </>
  );
}
