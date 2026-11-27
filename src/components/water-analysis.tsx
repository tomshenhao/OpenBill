"use client";

import { useEffect, useState, type FormEvent } from "react";
import { watercare } from "@/data/water/watercare";
import { assessWaterUsage, estimateWaterCharges, findWaterSchedule, type Connection, type Reading, type WaterRates, type WaterUsage } from "@/domain/water/analysis";
import { languageTags, messages, type Locale } from "@/i18n";
import { Icon } from "./icon";
import { WaterPdfReview } from "./water-pdf-review";
import { waterPdfCopy } from "@/i18n/water-pdf";

const emptyUsage: WaterUsage = { occupants: "", volume: "", unit: "kL", days: "" };
const emptyRates: WaterRates = { water: "", wastewater: "", annual: "" };
type ErrorKey = keyof typeof messages.en.water.errors;
type Issue = { field: string; key: ErrorKey };
type Estimate = Extract<ReturnType<typeof estimateWaterCharges>, { ok: true }>;

function WaterField({ id, label, value, update, error, hint, mode = "decimal" }: {
  id: string; label: string; value: string; update: (value: string) => void; error?: string;
  hint?: string; mode?: "decimal" | "numeric" | "date";
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <input id={id} type={mode === "date" ? "date" : "text"} inputMode={mode === "date" ? undefined : mode}
        className="analysis-input" value={value} onChange={(event) => update(event.target.value)}
        maxLength={mode === "date" ? undefined : 16} spellCheck={false}
        aria-invalid={Boolean(error)} aria-describedby={[hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined} />
      {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

export function WaterAnalysis({ locale }: { locale: Locale }) {
  const t = messages[locale].water;
  const pdf = waterPdfCopy[locale];
  const [mode, setMode] = useState<"pdf" | "manual">("pdf");
  useEffect(() => { if (mode === "manual") document.getElementById("water-occupants")?.focus(); }, [mode]);
  const [usage, setUsage] = useState(emptyUsage);
  const [assessed, setAssessed] = useState(false);
  const [usageIssue, setUsageIssue] = useState<Issue | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [reading, setReading] = useState<Reading>("unknown");
  const [context, setContext] = useState({ garden: false, pool: false, guests: false });
  const [billOpen, setBillOpen] = useState(false);
  const [date, setDate] = useState("");
  const [connection, setConnection] = useState<Connection>("unknown");
  const [rates, setRates] = useState(emptyRates);
  const [billTotal, setBillTotal] = useState("");
  const [billIssue, setBillIssue] = useState<Issue | null>(null);
  const [estimate, setEstimate] = useState<Estimate | null>(null);
  const usageResult = assessWaterUsage(usage, watercare.reference);
  const result = assessed && usageResult.ok ? usageResult : null;
  const match = result ? findWaterSchedule(watercare.schedules, date, result.days) : null;
  const percent = connection === "apartment" ? watercare.billing.apartmentWastewaterPercent : watercare.billing.standardWastewaterPercent;
  const supportsConnection = connection === "standard" || connection === "apartment";
  const number = new Intl.NumberFormat(languageTags[locale], { maximumFractionDigits: 2 });
  const money = new Intl.NumberFormat(languageTags[locale], { style: "currency", currency: "NZD", currencyDisplay: "code" });
  const formatRange = (lower: number, upper: number) => `${number.format(lower)}–${number.format(upper)}`;
  const readingNote = reading === "estimated" ? t.estimatedNote : reading === "actual" ? t.actualNote : null;
  const errorFor = (issue: Issue | null, field: string) => issue?.field === field ? t.errors[issue.key] : undefined;
  const tipOrder: readonly ("leak" | "outdoor" | "shower" | "toilet" | "laundry" | "dishwasher")[] = context.garden
    ? ["leak", "outdoor", "shower", "toilet", "laundry", "dishwasher"] as const
    : ["leak", "shower", "toilet", "laundry", "dishwasher", "outdoor"] as const;
  const tipLinks = { leak: [t.leakSource, watercare.sources.leaks], outdoor: [t.gardenSource, watercare.sources.garden] };

  function resetEstimate() {
    setBillIssue(null);
    setEstimate(null);
  }

  function updateUsage<K extends keyof WaterUsage>(field: K, value: WaterUsage[K]) {
    setUsage({ ...usage, [field]: value });
    setAssessed(false);
    setUsageIssue(null);
    resetEstimate();
  }

  function assess(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!usageResult.ok) {
      setUsageIssue({ field: usageResult.invalid, key: usageResult.invalid });
      document.getElementById(`water-${usageResult.invalid}`)?.focus();
      return;
    }
    setAssessed(true);
  }

  function clear() {
    setUsage(emptyUsage);
    setAssessed(false);
    setUsageIssue(null);
    setContextOpen(false);
    setReading("unknown");
    setContext({ garden: false, pool: false, guests: false });
    setBillOpen(false);
    setDate("");
    setConnection("unknown");
    setRates(emptyRates);
    setBillTotal("");
    resetEstimate();
    document.getElementById("water-occupants")?.focus();
  }

  function checkBill(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!result || match?.status !== "matched" || !supportsConnection) return;
    const next = estimateWaterCharges({
      millilitres: result.millilitres, days: result.days, scheduleDays: match.scheduleDays,
      rates, billTotal, wastewaterPercent: percent, gstPercent: watercare.billing.gstPercent,
    });
    if (!next.ok) {
      setBillIssue({ field: next.invalid, key: next.invalid === "billTotal" ? "billTotal" : "rate" });
      document.getElementById(`water-bill-${next.invalid}`)?.focus();
      return;
    }
    setBillIssue(null);
    setEstimate(next);
  }

  return (
    <>
      <main id="water-main" tabIndex={-1} className="page-width pb-16">
        <div className="analysis-hero">
          <div>
            <p className="eyebrow">{t.region}</p>
            <h1 className="hero-title mt-3">{t.title}</h1>
            <p className="mt-4 max-w-xl leading-7 text-muted">{t.intro}</p>
          </div>
          <p className="analysis-privacy flex items-start gap-3 text-sm leading-6" id="water-privacy">
            <Icon name="shield" className="mt-1 size-5 shrink-0" />{t.privacy}
          </p>
        </div>
        <div role="group" aria-label={pdf.entryMode} className="mb-4 flex flex-wrap gap-3">
          <button type="button" aria-pressed={mode === "pdf"} className={mode === "pdf" ? "button-primary" : "button-primary bill-method-manual"} onClick={() => setMode("pdf")}>{pdf.start}</button>
          <button type="button" aria-pressed={mode === "manual"} className={mode === "manual" ? "button-primary" : "button-primary bill-method-manual"} onClick={() => setMode("manual")}>{pdf.manualMode}</button>
        </div>
        {mode === "pdf" ? <WaterPdfReview locale={locale} onManual={() => setMode("manual")} /> : <>
        <section aria-labelledby="water-assessment" className="analysis-card">
          <h2 id="water-assessment" className="section-title">{t.assessment}</h2>
          <p id="water-instructions" className="mt-3 text-sm leading-6 text-muted">{t.inputIntro}</p>
          <form onSubmit={assess} noValidate autoComplete="off" aria-labelledby="water-assessment" aria-describedby="water-instructions water-privacy">
            <div className="analysis-fields mt-5">
              <WaterField id="water-occupants" label={t.occupants} value={usage.occupants} mode="numeric" update={(value) => updateUsage("occupants", value)} error={errorFor(usageIssue, "occupants")} />
              <WaterField id="water-days" label={t.days} value={usage.days} mode="numeric" update={(value) => updateUsage("days", value)} error={errorFor(usageIssue, "days")} />
              <WaterField id="water-volume" label={t.volume} value={usage.volume} update={(value) => updateUsage("volume", value)} error={errorFor(usageIssue, "volume")} />
              <div>
                <label htmlFor="water-unit" className="field-label">{t.unit}</label>
                <select id="water-unit" className="analysis-input" value={usage.unit} onChange={(event) => updateUsage("unit", event.target.value as WaterUsage["unit"])}>
                  <option value="kL">{t.kL}</option><option value="L">{t.L}</option>
                </select>
              </div>
            </div>
            <details className="analysis-disclosure mt-5" open={contextOpen} onToggle={(event) => setContextOpen(event.currentTarget.open)}>
              <summary>{t.context}</summary>
              <div className="mt-2 max-w-sm">
                <label htmlFor="water-reading" className="field-label">{t.reading}</label>
                <select id="water-reading" className="analysis-input" value={reading} onChange={(event) => setReading(event.target.value as Reading)}>
                  <option value="unknown">{t.unknownReading}</option><option value="actual">{t.actual}</option><option value="estimated">{t.estimated}</option>
                </select>
              </div>
              {(["garden", "pool", "guests"] as const).map((key) => (
                <label key={key} className="analysis-check mt-2">
                  <input type="checkbox" checked={context[key]} onChange={(event) => setContext({ ...context, [key]: event.target.checked })} />
                  {t[key]}
                </label>
              ))}
            </details>
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" className="button-primary">{t.calculate}<Icon name="arrow" className="size-4" /></button>
              <button type="button" className="clear-button" onClick={clear}>{t.clear}</button>
            </div>
          </form>
          <div role="status" aria-live="polite" aria-atomic="true">
            {result && (
              <div className="mt-6 rounded-xl border border-slate-300 bg-slate-50 p-5 leading-6">
                <h3 className={`flex items-center gap-2 text-lg font-semibold ${result.comparison === "above" ? "text-[#982d29]" : "text-green"}`}>
                  <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-current" />
                  {t[result.comparison]}
                </h3>
                <dl className="analysis-metrics my-4">
                  <div><dt>{t.perPerson}</dt><dd>{number.format(result.personDaily)}</dd></div>
                  <div><dt>{t.perHousehold}</dt><dd>{number.format(result.householdDaily)}</dd></div>
                </dl>
                <p className="text-sm">{t.generalRange(formatRange(watercare.reference.lowerLitres, watercare.reference.upperLitres))} {t.householdRange(formatRange(result.householdLower, result.householdUpper))}</p>
                <p className="mt-2 text-sm">{t.limitation}</p>
                {readingNote && <p className="mt-2 text-sm font-semibold">{readingNote}</p>}
                <a href={watercare.sources.faq} className="text-action mt-3 text-sm">{t.referenceSource}</a>
              </div>
            )}
          </div>
        </section>
        <section aria-labelledby="water-tips" className="mt-12">
          <h2 id="water-tips" className="section-title">{t.tips}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t.tipIntro}</p>
          {context.pool && <p className="mt-2 text-sm">{t.poolTip}</p>}
          {context.guests && <p className="mt-2 text-sm">{t.guestsTip}</p>}
          <ul className="analysis-tips-grid mt-5">
            {tipOrder.map((key) => {
              const link = key === "leak" || key === "outdoor" ? tipLinks[key] : null;
              return (
                <li key={key} className="analysis-card">
                  <h3 className="font-semibold">{t[`${key}Title`]}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted">{t[key]}</p>
                  {link && <a href={link[1]} className="text-action mt-2 text-sm">{link[0]}</a>}
                </li>
              );
            })}
          </ul>
          <a href={watercare.sources.saving} className="text-action mt-4 text-sm">{t.savingSource}</a>
        </section>
        <section aria-labelledby="water-check-heading" className="analysis-card mt-12">
          <details open={billOpen} onToggle={(event) => setBillOpen(event.currentTarget.open)}>
            <summary className="cursor-pointer">
              <h2 id="water-check-heading" className="inline text-xl font-semibold">{t.bill}</h2>
            </summary>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t.billIntro}</p>
            {!result ? <p className="mt-3 text-sm">{t.billNeedsUsage}</p> : (
              <form onSubmit={checkBill} autoComplete="off" noValidate aria-labelledby="water-check-heading" className="mt-4">
                <WaterField id="water-bill-date" label={t.date} value={date} mode="date" hint={t.dateHint}
                  update={(value) => { setDate(value); setRates(emptyRates); resetEstimate(); }} />
                {match?.status === "invalid" && date && <p className="field-error" role="status">{t.errors.date}</p>}
                {(match?.status === "split" || match?.status === "unavailable") && (
                  <div className="mt-3 text-sm" role="status">
                    <p>{t.errors[match.status]}</p>
                    <a href={watercare.sources.charges} className="text-action mt-2">{t.scheduleList}</a>
                  </div>
                )}
                {match?.status === "matched" && (
                  <>
                    <a href={match.schedule.url} target="_blank" rel="noreferrer" className="text-action my-4 text-sm">{t.schedule}</a>
                    <label htmlFor="water-connection" className="field-label">{t.connection}</label>
                    <select id="water-connection" className="analysis-input" value={connection} aria-describedby="water-exceptions"
                      onChange={(event) => { setConnection(event.target.value as Connection); resetEstimate(); }}>
                      <option value="unknown">{t.unknownConnection}</option><option value="standard">{t.standard}</option>
                      <option value="apartment">{t.apartment}</option><option value="other">{t.other}</option>
                    </select>
                    <p id="water-exceptions" className="field-hint">{t.exceptions}</p>
                    {supportsConnection && (
                      <>
                        <div className="analysis-fields mt-5">
                          {(["water", "wastewater", "annual"] as const).map((key) => (
                            <WaterField key={key} id={`water-bill-${key}`} label={t[key]} value={rates[key]}
                              update={(value) => { setRates({ ...rates, [key]: value }); resetEstimate(); }} error={errorFor(billIssue, key)} />
                          ))}
                          <WaterField id="water-bill-billTotal" label={t.billTotal} value={billTotal} hint={t.billHint}
                            update={(value) => { setBillTotal(value); resetEstimate(); }} error={errorFor(billIssue, "billTotal")} />
                        </div>
                        <button type="submit" className="button-primary mt-5">{t.check}</button>
                      </>
                    )}
                  </>
                )}
              </form>
            )}
            <div role="status" aria-live="polite" aria-atomic="true">
              {estimate && (
                <div className="mt-5 rounded-xl border border-slate-300 bg-slate-50 p-5">
                  <dl className="analysis-metrics">
                    <div><dt>{t.waterCost}</dt><dd>{money.format(estimate.water)}</dd></div>
                    <div><dt>{t.wastewaterCost}</dt><dd>{money.format(estimate.wastewater)}<small>{t.wastewaterVolume(number.format(estimate.wastewaterKl), number.format(percent))}</small></dd></div>
                    <div><dt>{t.fixedCost}</dt><dd>{money.format(estimate.fixed)}</dd></div>
                    <div><dt>{t.total}</dt><dd>{money.format(estimate.total)}</dd></div>
                    <div><dt>{t.gst}</dt><dd>{money.format(estimate.gst)}</dd></div>
                    {estimate.difference !== null && <div><dt>{t.difference}</dt><dd>{money.format(estimate.difference)}</dd></div>}
                  </dl>
                  <p className="mt-4 text-sm leading-6">{t.estimateNote}</p>
                  {readingNote && <p className="mt-2 text-sm font-semibold">{readingNote}</p>}
                </div>
              )}
            </div>
          </details>
        </section>
        </>}
      </main>
    </>
  );
}
