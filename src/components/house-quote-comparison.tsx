"use client";

import { useRef, useState } from "react";
import { compareHouseQuotes, emptyHouseQuote, formatHouseMoney, housePremiumEquivalents, quoteCover, readHouseQuote, type EvidenceState, type HouseQuote, type SettlementBasis } from "@/domain/insurance/house";
import { languageTags, messages, type Locale } from "@/i18n";
import { HouseField, HouseMoneyField, HouseSelect } from "./house-insurance-fields";
import { HousePolicyFacts } from "./house-policy-facts";

type Draft = { id: number; quote: HouseQuote };
const initialDrafts: Draft[] = [{ id: 1, quote: emptyHouseQuote }];
const maxAlternatives = 5;

function QuoteFields({ quote, legend, update, remove, locale }: {
  quote: HouseQuote; legend: string; update: <K extends keyof HouseQuote>(key: K, value: HouseQuote[K]) => void;
  remove?: () => void; locale: Locale;
}) {
  const t = messages[locale].houseInsurance;
  const { invalid } = readHouseQuote(quote);
  return (
    <fieldset className="analysis-card mt-4">
      <legend className="px-2 text-lg font-semibold">{legend}</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <HouseField label={t.insurer} value={quote.insurer} onChange={(event) => update("insurer", event.target.value)} />
        <HouseField label={t.product} value={quote.product} onChange={(event) => update("product", event.target.value)} />
        {(["premium", "sumInsured", "standardExcess"] as const).map((key) => (
          <HouseMoneyField key={key} label={t.amounts[key]} locale={languageTags[locale]} value={quote[key]}
            error={invalid.includes(key) ? t.moneyError : undefined} update={(value) => update(key, value)} />
        ))}
      </div>
      <details className="analysis-disclosure mt-4">
        <summary>{t.advanced}</summary>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <HouseField label={t.quoteDate} type="date" value={quote.date}
            error={invalid.includes("date") ? t.dateError : undefined} onChange={(event) => update("date", event.target.value)} />
          <HouseMoneyField label={t.amounts.hazardExcess} locale={languageTags[locale]} value={quote.hazardExcess}
            error={invalid.includes("hazardExcess") ? t.moneyError : undefined} update={(value) => update("hazardExcess", value)} />
          <HouseSelect label={t.settlement} options={t.settlements} value={quote.settlement}
            empty={t.unknown} onChange={(value) => update("settlement", value)} />
        </div>
        <p className="mt-3 text-sm leading-6 text-muted">{t.fixedExcess}</p>
        <p className="mt-4 font-semibold">{t.quoteCover}</p>
        <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quoteCover.map((key) => (
            <HouseSelect key={key} label={t.events[key]} options={t.states} value={quote[key]}
              onChange={(value) => update(key, value || "unverified")} />
          ))}
        </div>
        <div className="mt-4"><HouseField label={t.quoteConditions} value={quote.conditions} onChange={(event) => update("conditions", event.target.value)} /></div>
      </details>
      {remove && <button type="button" className="clear-button mt-2" onClick={remove}>{t.removeQuote}</button>}
    </fieldset>
  );
}

function QuoteDifference({ result, alternative, label, locale }: {
  result: NonNullable<ReturnType<typeof compareHouseQuotes>>; alternative: HouseQuote; label: string; locale: Locale;
}) {
  const t = messages[locale].houseInsurance;
  const money = (cents: number) => formatHouseMoney(cents, languageTags[locale]);
  const format = (field: (typeof result.checks)[number]["field"], value: string | number | null) => {
    if (typeof value === "number") return money(value);
    if (!value) return t.unknown;
    if (field === "settlement") return t.settlements[value as SettlementBasis];
    if (quoteCover.some((key) => key === field)) return t.states[value as EvidenceState];
    return value;
  };
  const labels = { ...t.amounts, ...t.events, settlement: t.settlement, conditions: t.quoteConditions };
  const missingInBoth = result.checks.filter(({ baseline, alternative }) => baseline === alternative &&
    (baseline === null || baseline === "" || baseline === "unverified"));
  const enteredChecks = result.checks.filter((check) => !missingInBoth.includes(check));
  const title = [alternative.insurer.trim(), alternative.product.trim(), alternative.date].filter(Boolean).join(" · ");
  const premiumLabel = result.annualDifference < 0 ? t.lower : result.annualDifference > 0 ? t.higher : t.equal;
  const difference = Math.abs(result.annualDifference);

  return (
    <article className="analysis-card min-w-0 wrap-anywhere" data-testid="house-quote-difference">
      <h4 className="text-lg font-semibold">{label}{title && ` · ${title}`}</h4>
      <p className="mt-2 text-sm text-muted">{t.result}</p>
      <p className="mt-3 font-semibold">{t.checkCover}</p>
      {result.checks.length > 0 ? (
        <>
          {enteredChecks.length > 0 && <dl className="mt-2 space-y-2 text-sm leading-6">
            {enteredChecks.map(({ field, baseline, alternative }) => (
              <div key={field}>
                <dt className="font-semibold">{labels[field]}</dt>
                <dd>{format(field, baseline)} → {format(field, alternative)}</dd>
              </div>
            ))}
          </dl>}
          {missingInBoth.length > 0 && (
            <p className="mt-2 text-sm leading-6 text-muted"><strong>{t.missingInBoth}</strong> {missingInBoth.map(({ field }) => labels[field]).join(" · ")}</p>
          )}
          {result.checks.some(({ uncertain }) => uncertain) && <p className="mt-3 text-sm leading-6 text-muted">{t.partialDetails}</p>}
        </>
      ) : (
        <p className="mt-2 text-sm leading-6 text-muted">{t.sameDetails}</p>
      )}
      <p className="mt-4 border-t border-line pt-3 font-semibold" aria-live="polite" data-testid="house-premium-difference">
        {premiumLabel}{difference !== 0 && ` · ${money(difference)}`}
      </p>
      <p className="mt-1 text-sm leading-6 text-muted" data-testid="house-monthly-difference">
        {t.monthlyDifference} · {money(housePremiumEquivalents(difference).monthly)}
      </p>
    </article>
  );
}

