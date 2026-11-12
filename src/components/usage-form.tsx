"use client";

import { useRef, useState, type FormEvent } from "react";
import { calculateUsage, type UsageErrors, type UsageInput, type UsageSummary } from "@/domain/electricity/usage";
import { languageTags, messages, type Locale } from "@/i18n";
import { Icon } from "./icon";

export function UsageForm({ locale }: { locale: Locale }) {
  const t = messages[locale];
  const [input, setInput] = useState<UsageInput>({ kwh: "", days: "" });
  const [errors, setErrors] = useState<UsageErrors>({});
  const [summary, setSummary] = useState<UsageSummary | null>(null);
  const kwhRef = useRef<HTMLInputElement>(null);
  const daysRef = useRef<HTMLInputElement>(null);
  const number = new Intl.NumberFormat(languageTags[locale], { maximumFractionDigits: 3 });
  const average = new Intl.NumberFormat(languageTags[locale], { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function update(field: keyof UsageInput, value: string) {
    setInput((previous) => ({ ...previous, [field]: value }));
    setErrors({});
    setSummary(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = calculateUsage(input);
    if (!result.ok) {
      setSummary(null);
      setErrors(result.errors);
      (result.errors.kwh ? kwhRef : daysRef).current?.focus();
      return;
    }
    setErrors({});
    setSummary(result.summary);
  }

  function clear() {
    setInput({ kwh: "", days: "" });
    setErrors({});
    setSummary(null);
    kwhRef.current?.focus();
  }

  return (
    <div className="usage-card">
      <div className="flex items-center gap-3 border-b border-line px-6 py-5 sm:px-8">
        <span className="icon-box"><Icon name="bolt" /></span>
        <span className="font-semibold text-ink">{t.electricity}</span>
        <span className="ml-auto status-dot" aria-hidden="true" />
      </div>
      <div className="p-6 sm:p-8">
        <h3 className="text-2xl font-semibold tracking-tight">{t.formTitle}</h3>
        <p className="mt-3 text-sm leading-6 text-muted" id="form-instructions">{t.formDescription}</p>
        <form onSubmit={submit} noValidate autoComplete="off" aria-label={t.formTitle} aria-describedby="form-instructions form-privacy" className="mt-7">
          <div className="grid gap-6 sm:grid-cols-[1.2fr_1fr]">
            <div>
              <label htmlFor="usage-kwh" className="field-label">{t.usageLabel}</label>
              <div className="input-wrap">
                <input ref={kwhRef} id="usage-kwh" type="text" inputMode="decimal" maxLength={16} value={input.kwh} onChange={(event) => update("kwh", event.target.value)} placeholder="300" aria-invalid={Boolean(errors.kwh)} aria-describedby={`usage-hint${errors.kwh ? " usage-error" : ""}`} spellCheck={false} />
                <span aria-hidden="true">kWh</span>
              </div>
              <p id="usage-hint" className="field-hint">{t.usageHint}</p>
              {errors.kwh && <p id="usage-error" role="alert" className="field-error">{t.errors[errors.kwh]}</p>}
            </div>
            <div>
              <label htmlFor="usage-days" className="field-label">{t.daysLabel}</label>
              <div className="input-wrap">
                <input ref={daysRef} id="usage-days" type="text" inputMode="numeric" maxLength={6} value={input.days} onChange={(event) => update("days", event.target.value)} placeholder="30" aria-invalid={Boolean(errors.days)} aria-describedby={`days-hint${errors.days ? " days-error" : ""}`} spellCheck={false} />
                <span aria-hidden="true">{t.daysUnit}</span>
              </div>
              <p id="days-hint" className="field-hint">{t.daysHint}</p>
              {errors.days && <p id="days-error" role="alert" className="field-error">{t.errors[errors.days]}</p>}
            </div>
          </div>
          <button type="submit" className="button-primary mt-7 w-full justify-center">{t.calculate}<Icon name="arrow" /></button>
          <button type="button" onClick={clear} className="clear-button mt-2 w-full">{t.clear}</button>
          <div className="mt-4 flex items-start gap-2 text-xs leading-5 text-muted" id="form-privacy">
            <Icon name="shield" className="mt-0.5 size-4 shrink-0" /><p>{t.privacyDetail}</p>
          </div>
        </form>
        <div role="status" aria-live="polite" aria-atomic="true">
          {summary && (
            <div className="result-panel mt-6">
              <h4 className="font-semibold">{t.resultTitle}</h4>
              <p className="mt-3"><span className="text-4xl font-semibold tabular-nums" data-testid="daily-average">{average.format(summary.dailyKwh)}</span><span className="ml-2 text-sm">{t.perDay}</span></p>
              <p className="mt-3 text-sm">{t.resultBasis}: {number.format(summary.kwh)} {t.resultDivide} {number.format(summary.days)} {t.daysUnit}.</p>
              <p className="mt-2 text-xs leading-5">{t.resultApproximate}</p>
              <p className="mt-2 text-sm leading-6">{t.resultDetail}</p>
            </div>
          )}
        </div>
        <noscript><p className="mt-4 text-sm">{t.noScript}</p></noscript>
      </div>
    </div>
  );
}
