"use client";

import { useEffect, useRef, useState } from "react";
import { watercare } from "@/data/water/watercare";
import { checkWaterBill, validWaterBillValue, waterBillDate, type WaterBill, type WaterBillField } from "@/domain/water/pdf-bill";
import type { Reading } from "@/domain/water/analysis";
import { languageTags, messages, type Locale } from "@/i18n";
import { waterPdfCopy } from "@/i18n/water-pdf";
import type { PdfIssue } from "@/lib/local-pdf";

const summaryFields = ["amountDue", "currentCharges", "waterAmount", "wastewaterAmount", "fixedAmount", "gst"] as const;
const requiredFields: readonly WaterBillField[] = ["previousDate", "currentDate", "days", "kl", "waterRate", "waterAmount", "wastewaterRate", "wastewaterAmount", "wastewaterPercent", "wastewaterKl", "annualFixedRate", "fixedAmount", "gst", "currentCharges", "amountDue"];
const fieldGroups = {
  dates: ["invoiceDate", "dueDate", "previousDate", "currentDate", "days"],
  water: ["kl", "dailyLitres", "waterRate", "waterAmount"],
  wastewater: ["wastewaterPercent", "wastewaterKl", "wastewaterRate", "wastewaterAmount"],
  fixed: ["annualFixedRate", "fixedAmount"],
  totals: ["gst", "currentCharges", "amountDue"],
} as const satisfies Record<keyof typeof waterPdfCopy.en.groups, readonly WaterBillField[]>;
const groups = Object.keys(fieldGroups) as (keyof typeof fieldGroups)[];
const editableDates = new Set<WaterBillField>(["invoiceDate", "dueDate", "previousDate", "currentDate"]);
const billDateFormat = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const formatBillDate = (date: string) => date ? billDateFormat.format(new Date(date)) : "";
const objectiveSource = "https://www.watercare.co.nz/home/about-us/sustainability-and-community/water-efficiency-plan";

function inspectReview(bill: WaterBill) {
  const analysis = checkWaterBill(bill.values, "1", watercare.reference, watercare.schedules);
  const missing = requiredFields.filter((field) => !validWaterBillValue(field, bill.values[field]));
  const flagged = new Set([...missing, ...bill.uncertain, ...analysis.discrepancies]);
  if (analysis.periodMismatch) for (const field of ["previousDate", "currentDate", "days"] as const) flagged.add(field);
  if (analysis.schedule && analysis.schedule.status !== "matched") flagged.add("currentDate");
  return { flagged, needsReview: flagged.size > 0 || bill.unreadablePage };
}