export function HouseQuoteComparison({ locale, baseline }: { locale: Locale; baseline: HouseQuote }) {
  const t = messages[locale].houseInsurance;
  const [drafts, setDrafts] = useState(initialDrafts);
  const nextId = useRef(2);
  const referencePremium = readHouseQuote(baseline).amounts.premium;
  const label = (index: number) => index === 0 ? t.alternative : `${t.quoteLabel} ${index + 2}`;
  const comparisons = drafts.flatMap(({ id, quote }, index) => {
    const result = compareHouseQuotes(baseline, quote);
    return result ? [{ id, quote, index, result }] : [];
  });
  const update = <K extends keyof HouseQuote>(id: number, key: K, value: HouseQuote[K]) => {
    setDrafts((current) => current.map((draft) => draft.id === id ? { ...draft, quote: { ...draft.quote, [key]: value } } : draft));
  };

  return (
    <section id="compare-quotes" aria-labelledby="house-quotes-heading" className="section-anchor mt-10">
      <h2 id="house-quotes-heading" className="section-title">{t.quotes}</h2>
      <p className="mt-3 max-w-3xl leading-7 text-muted">{t.quoteIntro}</p>
      <section className="analysis-card mt-4" aria-labelledby="house-reference-heading">
        <h3 id="house-reference-heading" className="text-lg font-semibold">{t.reference}</h3>
        <p className="mt-2 mb-4 text-sm leading-6 text-muted">{t.referenceSource}</p>
        <HousePolicyFacts locale={locale} policy={baseline} />
      </section>
      {drafts.map(({ id, quote }, index) => (
        <QuoteFields key={id} locale={locale} quote={quote} legend={label(index)}
          update={(key, value) => update(id, key, value)}
          remove={drafts.length > 1 ? () => setDrafts((current) => current.filter((draft) => draft.id !== id)) : undefined} />
      ))}
      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
        <button type="button" className="button-primary disabled:cursor-default disabled:opacity-70"
          disabled={drafts.length >= maxAlternatives}
          onClick={() => {
            const id = nextId.current++;
            setDrafts((current) => [...current, { id, quote: emptyHouseQuote }]);
          }}>{t.addQuote}</button>
        <button type="button" className="clear-button" onClick={() => { setDrafts(initialDrafts); nextId.current = 2; }}>{t.clearQuotes}</button>
        {drafts.length >= maxAlternatives && <p className="text-sm text-muted">{t.maxQuotes}</p>}
      </div>
      <h3 className="mt-6 text-xl font-semibold">{t.results}</h3>
      {comparisons.length === 0 ? (
        <div className="mt-3 rounded-lg border border-line p-4 text-sm leading-6 text-muted" role="status">
          {referencePremium === null ? <><p>{t.referencePremiumNeeded}</p><a className="text-action" href="#enter-policy">{t.enterPolicy}</a></> : <p>{t.waitingQuotes}</p>}
        </div>
      ) : (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {comparisons.map(({ id, quote, index, result }) => <QuoteDifference key={id} result={result} alternative={quote} label={label(index)} locale={locale} />)}
        </div>
      )}
    </section>
  );
}
