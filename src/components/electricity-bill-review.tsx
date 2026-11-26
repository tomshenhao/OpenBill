"use client";

import { useEffect, useId, useRef, useState } from "react";
import { messages, type Locale } from "@/i18n";
import { analyseBill, amountInput, kwhInput, kwhToMilli } from "@/domain/electricity/bill";
import { electricitySavingScenarios, reviewElectricityBill, validBillDays, validUsageRate, type Adjustment, type AdjustmentKind, type BillCharges, type PropertyUse, type TaxBasis, type UsageCharge, type UsageKind } from "@/domain/electricity/bill-review";
import { isPrintedAmountIssue, printedElectricityConflicts, type ElectricityExtraction } from "@/domain/electricity/bill-extraction";
import { decimalSchema } from "@/domain/electricity/tariff";
import type { PdfDiagnostics, PdfIssue } from "@/lib/electricity-pdf";
import { SupplierComparison } from "./supplier-comparison";

type BillMethod = "manual" | "pdf";
type BillReviewFields = {
  days: string;
  kwh: string;
  dailyNzd: string;
  usageCents: string;
  totalNzd: string;
  gst: TaxBasis;
  dailyGst: TaxBasis;
  usageGst: TaxBasis | "";
};

const blankBill: BillReviewFields = {
  days: "", kwh: "", dailyNzd: "", usageCents: "", totalNzd: "",
  gst: "inclusive", dailyGst: "inclusive", usageGst: "",
};

const blankUsage: UsageCharge = { kind: "standard", kwh: "", cents: "" };
const blankAdjustment: Adjustment = { kind: "fee", amount: "" };

