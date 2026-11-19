"use client";

import { useState, type FormEvent } from "react";
import { mortgageLenders } from "@/data/mortgage/catalogue";
import { formatMortgageAmountOnBlur } from "@/domain/mortgage/money";
import { estimateMortgage, frequencies, parseExtraRepayment, parseMortgage, type Frequency, type MortgageInput } from "@/domain/mortgage/repayment";
import type { MortgageRate } from "@/domain/mortgage/rates";
import { languageTags, messages, type Locale } from "@/i18n";
import { Icon } from "./icon";
import { MortgageRates } from "./mortgage-rates";

const empty: MortgageInput = {
  amount: "", annualRate: "", years: "", type: "principal", frequency: "monthly", interestOnlyYears: "",
};
const frequencyIds = Object.keys(frequencies) as Frequency[];
type InputField = "amount" | "annualRate" | "years" | "interestOnlyYears";

export function MortgageCalculator({ locale }: { locale: Locale }) {
  const t = messages[locale].mortgage;
  const [input, setInput] = useState(empty);
  const [assessed, setAssessed] = useState(false);
  const [error, setError] = useState<InputField | null>(null);
  const [extra, setExtra] = useState("");
  const [selectedRate, setSelectedRate] = useState<MortgageRate | null>(null);
  const opposite = locale === "en" ? "zh" : "en";
  const language = languageTags[locale];
  const currency = new Intl.NumberFormat(language, { style: "currency", currency: "NZD", currencyDisplay: "code", useGrouping: true });
  const number = new Intl.NumberFormat(languageTags[locale]);
  const dollars = (cents: number) => currency.format(cents / 100);
  const parsed = parseMortgage(input);
  const loan = assessed && parsed.ok ? parsed : null;
  const result = loan ? estimateMortgage(loan, input.frequency) : null;
  const interestOnly = input.type === "interest-only";
  const extraCents = parseExtraRepayment(extra);
  const scenario = loan && !interestOnly && extraCents ? estimateMortgage(loan, input.frequency, extraCents) : null;
  const tipOrder = Object.keys(t.tipItems) as (keyof typeof t.tipItems)[];
  if (interestOnly) {
    tipOrder.splice(tipOrder.indexOf("interestOnly"), 1);
    tipOrder.unshift("interestOnly");
  }

  function update<Key extends keyof MortgageInput>(key: Key, value: MortgageInput[Key]) {
    setInput({ ...input, [key]: value });
    setAssessed(false);
    setError(null);
    if (key === "annualRate") setSelectedRate(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!parsed.ok) {
      setError(parsed.field);
      document.getElementById(`mortgage-${parsed.field}`)?.focus();
      return;
    }
    setError(null);
    setAssessed(true);
  }

  function clear() {
    setInput(empty);
    setAssessed(false);
    setError(null);
    setExtra("");
    setSelectedRate(null);
    document.getElementById("mortgage-amount")?.focus();
  }

  function apply(rate: MortgageRate) {
    update("annualRate", rate.annualRate);
    setSelectedRate(rate);
    document.getElementById("mortgage-annualRate")?.focus();
  }

  function field(key: InputField, hint?: string) {
    const id = `mortgage-${key}`;
    const invalid = error === key;
    return (
      <div>
        <label htmlFor={id} className="field-label">{t[key]}</label>
        <input id={id} className="analysis-input" type="text" inputMode="decimal" maxLength={key === "amount" ? 20 : 16}
          value={input[key]} onChange={(event) => update(key, event.target.value)}
          onBlur={key === "amount" ? (event) => {
            const amount = formatMortgageAmountOnBlur(event.currentTarget.value, language);
            setInput((previous) => previous.amount === amount ? previous : { ...previous, amount });
          } : undefined}
          aria-invalid={invalid} aria-describedby={[hint && `${id}-hint`, invalid && `${id}-error`].filter(Boolean).join(" ") || undefined} />
        {hint && <p id={`${id}-hint`} className="field-hint">{hint}</p>}
        {invalid && <p id={`${id}-error`} className="field-error" role="alert">{t.errors[key]}</p>}
        {selectedRate && key === "annualRate" && (
          <p className="field-hint" role="status">{t.applied} · {mortgageLenders.find(({ id }) => id === selectedRate.lenderId)?.name} · {t.terms[selectedRate.term]}</p>
        )}
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#mortgage-calculator">{t.skip}</a>
      <header className="page-width flex items-center justify-between gap-4 border-b border-line py-5">
        <a href={locale === "en" ? "/" : "/zh/"} className="text-action" aria-label={t.home}>OpenBill</a>
        <a href={locale === "en" ? "/zh/mortgage/" : "/mortgage/"} lang={languageTags[opposite]} hrefLang={languageTags[opposite]} className="text-action">{t.language}</a>
      </header>
      <main className="page-width pb-16">
        <div className="analysis-hero">
          <div>
            <h1 className="hero-title">{t.title}</h1>
            <p className="mt-4 max-w-xl leading-7 text-muted">{t.intro}</p>
          </div>
          <p id="mortgage-privacy" className="analysis-privacy flex items-start gap-3 text-sm leading-6">
            <Icon name="shield" className="mt-1 size-5 shrink-0" />{t.privacy}
          </p>
        </div>
        <nav className="analysis-steps" aria-label={messages[locale].navigation}>
          <a href="#mortgage-calculator">{t.calculator}</a>
          <a href="#mortgage-rates">{t.rates}</a>
          <a href="#mortgage-tips">{t.tips}</a>
        </nav>
        <section id="mortgage-calculator" tabIndex={-1} aria-labelledby="mortgage-heading" className="section-anchor">
          <h2 id="mortgage-heading" className="section-title">{t.calculator}</h2>
          <div className="analysis-bill-grid mt-5">
            <form className="analysis-card" onSubmit={submit} aria-labelledby="mortgage-heading" aria-describedby="mortgage-privacy" noValidate autoComplete="off">
              <div className="analysis-fields">
                {field("amount")}
                {field("annualRate")}
                {field("years", t.termHint)}
                <div>
                  <label htmlFor="mortgage-type" className="field-label">{t.type}</label>
                  <select id="mortgage-type" className="analysis-input" value={input.type} onChange={(event) => update("type", event.target.value as MortgageInput["type"])}>
                    <option value="principal">{t.principal}</option><option value="interest-only">{t.interestOnly}</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="mortgage-frequency" className="field-label">{t.frequency}</label>
                  <select id="mortgage-frequency" className="analysis-input" value={input.frequency} onChange={(event) => update("frequency", event.target.value as Frequency)}>
                    {frequencyIds.map((id) => <option key={id} value={id}>{t.frequencies[id]}</option>)}
                  </select>
                </div>
                {interestOnly && field("interestOnlyYears", t.interestOnlyHint)}
              </div>
              {interestOnly && <p className="mt-4 text-sm leading-6 text-muted">{t.interestOnlyWarning}</p>}
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <button type="submit" className="button-primary">{t.calculate}</button>
                <button type="button" onClick={clear} className="clear-button">{t.clear}</button>
              </div>
            </form>
            <div className="analysis-card analysis-results">
              <div role="status" aria-live="polite" aria-atomic="true">
                {result && (
                  <>
                    <p className="text-sm font-semibold">{t.estimate} · {t.frequencies[input.frequency]}</p>
                    <p className="mt-1 text-3xl font-semibold tabular-nums" data-testid="mortgage-payment">{dollars(result.regularPayment)}</p>
                    {result.transitionPayment !== null && <p className="mt-3 text-sm">{t.transition} <strong>{dollars(result.transitionPayment)}</strong></p>}
                    <h3 className="mt-5 font-semibold">{t.costs}</h3>
                    <dl className="analysis-metrics my-4">
                      <div><dt>{t.totalInterest}</dt><dd>{dollars(result.interest)}</dd></div>
                      <div><dt>{t.totalPaid}</dt><dd>{dollars(result.paid)}</dd></div>
                      <div><dt>{t.remaining}</dt><dd>{dollars(result.balance)}</dd></div>
                    </dl>
                  </>
                )}
              </div>
              <p className="text-sm leading-6 text-muted">{t.assumptions}</p>
              <details className="analysis-disclosure mt-4">
                <summary>{t.method}</summary><p className="text-sm leading-6">{t.methodBody}</p>
              </details>
              {loan && result && (
                <>
                  <h3 className="mt-2 font-semibold">{t.comparison}</h3>
                  <dl className="mt-2 space-y-1 text-sm">
                    {frequencyIds.map((frequency) => (
                      <div key={frequency} className="flex flex-wrap justify-between gap-x-4">
                        <dt>{t.frequencies[frequency]}</dt><dd>{dollars(estimateMortgage(loan, frequency).regularPayment)}</dd>
                      </div>
                    ))}
                  </dl>
                  <details className="analysis-disclosure mt-4">
                    <summary>{t.balances}</summary>
                    <table className="w-full text-left text-sm" aria-label={t.balances}>
                      <thead><tr><th scope="col">{t.period}</th><th scope="col">{t.principalBalance}</th></tr></thead>
                      <tbody>{result.balances.map(({ period, balance }) => (
                        <tr key={period}><th scope="row" className="py-1 font-normal">{number.format(period)}</th><td>{dollars(balance)}</td></tr>
                      ))}</tbody>
                    </table>
                  </details>
                </>
              )}
            </div>
          </div>
        </section>
        <MortgageRates locale={locale} onApply={apply} />
        <section id="mortgage-tips" className="section-anchor mt-12" aria-labelledby="mortgage-tips-heading">
          <h2 id="mortgage-tips-heading" className="section-title">{t.tips}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t.tipsIntro}</p>
          {!interestOnly && (
            <details className="analysis-card analysis-disclosure mt-5">
              <summary>{t.extraTitle}</summary>
              {!result ? <p className="text-sm">{t.extraNeedsEstimate}</p> : (
                <>
                  <div className="max-w-sm">
                    <label htmlFor="mortgage-extra" className="field-label">{t.extra}</label>
                    <input id="mortgage-extra" className="analysis-input" type="text" inputMode="decimal" autoComplete="off" maxLength={20}
                      value={extra} onChange={(event) => setExtra(event.target.value)}
                      onBlur={(event) => setExtra(formatMortgageAmountOnBlur(event.currentTarget.value, language))}
                      aria-invalid={extraCents === null} aria-describedby="mortgage-extra-hint" />
                  </div>
                  <p id="mortgage-extra-hint" className="field-hint">{t.extraHint}</p>
                  <div role="status" className="mt-2 text-sm leading-6">
                    {extraCents === null && <p className="field-error">{t.errors.extra}</p>}
                    {scenario && <dl>
                      <div><dt>{t.extraResult}</dt><dd className="font-semibold">{dollars(result.interest - scenario.interest)}</dd></div>
                      <div><dt>{t.extraPayments}</dt><dd className="font-semibold">{number.format(scenario.periods)}</dd></div>
                    </dl>}
                  </div>
                </>
              )}
            </details>
          )}
          <ul className="analysis-tips-grid mt-5">
            {tipOrder.map((key) => (
              <li key={key} className="analysis-card">
                <h3 className="font-semibold">{t.tipItems[key].title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted">{t.tipItems[key].body}</p>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-x-6">
            <a className="text-action" href="https://sorted.org.nz/guides/home-buying/managing-a-mortgage/">{t.sortedManaging}</a>
            <a className="text-action" href="https://sorted.org.nz/guides/home-buying/mortgage-types/">{t.sortedTypes}</a>
            <a className="text-action" href="https://sorted.org.nz/guides/home-buying/how-to-refinance-your-mortgage/">{t.sortedSwitching}</a>
          </div>
        </section>
      </main>
    </>
  );
}
