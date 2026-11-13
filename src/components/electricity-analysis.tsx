"use client";

import { useRef, useState, type FormEvent } from "react";
import { messages, type Locale } from "@/i18n";
import { analyseBill, billSchema } from "@/domain/electricity/bill";
import { benchmarkUsage, benchmarkRequirement, availableBenchmarkMonths, daysInMonth } from "@/domain/electricity/benchmark";
import { rateWarnings, flatDiagnosticSupported } from "@/domain/electricity/input-guidance";
import { recommendTips, tipSources, type TipContext } from "@/domain/electricity/tips";
import { regionalBenchmark, regionalDistribution } from "@/data/electricity/analysis-data";
import { billingPeriod, compareBillingPeriod } from "@/domain/electricity/billing-period";
import { Icon } from "./icon";

const initial = {
  days: "", kwh: "", totalNzd: "", gst: "inclusive" as "inclusive" | "exclusive",
  dailyNzd: "", usageCents: "", dailyGst: "inclusive" as "inclusive" | "exclusive", usageGst: "inclusive" as "inclusive" | "exclusive",
  retailer: "", plan: "", region: "", month: "", people: "", fullCalendarMonth: false, representativeYear: false,
  start: "", end: "", approximate: false, meter: "unknown", peak: "", offPeak: "", controlled: "",
  estimatedReading: false, heating: "unknown" as TipContext["heating"], hotWater: "unknown" as TipContext["hotWater"], timeOfUse: false, flexible: false, olderBulbs: false,
};
type Inputs = typeof initial;
export function ElectricityAnalysis({ locale }: { locale: Locale }) {
  const common = messages[locale], t = common.analysis;
  const [input, setInput] = useState<Inputs>(initial), [submitted, setSubmitted] = useState<Inputs | null>(null), [errors, setErrors] = useState<string[]>([]);
  const resultsRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const set = <K extends keyof Inputs>(key: K, value: Inputs[K]) => setInput((s) => ({ ...s, [key]: value }));
  const toBill = (s: Inputs) => ({ days: s.days, kwh: s.kwh, totalNzd: s.totalNzd, gst: s.gst, representativeYear: s.representativeYear, ...((s.dailyNzd || s.usageCents) && flatDiagnosticSupported(s) ? { components: { dailyNzd: s.dailyNzd, usageCents: s.usageCents, dailyGst: s.dailyGst, usageGst: s.usageGst } } : {}), ...((s.peak || s.offPeak || s.controlled) ? { usageBreakdown: { peak: s.peak, offPeak: s.offPeak, controlled: s.controlled } } : {}) });
  const dates = billingPeriod(input.start, input.end);
  const datedComparison = submitted?.start ? compareBillingPeriod(regionalBenchmark, regionalDistribution, { start: submitted.start, end: submitted.end, region: submitted.region, kwh: submitted.kwh, approximate: submitted.approximate }) : null;
  const result = submitted ? analyseBill(toBill(submitted)) : null;
  const benchmark = submitted ? benchmarkUsage(regionalBenchmark, { region: submitted.region, month: submitted.month, days: Number(submitted.days), kwh: submitted.kwh, fullCalendarMonth: submitted.fullCalendarMonth, ...(submitted.people ? { people: Number(submitted.people) } : {}) }) : null;
  const tips = recommendTips(submitted ?? initial);
  const warnings = flatDiagnosticSupported(input) ? rateWarnings(input) : [];
  const monthLabel = (month: string) => new Intl.DateTimeFormat(locale === "en" ? "en-NZ" : "zh-CN", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${month}-15T12:00:00Z`));
  const requirement = submitted ? benchmarkRequirement(regionalBenchmark, { ...submitted, days: Number(submitted.days) }) : null;
  const periodExplanation = requirement ? t.periodReasons[requirement].replace("{month}", submitted?.month ? monthLabel(submitted.month) : "").replace("{expected}", submitted?.month ? String(daysInMonth(submitted.month)) : "").replace("{actual}", submitted?.days ?? "") : t.benchmarkNeed;
  const distributionResult = submitted ? benchmarkUsage(regionalBenchmark, { ...submitted, days: Number(submitted.days), people: submitted.people ? Number(submitted.people) : undefined }, regionalDistribution) : null;
  const number = (n: number, digits = 2) => new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-CN", { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(n);
  const money = (n: number) => new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-CN", { style: "currency", currency: "NZD" }).format(n);
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const dated = input.start || input.end ? billingPeriod(input.start, input.end) : null;
    const effective = dated ? { ...input, days: String(dated.days), month: dated.exactMonth ?? "", fullCalendarMonth: !!dated.exactMonth } : input;
    const parsed = billSchema.safeParse(toBill(effective));
    const issues = parsed.success ? [] : parsed.error.issues.flatMap((i) => i.path[0] === "usageBreakdown" ? ["peak", "offPeak", "controlled"] : [i.path.at(-1) as string]);
    if ((input.start || input.end) && !dated) issues.push("dates");
    if (input.people && (!/^\d{1,2}$/.test(input.people) || Number(input.people) < 1 || Number(input.people) > 20)) issues.push("people");
    if (issues.length) { setErrors(issues); setSubmitted(null); requestAnimationFrame(() => errorRef.current?.focus()); return; }
    setErrors([]); setSubmitted({ ...effective });
    requestAnimationFrame(() => resultsRef.current?.focus());
  };
  const numeric = (id: "days" | "kwh" | "totalNzd" | "dailyNzd" | "usageCents" | "people" | "peak" | "offPeak" | "controlled", label: string, hint?: string) => (
    <div>
      <label className="field-label" htmlFor={`bill-${id}`}>{label}</label>
      <input className="analysis-input" id={`bill-${id}`} type="text" inputMode={id === "days" || id === "people" ? "numeric" : "decimal"} value={id === "days" && dates ? String(dates.days) : input[id]} readOnly={id === "days" && !!dates} required={["days", "kwh", "totalNzd"].includes(id)} maxLength={16} onChange={(e) => set(id, e.target.value)} aria-invalid={errors.includes(id) || undefined} aria-describedby={[hint ? `hint-${id}` : "", errors.includes(id) ? "bill-error" : ""].filter(Boolean).join(" ") || undefined} />
      {hint && <p id={`hint-${id}`} className="field-hint">{hint}</p>}
    </div>
  );
  const tax = (id: "gst" | "dailyGst" | "usageGst", label: string) => (
    <div><label className="field-label" htmlFor={`bill-${id}`}>{label}</label><select className="analysis-input" id={`bill-${id}`} value={input[id]} onChange={(e) => set(id, e.target.value as "inclusive" | "exclusive")}><option value="inclusive">{t.inclusive}</option><option value="exclusive">{t.exclusive}</option></select></div>
  );
  const checkbox = (id: "fullCalendarMonth" | "representativeYear" | "estimatedReading" | "timeOfUse" | "flexible" | "olderBulbs", label: string) => (
    <label className="analysis-check"><input type="checkbox" disabled={id === "fullCalendarMonth" && !!dates} checked={input[id]} onChange={(e) => set(id, e.target.checked)} />{label}</label>
  );
  return (
    <>
      <a className="skip-link" href="#main">{common.skip}</a>
      <header className="site-header"><div className="page-width flex min-h-22 flex-wrap items-center justify-between gap-4 py-4">
        <a className="brand" href={locale === "en" ? "/" : "/zh/"} aria-label="OpenBill"><span className="brand-mark"><Icon name="leaf" /></span>OpenBill<span className="brand-period">.</span></a>
        <nav aria-label={common.navigation} className="flex items-center gap-5"><a className="nav-link hidden sm:inline-flex" href={locale === "en" ? "/" : "/zh/"}>{t.home}</a><a className="language-link" lang={locale === "en" ? "zh-Hans" : "en-NZ"} hrefLang={locale === "en" ? "zh-Hans" : "en-NZ"} href={locale === "en" ? "/zh/electricity/" : "/electricity/"}><Icon name="globe" className="size-4" />{common.otherLanguage}</a></nav>
      </div></header>
      <main id="main" tabIndex={-1}>
        <section className="page-width analysis-hero">
          <div><p className="eyebrow">{t.eyebrow}</p><h1 className="hero-title">{t.title}</h1><p className="mt-5 max-w-2xl text-lg leading-8 text-muted">{t.intro}</p></div>
          <aside className="analysis-privacy"><Icon name="shield" className="size-7" /><p className="mt-4 text-sm leading-7">{t.privacy}</p></aside>
        </section>
        <nav className="page-width analysis-steps" aria-label={t.local}>{[["your-bill", t.bill], ["your-usage", t.usage], ["saving-tips", t.tips]].map(([id, label], i) => <a href={`#${id}`} key={id}><span aria-hidden="true">0{i + 1}</span>{label}<Icon name="arrow" className="ml-auto size-4" /></a>)}</nav>
        <section id="your-bill" className="analysis-section section-anchor" aria-labelledby="bill-heading"><div className="page-width">
          <p className="eyebrow">01 · {t.local}</p><h2 id="bill-heading" className="section-title mt-3">{t.bill}</h2>
          <div className="analysis-bill-grid mt-8">
            <form className="analysis-card" noValidate autoComplete="off" onSubmit={submit}>
              <h3 className="text-xl font-semibold">{t.formTitle}</h3><p className="mt-3 text-sm leading-7 text-muted">{t.formIntro}</p>
              {errors.length > 0 && <p id="bill-error" ref={errorRef} role="alert" tabIndex={-1} className="field-error mt-5">{t.invalid}</p>}
              <div className="analysis-fields mt-6">{numeric("days", t.days, t.daysHint)}{numeric("kwh", t.kwh, t.kwhHint)}{numeric("totalNzd", t.total, t.totalHint)}{tax("gst", t.gst)}</div>
              <fieldset className="mt-6"><legend className="field-label">{t.periodTitle}</legend><p className="field-hint">{t.dateHint}</p><div className="analysis-fields mt-3">{(["start", "end"] as const).map((key) => <div key={key}><label className="field-label" htmlFor={`bill-${key}`}>{key === "start" ? t.startDate : t.endDate}</label><input className="analysis-input" id={`bill-${key}`} type="date" value={input[key]} aria-invalid={errors.includes("dates") || undefined} onChange={(e) => setInput((state) => { const next = { ...state, [key]: e.target.value }; const period = billingPeriod(next.start, next.end); return { ...next, fullCalendarMonth: !!period?.exactMonth, ...(period ? { days: String(period.days), month: period.exactMonth ?? "" } : {}) }; })} /></div>)}</div>{dates && <p className="field-hint">{dates.days} {common.daysUnit}{dates.exactMonth ? ` · ${monthLabel(dates.exactMonth)}` : ""}</p>}<div className="analysis-fields mt-5">                <div><label className="field-label" htmlFor="bill-region">{t.region}</label><select className="analysis-input" id="bill-region" value={input.region} onChange={(e) => set("region", e.target.value)}><option value="">{t.chooseRegion}</option>{Object.entries(t.regions).map(([key, name]) => <option key={key} value={key}>{name}</option>)}</select></div>
                <div><label className="field-label" htmlFor="bill-month">{t.month}</label><select className="analysis-input" id="bill-month" disabled={!!dates} value={input.month} onChange={(e) => setInput((s) => ({ ...s, month: e.target.value, fullCalendarMonth: false }))}><option value="">{t.chooseMonth}</option>{availableBenchmarkMonths(regionalBenchmark).map((month) => <option key={month} value={month}>{monthLabel(month)}</option>)}</select><p className="field-hint">{t.monthHint}</p></div>
                <div className="sm:col-span-2">{checkbox("fullCalendarMonth", t.fullMonth)}<p className="field-hint">{t.fullMonthWhy}</p></div>
</div><details className="analysis-disclosure"><summary>{t.approximateTitle}</summary><label className="analysis-check"><input type="checkbox" checked={input.approximate} onChange={(e) => set("approximate", e.target.checked)} />{t.allowApproximate}</label><p className="field-hint">{t.approximateHint}</p></details></fieldset>
              <p className="field-hint">{t.gstNote} <a className="source-link" href="https://www.ird.govt.nz/gst/what-gst-is" rel="noreferrer">{t.gstSource}</a></p>
              <details className="analysis-disclosure mt-6"><summary>{t.optional}</summary><div className="analysis-fields mt-5">
                {(["retailer", "plan"] as const).map((key) => <div key={key}><label className="field-label" htmlFor={`bill-${key}`}>{t[key]}</label><input id={`bill-${key}`} className="analysis-input" value={input[key]} maxLength={80} onChange={(e) => set(key, e.target.value)} aria-describedby="bill-names-hint" /></div>)}
                <p id="bill-names-hint" className="field-hint sm:col-span-2">{t.namesHint}</p>
                <div className="sm:col-span-2"><label className="field-label" htmlFor="bill-meter">{t.meter}</label><select id="bill-meter" className="analysis-input" value={input.meter} onChange={(e) => set("meter", e.target.value)}><option value="unknown">{t.unknown}</option><option value="standard">{t.standardMeter}</option><option value="smart">{t.smartMeter}</option><option value="controlled">{t.controlledMeter}</option><option value="day-night">{t.dayNightMeter}</option></select></div>
                {flatDiagnosticSupported(input) ? <>{numeric("dailyNzd", t.daily, t.dailyExample)}{numeric("usageCents", t.rate, t.rateExample)}{tax("dailyGst", t.dailyGst)}{tax("usageGst", t.rateGst)}<p className="field-hint sm:col-span-2">{t.componentHint}</p></> : <p className="field-hint sm:col-span-2">{t.complexPricingHint}</p>}
                {warnings.length > 0 && <aside className="sm:col-span-2 result-panel" role="status"><h4 className="font-semibold">{t.warningTitle}</h4>{warnings.map((id) => <p className="mt-2 text-sm leading-7" key={id}>{t.unitWarnings[id]}</p>)}</aside>}
                <fieldset className="sm:col-span-2"><legend className="field-label">{t.breakdown}</legend><div className="analysis-fields mt-2">{numeric("peak", t.peak)}{numeric("offPeak", t.offPeak)}{numeric("controlled", t.controlled)}</div><p className="field-hint">{t.breakdownHint}</p></fieldset>
              </div></details>
              <details className="analysis-disclosure"><summary>{t.context}</summary><div className="analysis-fields mt-5">
                {numeric("people", t.people, t.allSizes)}
                <div><label className="field-label" htmlFor="bill-heating">{t.heating}</label><select className="analysis-input" id="bill-heating" value={input.heating} onChange={(e) => set("heating", e.target.value as Inputs["heating"])}><option value="unknown">{t.unknown}</option><option value="heat-pump">{t.heatPump}</option><option value="electric">{t.electric}</option><option value="other">{t.other}</option></select></div>
                <div><label className="field-label" htmlFor="bill-water">{t.hotWater}</label><select className="analysis-input" id="bill-water" value={input.hotWater} onChange={(e) => set("hotWater", e.target.value as Inputs["hotWater"])}><option value="unknown">{t.unknown}</option><option value="electric">{t.electricWater}</option><option value="other">{t.otherWater}</option></select></div>
                <div className="sm:col-span-2 space-y-3">{checkbox("estimatedReading", t.estimated)}{checkbox("timeOfUse", t.tou)}{checkbox("flexible", t.flexible)}{checkbox("olderBulbs", t.bulbs)}{checkbox("representativeYear", t.annual)}<p className="field-hint">{t.annualHint}</p></div>
              </div></details>
              <div className="mt-6 flex flex-wrap items-center gap-6"><button type="submit" className="button-primary">{t.calculate}<Icon name="arrow" className="size-4" /></button><button type="button" className="clear-button" onClick={() => { setInput(initial); setSubmitted(null); setErrors([]); }}>{t.clear}</button></div>
              <p className="field-hint mt-5">{t.icp}</p><noscript><p>{common.noScript}</p></noscript>
            </form>
            <div className="space-y-6" ref={resultsRef} tabIndex={-1} aria-label={t.ready}>
              <div className="analysis-card analysis-results" aria-live="polite" aria-atomic="true">
                <p className="eyebrow">{t.local}</p><h3 className="mt-3 text-xl font-semibold">{result ? t.ready : t.pending}</h3>
                {!result ? <p className="mt-4 leading-7 text-muted">{t.pendingBody}</p> : <>
                  <p className="field-hint">{t.submitted}</p>{distributionResult?.available && distributionResult.centralRange && <a href="#your-usage" className="result-panel mt-4 block text-sm leading-7"><strong>{t.rangePositions[distributionResult.centralRange.position]}</strong><br />{t.yourKwh}: {number(result.kwh, 1)} kWh · {t.mean}: {number(distributionResult.meanKwh, 1)} kWh</a>}
                  <dl className="analysis-metrics mt-6">
                    <div className="metric-wide"><dt>{t.period}</dt><dd>{number(result.kwh, 3)} kWh <span>· {money(Number(result.totalCents) / 100)}</span></dd></div>
                    <div><dt>{t.dailyUsage}</dt><dd data-testid="bill-daily-kwh">{number(result.dailyKwh)}<small>kWh / {t.perDay}</small></dd></div>
                    <div><dt>{t.dailySpend}</dt><dd data-testid="bill-daily-spend">{money(result.dailyNzd)}<small>{t.perDay}</small></dd></div>
                    <div className="metric-wide"><dt>{t.blended}</dt><dd><span data-testid="bill-blended">{result.blendedCentsPerKwh === null ? t.noUsageRate : `${number(result.blendedCentsPerKwh)} ${t.centsKwh}`}</span><p className="field-hint font-normal">{t.blendedHint}</p></dd></div>
                    <div className="metric-wide"><dt>{t.annualKwh}</dt><dd>{number(result.annualisedKwh, 0)} kWh<p className="field-hint font-normal">{t.annualWarning}</p></dd></div>
                    <div className="metric-wide"><dt>{t.annualSpend}</dt><dd>{result.annualNzd !== null ? money(result.annualNzd) : <small>{t.annualSpendUnavailable}</small>}</dd></div>
                  </dl>
                  {result.componentCents !== null && <div className="analysis-subtotal mt-5"><h4 className="font-semibold">{t.components}</h4><p className="mt-2">{money(Number(result.componentCents) / 100)}</p><p className="field-hint">{t.componentDifference}: {money(Number(result.componentDifferenceCents) / 100)}</p><p className="field-hint">{t.componentWarning}</p></div>}
                  {result.usageBreakdown && <div className="analysis-subtotal mt-5"><h4 className="font-semibold">{t.breakdown}</h4><dl className="mt-3 space-y-2 text-sm">{Object.entries(result.usageBreakdown).map(([key, value]) => <div className="flex flex-wrap justify-between gap-2" key={key}><dt>{t[key as "peak" | "offPeak" | "controlled"]}</dt><dd>{number(Number(value), 3)} kWh</dd></div>)}</dl><p className="field-hint">{t.breakdownHint}</p></div>}
                </>}
              </div>
        <section id="your-usage" className="section-anchor" aria-labelledby="usage-heading"><div>
          <p className="eyebrow">02 · {t.source}</p><h2 id="usage-heading" className="section-title mt-3">{t.usage}</h2><p className="mt-4 max-w-2xl leading-7 text-muted">{t.benchmarkExplain}</p>
          <div className="mt-6 space-y-6"><div className="analysis-card" aria-live="polite">
            <h3 className="text-xl font-semibold">{t.benchmarkIntro}</h3>
            {datedComparison?.available && datedComparison.approximate ? <div className="mt-5" data-testid="approximate-comparison"><h4 className="font-semibold">{t.approximateTitle}</h4><p className="mt-3">{t.yourKwh}: {number(Number(submitted!.kwh), 1)} kWh</p><p>{t.mean}: ≈ {number(datedComparison.meanKwh, 1)} kWh</p><p>{number(datedComparison.differencePercent, 1)}%</p><p className="field-hint">{t.approximateHint}</p></div> : benchmark?.available && result ? <>
              <p className="mt-3 text-sm text-muted">{t.regions[submitted!.region as keyof typeof t.regions]} · {submitted!.month}</p>
              <p data-testid="benchmark-difference" className="benchmark-difference mt-6">{number(Math.abs(benchmark.differencePercent), 1)}% <span>{benchmark.differenceKwh > 0 ? t.above : benchmark.differenceKwh < 0 ? t.below : t.equal}</span></p>
              <p className="mt-2 text-sm text-muted">{benchmark.differenceKwh > 0 ? "+" : ""}{number(benchmark.differenceKwh, 1)} kWh</p>
              <div className="mt-7 space-y-5" role="img" aria-label={`${t.yourKwh}: ${number(result.kwh, 1)} kWh. ${t.mean}: ${number(benchmark.meanKwh, 1)} kWh.`}>
                {[[t.yourKwh, result.kwh], [t.mean, benchmark.meanKwh]].map(([label, value], i) => <div key={label}><div className="mb-2 flex flex-wrap justify-between gap-2 text-sm"><span>{label}</span><strong>{number(Number(value), 1)} kWh</strong></div><div className="benchmark-track"><div className={i ? "benchmark-bar benchmark-mean" : "benchmark-bar"} style={{ width: `${Number(value) / Math.max(result.kwh, benchmark.meanKwh) * 100}%` }} /></div></div>)}
              </div><p className="field-hint mt-5">{t.coverage}: {number(benchmark.coveragePercent)}%</p>
            </> : <p className="mt-5 leading-7 text-muted" data-testid="benchmark-requirement">{submitted?.start ? datedComparison?.reason === "missing" ? t.benchmarkMissing : t.approximateHint : periodExplanation}</p>}
            {distributionResult?.available && distributionResult.centralRange && <div className="mt-6 border-t border-line pt-5" data-testid="regional-range"><h4 className="font-semibold">{t.regionalRange}</h4><p className="mt-3">{number(distributionResult.centralRange.p25Kwh, 0)}–{number(distributionResult.centralRange.p75Kwh, 0)} kWh</p><p className="mt-2 font-semibold">{t.rangePositions[distributionResult.centralRange.position]}</p><p className="field-hint">{t.median}: {number(distributionResult.centralRange.medianKwh, 0)} kWh</p><p className="field-hint">{t.rangeExplanation}</p></div>}
            <p className="mt-6 text-sm leading-7 text-muted">{t.benchmarkWarning}</p>
          </div><div>
            <p className="text-sm font-semibold text-green">{t.sourceStatus}</p><p className="mt-4 text-sm leading-7 text-muted">{t.householdUnavailable}</p><p className="field-hint">{t.sampleCount}</p>
            <details className="analysis-disclosure mt-5"><summary>{t.sourceTitle}</summary><div className="space-y-4 pt-4 text-sm leading-7 text-muted">
              <a className="source-link" href={regionalBenchmark.source.reportUrl} rel="noreferrer">{t.source}</a>
              <p>{t.periodLabel}: {regionalBenchmark.source.from} — {regionalBenchmark.source.through}</p><p>{t.collected}: <time dateTime={regionalBenchmark.source.collectedAt}>{regionalBenchmark.source.collectedAt} (UTC)</time></p>
              <p>{t.sourceCaveats}</p><p>{t.attribution} <a className="source-link" href={regionalBenchmark.source.licenceUrl} rel="noreferrer">{t.licence}</a></p><p>{t.checksum}: <code className="break-all text-xs">{regionalBenchmark.source.sourceSha256}</code></p>
            </div></details>
          </div></div>
        </div></section>
              <aside className="analysis-unavailable"><span className="status-label status-planned">{t.comparisonTitle}</span><p className="mt-4 text-sm leading-7">{t.comparisonBody}</p><p className="field-hint mt-3">{t.comparisonGate}</p><p className="field-hint mt-3">{t.comparisonCoverage}</p><p className="mt-4 text-sm leading-7">{t.externalNotice}</p><a className="text-action" href="https://www.billy.govt.nz/" rel="noreferrer">{t.externalBilly}</a></aside>
            </div>
          </div>
        </div></section>
        <section id="saving-tips" className="analysis-section section-anchor" aria-labelledby="tips-heading"><div className="page-width">
          <p className="eyebrow">03 · {t.adviceIntro}</p><h2 id="tips-heading" className="section-title mt-3">{t.tips}</h2><p className="mt-4 max-w-3xl leading-7 text-muted">{t.adviceNote}</p>
          {!submitted && <p className="field-hint mt-3">{t.tipsNeed}</p>}
          <div className="analysis-tips-grid mt-8">{tips.map((id) => <article className="analysis-card" key={id} data-tip={id}><span className="icon-box"><Icon name="leaf" className="size-5" /></span><h3 className="mt-5 text-lg font-semibold">{t.advice[id].title}</h3><p className="mt-3 text-sm leading-7">{t.advice[id].action}</p><p className="mt-4 text-sm leading-7 text-muted"><strong>{t.why}: </strong>{t.advice[id].why}</p><p className="mt-3 text-sm leading-7 text-muted"><strong>{t.condition}: </strong>{t.advice[id].condition}</p><a className="text-action mt-4" href={tipSources[id]} rel="noreferrer">{t.officialAdvice}<Icon name="arrow" className="size-4" /></a></article>)}</div>
        </div></section>
      </main><footer className="border-t border-line py-8"><div className="page-width flex flex-wrap justify-between gap-4 text-sm text-muted"><span>OpenBill · {common.heroNote}</span><a className="source-link" href={locale === "en" ? "/" : "/zh/"}>{t.home}</a></div></footer>
    </>
  );
}