export function WaterPdfReview({ locale, onManual }: { locale: Locale; onManual: () => void }) {
  const t = waterPdfCopy[locale], manual = messages[locale].water;
  const [bill, setBill] = useState<WaterBill | null>(null);
  const [status, setStatus] = useState<PdfIssue | "loading" | null>(null);
  const [occupants, setOccupants] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [occupantsInvalid, setOccupantsInvalid] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<Partial<Record<WaterBillField, string>>>({});
  const active = useRef<AbortController | null>(null);
  const preview = useRef<HTMLHeadingElement>(null);
  const summary = useRef<HTMLHeadingElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const requestedField = useRef<WaterBillField | null>(null);
  const present = bill !== null;
  const number = new Intl.NumberFormat(languageTags[locale], { maximumFractionDigits: 2 });
  const volume = new Intl.NumberFormat(languageTags[locale], { maximumFractionDigits: 3 });
  const money = new Intl.NumberFormat(languageTags[locale], { style: "currency", currency: "NZD", currencyDisplay: "code" });
  const analysis = bill ? checkWaterBill(bill.values, occupants, watercare.reference, watercare.schedules) : null;
  const review = bill ? inspectReview(bill) : null;
  const usage = analysis?.usage.ok ? analysis.usage : null;
  const result = submitted && usage ? analysis : null;

  useEffect(() => () => active.current?.abort(), []);
  useEffect(() => { if (present) preview.current?.focus(); }, [present]);
  useEffect(() => { if (submitted) summary.current?.focus(); }, [submitted]);
  useEffect(() => {
    if (detailsOpen && requestedField.current) {
      document.getElementById("water-pdf-" + requestedField.current)?.focus();
      requestedField.current = null;
    }
  }, [detailsOpen]);

  function clear() {
    active.current?.abort();
    setBill(null);
    setStatus(null);
    setOccupants("");
    setSubmitted(false);
    setOccupantsInvalid(false);
    setDetailsOpen(false);
    setDateDrafts({});
    requestedField.current = null;
  }

  async function load(file: File) {
    clear();
    const controller = new AbortController();
    active.current = controller;
    setStatus("loading");
    try {
      const { readWatercarePdf } = await import("@/lib/water-pdf");
      const result = await readWatercarePdf(file, controller.signal);
      if (controller.signal.aborted) return;
      if ("issue" in result) setStatus(result.issue);
      else {
        setBill(result.bill);
        setDetailsOpen(inspectReview(result.bill).needsReview);
        setStatus(null);
      }
    } catch {
      if (!controller.signal.aborted) setStatus("invalid");
    }
  }

  function update(field: WaterBillField, value: string) {
    setBill((prior) => prior && ({ ...prior, values: { ...prior.values, [field]: value },
      uncertain: validWaterBillValue(field, value) ? prior.uncertain.filter((entry) => entry !== field) : prior.uncertain }));
    setSubmitted(false);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!analysis || !analysis.usage.ok) {
      const invalid = analysis?.usage.ok === false ? analysis.usage.invalid : "occupants";
      setOccupantsInvalid(invalid === "occupants");
      if (invalid === "occupants") document.getElementById("water-pdf-occupants")?.focus();
      else {
        const field = invalid === "volume" ? "kl" : "days";
        if (detailsOpen) document.getElementById("water-pdf-" + field)?.focus();
        else { requestedField.current = field; setDetailsOpen(true); }
      }
      return;
    }
    setDetailsOpen(!!review?.needsReview);
    setSubmitted(true);
  }

  const estimate = analysis?.estimate;
  const estimates = estimate && { waterAmount: estimate.water, wastewaterAmount: estimate.wastewater, fixedAmount: estimate.fixed, gst: estimate.gst, currentCharges: estimate.total };
  const booked = (field: WaterBillField) => !!bill && !bill.uncertain.includes(field) && validWaterBillValue(field, bill.values[field]);
  const formatted = (field: WaterBillField, asMoney = false) => booked(field)
    ? (asMoney ? money : number).format(Number(bill!.values[field]))
    : t.notAvailable;
  const complete = !!estimate && !review?.needsReview;
  const daily = booked("days") && booked("kl") ? number.format(Number(bill!.values.kl) * 1000 / Number(bill!.values.days)) + " L" : t.notAvailable;

  return <section aria-label={t.start} className="analysis-card mb-6">
    {!bill && <p className="text-sm leading-6 text-muted">{t.intro}</p>}
    <div className="mt-3 flex flex-wrap items-end gap-3">
      <div className="min-w-0"><label htmlFor="water-pdf-file" className="field-label">{t.file}</label>
        <input ref={input} id="water-pdf-file" type="file" accept=".pdf,application/pdf" className="analysis-input max-w-full"
          onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; if (file) void load(file); }} /></div>
      {(status || bill) && <button type="button" className="clear-button" onClick={() => { clear(); input.current?.focus(); }}>{t.reset}</button>}
    </div>
    {status === "loading" && <p role="status" className="mt-3 text-sm">{t.loading}</p>}
    {status && status !== "loading" && <div className="mt-3"><p role="alert" className="field-error">{t.errors[status]}</p>
      <button type="button" className="text-action mt-2" onClick={onManual}>{t.fallback}</button></div>}
    {result && bill && usage && <section className="result-panel mt-5" aria-labelledby="water-pdf-results">
      <h3 ref={summary} tabIndex={-1} id="water-pdf-results" className="text-xl font-semibold">{t.results}</h3>
      <h4 className="mt-4 font-semibold">{t.charges}</h4>
      <dl className="analysis-metrics mt-2">
        {summaryFields.map((field) => <div key={field}><dt>{t.fields[field]}</dt><dd>{formatted(field, true)}
          {field === "amountDue" && booked("dueDate") && <small>{t.fields.dueDate} <time dateTime={bill.values.dueDate}>{formatBillDate(bill.values.dueDate)}</time></small>}</dd></div>)}
      </dl>
      <p className="mt-3 text-sm">{t.currentVsDue} {t.gstInclusive}</p>
      <p className="mt-2 text-sm font-semibold" data-testid="water-pdf-verification">{result.periodMismatch ? t.periodMismatch : result.discrepancies.length ? t.differs : complete ? t.reconciles : t.incomplete}</p>
      <h4 className="mt-5 font-semibold">{t.usage}</h4>
      <dl className="analysis-metrics my-3">
        <div><dt>{t.householdDaily}</dt><dd>{number.format(usage.householdDaily)}</dd></div>
        <div><dt>{t.personDaily}</dt><dd>{number.format(usage.personDaily)}</dd></div>
      </dl>
      {result.efficiency && <p className="font-semibold">{t[result.efficiency]}</p>}
      <ul className="my-2 list-disc pl-5 text-sm leading-6">
        <li><a className="text-action" href={objectiveSource}>{t.objective}</a></li>
        <li><a className="text-action" href={watercare.sources.faq}>{t.typical}</a></li>
        {bill.historicalBenchmark && <li>{t.historical}</li>}
      </ul>
      <p className="text-sm">{t.guidance} {t.waterUnit}</p>
      {bill.reading !== "unknown" && <p className="mt-2 text-sm">{bill.reading === "actual" ? manual.actualNote : manual.estimatedNote}</p>}
      <h4 className="mt-5 font-semibold">{t.tips}</h4>
      <ul className="mt-2 list-disc pl-5 text-sm leading-6">{t.actions.map((tip) => <li key={tip}>{tip}</li>)}</ul>
      <div className="mt-2 flex flex-wrap gap-4 text-sm"><a className="text-action" href={watercare.sources.saving}>{t.saving}</a><a className="text-action" href={watercare.sources.leaks}>{t.leaks}</a></div>
      <details className="analysis-disclosure mt-4">
        <summary>{t.verification}</summary>
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t.verification}><table className="mt-2 w-full text-sm">
          <thead><tr><th className="py-1 text-left" scope="col">{t.field} ({t.unit})</th><th className="px-2 text-right" scope="col">{t.billed}</th><th className="text-right" scope="col">{t.calculated}</th></tr></thead>
          <tbody>{summaryFields.map((field) => <tr key={field} className="border-t border-slate-200"><th scope="row" className="py-1 text-left font-medium">{t.fields[field]}</th>
            <td className="px-2 text-right">{formatted(field, true)}</td>
            <td className="text-right">{estimates && field !== "amountDue" ? money.format(estimates[field]) : "—"}</td></tr>)}</tbody>
        </table></div>
        {result.discrepancies.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{result.discrepancies.map((field) => <li key={field}>{t.fields[field]}</li>)}</ul>}
        {result.schedule?.status === "matched" ? <a className="text-action mt-2 text-sm" href={result.schedule.schedule.url}>{t.schedule}</a> : <p className="mt-2 text-sm">{t.scheduleUnavailable}</p>}
        <p className="mt-3 text-sm">{t.wastewaterExplain} {t.fixedExplain}</p>
      </details>
    </section>}
    {bill && <form className="mt-5" aria-label={t.preview} onSubmit={submit} autoComplete="off" noValidate>
      {!result && <section className="result-panel" aria-labelledby="water-pdf-preview">
        <h3 ref={preview} tabIndex={-1} id="water-pdf-preview" className="text-xl font-semibold">{t.preview}</h3>
        <p className="mt-2 text-sm font-medium text-green" role="status">{t.extracted}</p>
        <dl className="analysis-metrics mt-3">
          <div><dt>{t.fields.amountDue}</dt><dd>{formatted("amountDue", true)}</dd></div>
          <div><dt>{t.fields.currentCharges}</dt><dd>{formatted("currentCharges", true)}</dd></div>
          <div><dt>{t.fields.kl}</dt><dd>{booked("kl") ? volume.format(Number(bill.values.kl)) + " kL" : t.notAvailable}</dd></div>
          <div><dt>{t.fields.days}</dt><dd>{formatted("days")}</dd></div>
          <div><dt>{t.householdDaily}</dt><dd>{daily}</dd></div>
        </dl>
      </section>}
      <div className="my-4 max-w-xs">
        <label htmlFor="water-pdf-occupants" className="field-label">{t.occupants}</label>
        <input id="water-pdf-occupants" inputMode="numeric" maxLength={8} className="analysis-input" value={occupants}
          aria-invalid={occupantsInvalid} aria-describedby={occupantsInvalid ? "water-pdf-occupants-error" : undefined}
          onChange={(event) => { setOccupants(event.target.value); setSubmitted(false); setOccupantsInvalid(false); }} />
        {occupantsInvalid && <p id="water-pdf-occupants-error" role="alert" className="field-error">{t.invalid}</p>}
      </div>
      {review?.needsReview && <p className="mb-2 text-sm font-semibold" role="status">{t.reviewNotice}</p>}
      <details className="analysis-disclosure" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
        <summary>{t.review}</summary>
        <p className="my-2 text-sm">{t.reviewHint} {t.gstInclusive}</p>
        {bill.unreadablePage && <p className="mt-2 text-sm">{t.unreadable}</p>}
        {groups.map((group) => <fieldset key={group} className="mt-4 border-t border-slate-200 pt-3">
          <legend className="pr-2 text-sm font-semibold">{t.groups[group]}</legend>
          <div className="analysis-fields">
            {fieldGroups[group].map((field) => {
              const id = "water-pdf-" + field, value = bill.values[field];
              const date = editableDates.has(field), shown = date ? dateDrafts[field] ?? formatBillDate(value) : value;
              const dateHint = date && !booked(field) ? t.dateFormat : "";
              const notice = bill.uncertain.includes(field) ? t.uncertain
                : !shown ? t.missing
                : !booked(field) ? t.invalid
                : review?.flagged.has(field) ? (analysis?.periodMismatch && ["previousDate", "currentDate", "days"].includes(field) ? t.periodMismatch : t.differs) : "";
              return <div key={field}><label htmlFor={id} className="field-label">{t.fields[field]}</label>
                <input id={id} type="text" inputMode={date ? undefined : "decimal"} maxLength={date ? 24 : 16}
                  className="analysis-input" value={shown}
                  aria-describedby={notice || dateHint ? id + "-hint" : undefined} aria-invalid={!!notice && (notice !== t.missing || requiredFields.includes(field))}
                  onChange={(event) => {
                    const next = event.target.value;
                    if (date) setDateDrafts((prior) => ({ ...prior, [field]: next }));
                    update(field, date ? waterBillDate(next) ?? "" : next);
                  }}
                  onBlur={date ? () => { if (value) setDateDrafts((prior) => ({ ...prior, [field]: undefined })); } : undefined} />
                {(notice || dateHint) && <p id={id + "-hint"} className="field-hint">{[notice, dateHint].filter(Boolean).join(" ")}</p>}</div>;
            })}
            {group === "dates" && <div><label htmlFor="water-pdf-reading" className="field-label">{t.reading}</label>
              <select id="water-pdf-reading" className="analysis-input" value={bill.reading}
                onChange={(event) => { setBill({ ...bill, reading: event.target.value as Reading }); setSubmitted(false); }}>
                <option value="unknown">{manual.unknownReading}</option><option value="actual">{manual.actual}</option><option value="estimated">{manual.estimated}</option>
              </select></div>}
          </div>
        </fieldset>)}
      </details>
      <button type="submit" className="button-primary mt-4">{t.confirm}</button>
    </form>}
  </section>;
}
