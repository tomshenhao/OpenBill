import { messages, type Locale } from "@/i18n";
import type { assessUsage } from "@/domain/electricity/ratings";

export function UsageRating({ locale, assessment, explanation }: { locale: Locale; assessment: ReturnType<typeof assessUsage>; explanation?: string }) {
  const t = messages[locale].analysis, r = t.ratings;
  const format = (value: number) => new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-Hans-NZ", { maximumFractionDigits: 3 }).format(value);
  return <section className="rating-card" data-rating={assessment.rating} data-testid="usage-rating" aria-labelledby="usage-rating-heading">
    <h3 id="usage-rating-heading" className="text-xl font-semibold">{r.usageTitle}</h3>
    <p className="rating-status"><span className="rating-dot" aria-hidden="true" />{r.usageLabels[assessment.rating]}</p>
    {assessment.rating === "unknown" && assessment.kwh !== null && <p className="font-semibold">{r.yourUsage}: {format(assessment.kwh)} kWh</p>}
    {assessment.rating === "unknown" ? <p className="text-sm leading-7">{explanation ?? r.usageNeed}</p> : <>
      <p className="font-semibold">{r.yourUsage}: {format(assessment.kwh)} kWh</p>
      <p className="field-hint">{t.regions[assessment.region as keyof typeof t.regions]} · {r.period}: {assessment.month}</p>
      <p className="mt-3 text-sm leading-7">{r.population}</p>
      <div className="mt-5 space-y-3" role="img" aria-label={`${r.yourUsage}: ${format(assessment.kwh)} kWh; P75: ${format(assessment.p75Kwh)} kWh; P95: ${format(assessment.p95Kwh)} kWh`}>
        {[[r.yourUsage, assessment.kwh], [r.p75, assessment.p75Kwh], [r.p95, assessment.p95Kwh]].map(([label, value]) => <div key={label}><p className="mb-1 text-sm">{label}: <strong>{format(Number(value))} kWh</strong></p><div className="benchmark-track"><div className="benchmark-bar" style={{ width: `${Number(value) / Math.max(assessment.kwh, assessment.p95Kwh, 1) * 100}%` }} /></div></div>)}
      </div>
      <a className="source-link mt-4 inline-block text-sm" href={assessment.source.reportUrl} rel="noreferrer">{t.source}</a><p className="field-hint">{t.sourceStatus}</p>
    </>}
    <p className="mt-5 text-sm leading-7">{assessment.rating === "green" ? r.greenAdvice : assessment.rating === "unknown" ? r.neutralAdvice : r.highAdvice}</p>
    <p className="field-hint">{r.safety}</p><a className="text-action mt-4" href="#saving-tips">{r.tipsAction}</a>
    <details className="mt-5"><summary>{r.thresholds}</summary><p className="field-hint">{r.usagePolicy}</p></details>
  </section>;
}