function DecimalField({ label, value, onChange, id }: { label: string; value: string; onChange: (value: string) => void; id?: string }) {
  return <label className="field-label">{label}<input id={id} className="analysis-input" type="text" autoComplete="off" inputMode="decimal" maxLength={16} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function TaxField({ locale, label, value, onChange, inherit, id }: { locale: Locale; label: string; value: TaxBasis | ""; onChange: (value: TaxBasis | "") => void; inherit?: boolean; id?: string }) {
  const { analysis, electricityReview: t } = messages[locale];
  const generatedId = useId();
  const selectId = id ?? generatedId;
  return <div><label className="field-label" htmlFor={selectId}>{label}</label><select id={selectId} className="analysis-input" value={value} onChange={(event) => onChange(event.target.value as TaxBasis | "")}>
    <option value="">{inherit ? t.sameTax : t.selectTax}</option><option value="inclusive">{analysis.inclusive}</option><option value="exclusive">{analysis.exclusive}</option>
  </select></div>;
}

function Adjustments({ locale, rows, onChange }: { locale: Locale; rows: Adjustment[]; onChange: (rows: Adjustment[]) => void }) {
  const t = messages[locale].electricityReview;
  function update(index: number, patch: Partial<Adjustment>) {
    onChange(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  }
  return <div className="mt-4 space-y-3">
    {rows.map((row, index) => <fieldset key={index} className="analysis-fields rounded-xl border border-line p-3">
      <legend className="field-label">{t.adjustment} {index + 1}</legend>
      <label className="field-label">{t.adjustment}<select className="analysis-input" value={row.kind} onChange={(event) => update(index, { kind: event.target.value as AdjustmentKind })}>
        {(Object.keys(t.adjustmentKinds) as AdjustmentKind[]).map((kind) => <option key={kind} value={kind}>{t.adjustmentKinds[kind]}</option>)}
      </select></label>
      <DecimalField label={t.amount} value={row.amount} onChange={(amount) => update(index, { amount })} />
      {row.kind !== "gstAdd" && row.kind !== "gstCredit" && <TaxField locale={locale} label={t.lineTax} value={row.gst ?? ""} inherit={!row.requiresGst} onChange={(gst) => update(index, { gst: gst || undefined })} />}
      <button className="text-action self-end" type="button" onClick={() => onChange(rows.filter((_, i) => i !== index))}>{t.remove}</button>
    </fieldset>)}
    <button className="text-action" type="button" onClick={() => onChange([...rows, { ...blankAdjustment }])}>{t.addAdjustment}</button>
    {rows.length > 0 && <p className="field-hint">{t.adjustmentHint}</p>}
  </div>;
}

function MoneyRows({ rows }: { rows: readonly [string, string | undefined][] }) {
  return <dl className="mt-4 divide-y divide-line">{rows.map(([label, value]) => value !== undefined && <div key={label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 py-2">
    <dt className="text-sm text-muted">{label}</dt><dd className="font-semibold [overflow-wrap:anywhere]">{value}</dd>
  </div>)}</dl>;
}

function AlternativeRates({ locale, input, current, money }: { locale: Locale; input: BillCharges; current: bigint | null; money: (value: number | bigint) => string }) {
  const { analysis: a, electricityReview: t } = messages[locale];
  const [fixed, setFixed] = useState(""), [gst, setGst] = useState<TaxBasis | "">(""), [rates, setRates] = useState<Record<string, string>>({}), [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const usage = input.usage.map(({ kind, kwh }, i) => ({ kind, kwh, cents: rates[`${kind}/${i}`] ?? "" }));
  const alternative = reviewElectricityBill({ ...input, dailyNzd: fixed, fixedDays: undefined, gst, fixedGst: undefined, usage, adjustments, totalNzd: "" }).charges;

  return <details className="analysis-disclosure mt-6">
    <summary>{t.quote}</summary>
    <p className="field-hint mt-4">{t.quoteHint}</p>
    <div className="analysis-fields mt-5">
      <DecimalField label={a.daily} value={fixed} onChange={setFixed} />
      <TaxField locale={locale} label={a.rateGst} value={gst} onChange={setGst} />
      {usage.map(({ kind, kwh, cents }, i) => <DecimalField key={`${kind}/${i}`} label={usage.length === 1 ? a.rate : `${t.usageKinds[kind]} · ${kwh} kWh · ${a.rate}`} value={cents} onChange={(value) => setRates((previous) => ({ ...previous, [`${kind}/${i}`]: value }))} />)}
    </div>
    <Adjustments locale={locale} rows={adjustments} onChange={setAdjustments} />
    <div aria-live="polite">
      {alternative ? <MoneyRows rows={[
        [t.quoteTotal, money(alternative.totalCents)],
        [t.quoteBaseline, current === null ? undefined : money(current)],
        [t.quoteDifference, current === null ? undefined : money(alternative.totalCents - current)],
      ]} /> : <p className="field-hint mt-3">{t.quoteMissing}</p>}
    </div>
  </details>;
}

export function ElectricityBillReview({ locale }: { locale: Locale }) {
  const { analysis: a, electricityReview: t } = messages[locale];
  const [method, setMethod] = useState<BillMethod | null>(null);
  const [values, setValues] = useState(blankBill);
  const [property, setProperty] = useState<PropertyUse>("unspecified");
  const [extracted, setExtracted] = useState<ElectricityExtraction | null>(null);
  const [pdfStatus, setPdfStatus] = useState<PdfIssue | "busy" | null>(null);
  const [diagnostics, setDiagnostics] = useState<PdfDiagnostics | null>(null);
  const [fixedDays, setFixedDays] = useState(""), [usage, setUsage] = useState<UsageCharge[] | null>(null);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [draftVersion, setDraftVersion] = useState(0);
  const activeRead = useRef<AbortController | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const manualChoiceRef = useRef<HTMLButtonElement>(null);
  const propertyId = useId();
  useEffect(() => () => activeRead.current?.abort(), []);
  useEffect(() => { if (extracted) resultRef.current?.focus(); }, [extracted]);
  const onChange = (patch: Partial<BillReviewFields>) => setValues((previous) => ({ ...previous, ...patch }));
  const money = (cents: number | bigint) => new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-Hans-NZ", { style: "currency", currency: "NZD" }).format(Number(cents) / 100);
  const number = (value: number, digits = 2) => new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-Hans-NZ", { maximumFractionDigits: digits }).format(value);
  const totalNzd = values.gst === "exclusive" && amountInput.safeParse(values.totalNzd).success
    ? (Number(analyseBill({ representativeYear: false, days: "1", kwh: "0", totalNzd: values.totalNzd, gst: "exclusive" }).totalCents) / 100).toFixed(2)
    : values.totalNzd;
  const charges: BillCharges = {
    ...values, totalNzd, fixedDays, gst: values.usageGst, fixedGst: values.dailyGst,
    usage: usage ?? [{ kind: "standard", kwh: values.kwh, cents: values.usageCents }],
    adjustments,
  };
  const source = method === "pdf" ? extracted : null;
  const result = reviewElectricityBill(charges);
  const pdfIssues = source?.issues.filter((issue) => {
    switch (issue) {
      case "days": return result.days === null;
      case "fixedDays": return !validBillDays(fixedDays || values.days);
      case "usage": return result.kwh === null || charges.usage.some((line) => !kwhInput.safeParse(line.kwh).success) ||
        charges.usage.reduce((sum, line) => sum + kwhToMilli(line.kwh), 0n) !== kwhToMilli(values.kwh);
      case "dailyRate": return !decimalSchema.safeParse(values.dailyNzd).success;
      case "usageRate": return charges.usage.some((line) => !validUsageRate(line.cents));
      case "tax": return !charges.gst;
      case "total": return result.suppliedCents === null;
      case "adjustmentTax": return adjustments.some((item) => item.requiresGst && !item.gst && item.kind !== "gstAdd" && item.kind !== "gstCredit");
      default: return true;
    }
  }) ?? [];
  const printedConflicts = source ? printedElectricityConflicts(source, result.charges) : [];
  const pendingCharges = pdfIssues.some((issue) => issue !== "period" && issue !== "total" && issue !== "unreadablePage");
  const printedConflict = printedConflicts.length > 0 || pdfIssues.some(isPrintedAmountIssue);
  const verification = result.verification !== "difference" && (printedConflict || !result.charges && pendingCharges)
    ? "review" : result.verification;
  const chargeIssues = [...new Set([...pdfIssues, ...printedConflicts])].filter((issue) =>
    issue !== "period" && (issue !== "unclassifiedAmount" || verification !== "matches"));
  const saving = electricitySavingScenarios(charges, verification === "matches" || !source && result.suppliedCents === null);
  const total = result.suppliedCents ?? result.charges?.totalCents ?? null;
  const showResult = !!source || method === "manual" && !!(values.days || values.kwh || values.totalNzd);
  const asPrintedMoney = (value?: string) => value === undefined ? undefined : money(Number(value) * 100);
  const share = (value: number | null) => value === null ? "" : ` · ${number(value, 1)}%`;
  const vacantFixedShare = property === "vacant" && saving && result.fixedShare !== null && result.fixedShare > 50 ? result.fixedShare : null;

  function selectMethod(value: BillMethod) {
    if (value === "manual") { activeRead.current?.abort(); setPdfStatus(null); }
    setMethod(value);
  }

  function reset() {
    activeRead.current?.abort();
    setMethod(null);
    setValues(blankBill);
    setProperty("unspecified");
    setExtracted(null);
    setPdfStatus(null);
    setDiagnostics(null);
    setFixedDays("");
    setUsage(null);
    setAdjustments([]);
    setDraftVersion((previous) => previous + 1);
    manualChoiceRef.current?.focus();
  }

  async function selectFile(file: File) {
    activeRead.current?.abort();
    const controller = new AbortController();
    activeRead.current = controller;
    setExtracted(null);
    setPdfStatus("busy");
    setDiagnostics(null);
    try {
      const { readElectricityPdf } = await import("@/lib/electricity-pdf");
      const response = await readElectricityPdf(file, controller.signal, (report) => {
        if (!controller.signal.aborted) setDiagnostics(report);
      });
      if (controller.signal.aborted) return;
      if ("issue" in response) { setPdfStatus(response.issue); return; }
      const { bill } = response;
      setExtracted(bill);
      setFixedDays(bill.fixedDays === bill.days ? "" : bill.fixedDays);
      setUsage(bill.usage.length > 1 ? bill.usage : null);
      setAdjustments(bill.adjustments);
      setValues({
        ...blankBill, days: bill.days, kwh: bill.kwh, dailyNzd: bill.dailyNzd,
        usageCents: bill.usage.length === 1 ? bill.usage[0].cents : "",
        totalNzd: bill.totalNzd, dailyGst: bill.gst || "inclusive", usageGst: bill.gst,
      });
      setDraftVersion((previous) => previous + 1);
      setPdfStatus(null);
    } catch {
      if (!controller.signal.aborted) setPdfStatus("invalid");
    } finally {
      if (activeRead.current === controller) activeRead.current = null;
    }
  }

  return <>
    <section id="understand-bill" className="analysis-section section-anchor" aria-labelledby="understand-bill-title"><div className="page-width">
      <h2 id="understand-bill-title" className="section-title">{t.understand}</h2>
      <p className="mt-3 max-w-3xl text-muted">{t.intro}</p>
      <div className="analysis-card mt-6">
        <div className="flex flex-wrap gap-3">
          <button type="button" className="button-primary" aria-pressed={method === "pdf"} onClick={() => selectMethod("pdf")}>{t.choosePdf}</button>
          <button type="button" ref={manualChoiceRef} className="button-primary bill-method-manual" aria-pressed={method === "manual"} onClick={() => selectMethod("manual")}>{t.manual}</button>
          {method && <button type="button" className="text-action" onClick={reset}>{t.reset}</button>}
        </div>
        {method === "pdf" && <div className="mt-4">
          <label className="field-label" htmlFor="bill-pdf">{t.file}</label>
          <input id="bill-pdf" className="analysis-input max-w-full" type="file" accept="application/pdf,.pdf" aria-describedby="bill-pdf-hint" onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) void selectFile(file);
          }} />
          <p id="bill-pdf-hint" className="field-hint">{t.fileHint}</p>
          <div role="status" className="mt-2 text-sm">{pdfStatus === "busy" ? t.busy : pdfStatus ? `${t.pdfErrors[pdfStatus]} ${t.fallback}` : extracted ? t.pdfReady : ""}</div>
        </div>}
      </div>
      {showResult && <div ref={resultRef} tabIndex={-1} className="analysis-card electricity-bill-summary mt-5" aria-live="polite" data-testid="current-electricity-review">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="text-xl font-semibold">{t.breakdown}</h3>
          {source && source.retailer !== "unknown" && <p className="font-semibold">{source.retailer === "genesis" ? "Genesis Energy" : "Mercury"}</p>}
        </div>
        {total !== null && <dl className="mt-5">
          <dt className="text-sm text-muted">{result.suppliedCents !== null ? t.supplied : t.reconstructed}</dt>
          <dd data-testid="electricity-total" className="text-4xl font-semibold tabular-nums text-green sm:text-5xl">{money(total)}</dd>
        </dl>}
        <p className="mt-4 font-semibold" data-testid="electricity-verification">
          {t.verification[verification]}{verification === "difference" && result.differenceCents !== null ? ` · ${money(Math.abs(result.differenceCents))}` : ""}
        </p>
        {verification === "difference" && <p className="field-hint">{t.differenceHint}</p>}
        <MoneyRows rows={[
          [a.kwh, result.kwh === null ? undefined : `${number(result.kwh, 3)} kWh`],
          [a.days, result.days === null ? undefined : String(result.days)],
          [t.period, source?.period ? `${source.period.start} – ${source.period.end}` : undefined],
          [result.charges ? t.fixed : t.printedFixed, result.charges ? money(result.charges.fixed) : asPrintedMoney(source?.printed.fixed)],
          [result.charges ? t.usage : t.printedUsage, result.charges ? money(result.charges.usageLines.reduce((sum, row) => sum + row.cents, 0n)) : asPrintedMoney(source?.printed.usage)],
          [result.charges ? t.gst : t.printedGst, result.charges ? money(result.charges.gstCents) : asPrintedMoney(source?.printed.gst)],
          [t.reconstructed, result.charges && result.suppliedCents !== null ? money(result.charges.totalCents) : undefined],
        ]} />
        {result.charges && adjustments.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{adjustments.map((item, i) =>
          <li key={i}>{t.adjustmentKinds[item.kind]} · {money(Number(item.amount) * 100)}{item.gst ? ` · ${a[item.gst]}` : ""}</li>)}</ul>}
        {source?.reading && <p className="field-hint">{t[source.reading]}</p>}
        {source?.finalReading && <p className="field-hint">{t.final}</p>}
        {pdfIssues.includes("period") && <p className="field-hint mt-3">{t.issues.period}</p>}
        {chargeIssues.length > 0 && <div className="result-panel mt-4 text-sm">
          <p className="font-semibold">{t.unresolved}</p>
          <ul className="mt-1 list-disc pl-5">{chargeIssues.map((issue) => <li key={issue}>{t.issues[issue]}</li>)}</ul>
          <p className="mt-2">{verification === "matches" ? t.reviewMatched : t.reviewAffectsVerification}</p>
        </div>}
        {!result.charges && !source && <p className="field-hint">{t.missingHint}</p>}
        <p className="field-hint">{t.verificationHint}</p>
        <details className="analysis-disclosure mt-4"><summary>{t.fixed} · {t.usage} · {t.gst}</summary>
          <p className="field-hint">{t.fixedHint} {t.usageHint} {t.gstHint}</p>
          {result.charges && result.charges.usageLines.length > 1 && <ul className="mt-2 list-disc pl-5 text-sm">{result.charges.usageLines.map((line, i) =>
            <li key={i}>{t.usageKinds[charges.usage[i].kind]} · {number(Number(charges.usage[i].kwh), 3)} kWh · {money(line.cents)} · {a[line.gst]}</li>)}</ul>}
        </details>
      </div>}
      {(source || method === "manual") && <details key={source ? draftVersion : "manual"} open={source ? undefined : true} className="analysis-card mt-5" data-testid="electricity-edit">
        <summary className="cursor-pointer font-semibold text-green">{source ? t.reviewFields : t.manualFields}</summary>
        {source && <div className="mt-4">
          {Object.values(source.printed).some(Boolean) && <details className="analysis-disclosure"><summary>{t.readFromPdf}</summary><MoneyRows rows={[
            [t.printedFixed, asPrintedMoney(source.printed.fixed)],
            [t.printedUsage, asPrintedMoney(source.printed.usage)],
            [t.printedSubtotal, asPrintedMoney(source.printed.subtotal)],
            [t.printedGst, asPrintedMoney(source.printed.gst)],
          ]} /></details>}
          {Object.values(source.account).some(Boolean) && <details className="analysis-disclosure"><summary>{t.account}</summary>
            <p className="field-hint">{t.accountHint}</p>
            <MoneyRows rows={(Object.keys(t.accountLabels) as (keyof typeof t.accountLabels)[]).map((key) => [t.accountLabels[key], asPrintedMoney(source.account[key])])} />
          </details>}
        </div>}
        <div className="analysis-fields mt-5">
          <DecimalField id="bill-kwh" label={a.kwh} value={values.kwh} onChange={(kwh) => onChange({ kwh })} />
          <DecimalField id="bill-days" label={a.days} value={values.days} onChange={(days) => onChange({ days })} />
          <DecimalField id="bill-dailyNzd" label={a.daily} value={values.dailyNzd} onChange={(dailyNzd) => onChange({ dailyNzd })} />
          {!usage && <DecimalField id="bill-usageCents" label={a.rate} value={values.usageCents} onChange={(usageCents) => onChange({ usageCents })} />}
          <TaxField locale={locale} label={a.rateGst} value={values.usageGst} onChange={(gst) => onChange({ usageGst: gst, dailyGst: gst || "inclusive" })} />
          <div>
            <DecimalField id="bill-totalNzd" label={values.gst === "inclusive" ? t.billTotal : a.total} value={values.totalNzd} onChange={(totalNzd) => onChange({ totalNzd })} />
            <p className="field-hint">{t.totalHint}</p>
          </div>
        </div>
          <details className="analysis-disclosure mt-5" open={usage !== null || adjustments.length > 0 ? true : undefined}>
            <summary>{t.advanced}</summary>
            <div className="analysis-fields mt-4">
              <DecimalField label={t.fixedDays} value={fixedDays} onChange={setFixedDays} />
              <TaxField locale={locale} label={a.gst} value={values.gst} onChange={(gst) => onChange({ gst: gst || "inclusive" })} />
              <TaxField locale={locale} label={a.dailyGst} value={values.dailyGst === values.usageGst ? "" : values.dailyGst} inherit onChange={(gst) => onChange({ dailyGst: gst || values.usageGst || "inclusive" })} />
            </div>
            <label className="analysis-check mt-4"><input type="checkbox" checked={!!usage} onChange={(event) => setUsage(event.target.checked ? [{ ...blankUsage, kwh: values.kwh, cents: values.usageCents }] : null)} />{t.useRows}</label>
            {usage?.map((row, i) => {
              const update = (patch: Partial<UsageCharge>) => setUsage((previous) => previous?.map((entry, index) => index === i ? { ...entry, ...patch } : entry) ?? null);
              return <fieldset key={i} className="analysis-fields mt-3 rounded-xl border border-line p-3">
                <legend className="field-label">{t.row} {i + 1}</legend>
                <label className="field-label">{t.rowType}<select className="analysis-input" value={row.kind} onChange={(event) => update({ kind: event.target.value as UsageKind })}>
                  {(Object.keys(t.usageKinds) as UsageKind[]).map((kind) => <option key={kind} value={kind}>{t.usageKinds[kind]}</option>)}
                </select></label>
                <DecimalField label={t.rowKwh} value={row.kwh} onChange={(kwh) => update({ kwh })} />
                <DecimalField label={a.rate} value={row.cents} onChange={(cents) => update({ cents })} />
                <TaxField locale={locale} label={t.lineTax} value={row.gst ?? ""} inherit onChange={(gst) => update({ gst: gst || undefined })} />
                {usage.length > 1 && <button className="text-action" type="button" onClick={() => setUsage((previous) => previous?.filter((_, index) => index !== i) ?? null)}>{t.remove}</button>}
              </fieldset>;
            })}
            {usage && <button className="text-action mt-3" type="button" onClick={() => setUsage((previous) => [...(previous ?? []), { ...blankUsage }])}>{t.addRow}</button>}
            <Adjustments locale={locale} rows={adjustments} onChange={setAdjustments} />
          </details>
      </details>}
      {method === "pdf" && diagnostics && <details className="analysis-disclosure mt-3">
        <summary>{t.pdfDiagnostics}</summary>
        <pre className="whitespace-pre-wrap break-words text-xs" data-testid="pdf-diagnostics">{JSON.stringify(diagnostics, null, 2)}</pre>
      </details>}
    </div></section>
      <section id="electricity-savings" className="analysis-section section-anchor" aria-labelledby="electricity-savings-title"><div className="page-width">
        <h2 id="electricity-savings-title" className="section-title">{t.save}</h2>
        <div className="mt-4 max-w-md"><label className="field-label" htmlFor={propertyId}>{t.context}</label><select id={propertyId} className="analysis-input" value={property} onChange={(event) => setProperty(event.target.value as PropertyUse)}>
          {(Object.keys(t.contexts) as PropertyUse[]).map((key) => <option key={key} value={key}>{t.contexts[key]}</option>)}
        </select></div>
        {vacantFixedShare !== null ? <div className="result-panel mt-4 max-w-3xl">
          <h3 className="font-semibold">{t.vacantFixedTitle}</h3>
          <p className="mt-2 text-sm">{t.vacantFixedShare.replace("{share}", number(vacantFixedShare, 1))}</p>
          <p className="mt-2 text-sm">{t.vacantFlexibility}</p>
        </div> : <p className="mt-3 max-w-3xl text-muted">{t.advice[property]}</p>}
        {showResult && <div className="analysis-card mt-5">
          <MoneyRows rows={[
            [t.fixedShare, result.charges ? money(result.charges.fixedCents) + share(result.fixedShare) : undefined],
            [t.usageShare, result.charges ? money(result.charges.usageCents) + share(result.usageShare) : undefined],
            [t.dailyUsage, result.dailyKwh === null ? undefined : `${number(result.dailyKwh)} kWh`],
            [t.dailyCost, result.dailyCostCents === null ? undefined : money(result.dailyCostCents)],
            [t.effective, result.effectiveCentsPerKwh === null ? undefined : money(result.effectiveCentsPerKwh)],
          ]} />
          {result.charges && <p className="field-hint">{t.breakdownHint}</p>}
          {vacantFixedShare === null && result.charges && result.charges.fixedCents > result.charges.usageCents && <p className="field-hint">{t.fixedDominates}</p>}
          {saving && <div className="mt-5">
            <h3 className="text-lg font-semibold">{t.scenarios}</h3>
            <ul className="mt-2 grid gap-3 sm:grid-cols-3">{saving.reductions.map((row) => <li key={row.percent} className="rounded-xl border border-line p-3">
              <h4 className="font-semibold">{t.reduction.replace("{percent}", String(row.percent))}</h4>
              <MoneyRows rows={[[t.savings, money(row.savingCents)], [t.remaining, money(row.totalCents)]]} />
            </li>)}</ul>
            <MoneyRows rows={[[t.unchangedFixed, money(saving.fixedCents)]]} />
            <p className="field-hint">{t.scenarioHint}</p>
            <details className="analysis-disclosure mt-4"><summary>{t.idle}</summary>
              <p className="field-hint">{t.idleHint}</p>
              <MoneyRows rows={saving.idle.map((row) => [t.days.replace("{days}", String(row.days)), money(row.cents)])} />
            </details>
          </div>}
          {result.days !== null && result.kwh !== null && <AlternativeRates key={draftVersion} locale={locale} input={charges} current={total} money={money} />}
        </div>}
        <SupplierComparison key={draftVersion} locale={locale}
          bill={!usage && result.days !== null && result.kwh !== null ? { days: values.days, kwh: values.kwh } : null} />
      </div></section>
  </>;
}
