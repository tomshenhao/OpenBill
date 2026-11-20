"use client";

import { useRef, useState } from "react";
import { insuranceSources } from "@/config/insurance";
import { basicHouseAmounts, emptyHouseQuote, houseAmountInvalid, houseEventGroups, readHouseQuote, reviewedEventState, type EvidenceState, type HouseEvent, type HouseQuote } from "@/domain/insurance/house";
import { languageTags, messages, type Locale } from "@/i18n";
import { HouseField, HouseMoneyField, HouseSelect } from "./house-insurance-fields";

import { HousePolicyFacts } from "./house-policy-facts";
import { HouseQuoteComparison } from "./house-quote-comparison";

function EventReview({ event, version, locale }: { event: HouseEvent; version: string; locale: Locale }) {
  const t = messages[locale].houseInsurance;
  const [state, setState] = useState<EvidenceState>("unverified");
  const [reference, setReference] = useState("");
  const personalState = reviewedEventState(state, version, reference);
  const guide = t.eventGuidance[event];

  return (
    <details className="analysis-card !p-0" data-event={event}>
      <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 font-semibold">
        {t.events[event]}
      </summary>
      <div className="border-t border-line p-4">
        <p className="text-sm font-semibold text-muted">{t.coverageUnverified}</p>
        <dl className="mt-3 space-y-3 text-sm leading-6">
          <div><dt className="font-semibold">{t.whatItMeans}</dt><dd>{guide.meaning}</dd></div>
          <div><dt className="font-semibold">{t.whatMayApply}</dt><dd>{guide.cover}</dd></div>
          <div><dt className="font-semibold">{t.whatToCheck}</dt><dd>{guide.check}</dd></div>
        </dl>
        <details className="analysis-disclosure mt-3">
          <summary>{t.advancedEvent}</summary>
          <p className="mb-3 text-sm leading-6 text-muted">{t.userNotes}</p>
          <p className="mb-3 text-sm font-semibold" aria-live="polite">{t.personalStatus} · {t.states[personalState]}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <HouseSelect label={t.stateLabel} options={t.states} value={state} onChange={(value) => setState(value || "unverified")} />
            <HouseField label={t.source} value={reference} onChange={(e) => setReference(e.target.value)} />
            {state !== personalState && <p className="text-sm text-muted sm:col-span-2" role="status">{t.waiting}</p>}
            <HouseSelect label={t.provider} options={t.providers} empty={t.unknown} />
            <HouseSelect label={t.settlement} options={t.settlements} empty={t.unknown} />
            <HouseField label={t.eventExcess} />
            <HouseField label={t.eventLimit} />
            <div className="sm:col-span-2"><HouseField label={t.eventNotes} /></div>
          </div>
        </details>
      </div>
    </details>
  );
}

export function HousePolicyReview({ locale }: { locale: Locale }) {
  const t = messages[locale].houseInsurance;
  const [policy, setPolicy] = useState(emptyHouseQuote);
  const [reviewed, setReviewed] = useState(false);
  const summary = useRef<HTMLElement>(null);
  const { amounts, invalid } = readHouseQuote(policy);
  const update = <K extends keyof HouseQuote>(key: K, value: HouseQuote[K]) => {
    setPolicy((current) => ({ ...current, [key]: value }));
  };
  const [version, setVersion] = useState("");
  const [revision, setRevision] = useState(0);
  const clear = () => {
    setPolicy(emptyHouseQuote);
    setReviewed(false);
    setVersion("");
    setRevision((value) => value + 1);
  };

  return (
    <>
      <div key={revision} className="space-y-6">
        <section id="enter-policy" className="analysis-card section-anchor" aria-labelledby="house-entry-heading">
          <h2 id="house-entry-heading" className="text-xl font-semibold">{t.enterPolicy}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{t.figuresHint}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {(["insurer", "product"] as const).map((key) => (
              <HouseField key={key} label={t[key]} value={policy[key]} help={{ label: t.where, message: t.help[key] }}
                onChange={(event) => update(key, event.target.value)} />
            ))}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {basicHouseAmounts.map((key) => (
              <HouseMoneyField key={key} locale={languageTags[locale]} label={t.basicLabels[key]} value={policy[key]}
                error={houseAmountInvalid(key, policy[key]) ? t.moneyError : undefined}
                help={{ label: t.where, message: t.help[key] }} update={(value) => update(key, value)} />
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <button type="button" className="button-primary" onClick={() => {
              setReviewed(true);
              requestAnimationFrame(() => summary.current?.focus());
            }}>{t.reviewAction}</button>
            <button type="button" className="clear-button" onClick={clear}>{t.clearReview}</button>
          </div>
        </section>
        <section ref={summary} tabIndex={-1} hidden={!reviewed} aria-labelledby="house-summary-heading" className="analysis-card analysis-results">
          <h2 id="house-summary-heading" className="text-xl font-semibold">{t.policySummary}</h2>
          <p className="mt-2 mb-4 text-sm text-muted">{t.userEntered}</p>
          <HousePolicyFacts policy={policy} locale={locale} summary />
          {basicHouseAmounts.some((field) => invalid.includes(field)) && <p className="mt-3 text-sm text-muted">{t.invalidOmitted}</p>}
          <ul className="mt-4 list-disc space-y-2 border-t border-line pt-4 pl-5 text-sm leading-6">
            <li>{t.rebuildExplanation}</li>
            <li>{t.excessExplanation}</li>
            {amounts.premium !== null && <li>{t.paymentExplanation}</li>}
          </ul>
        </section>
        <section id="understand-cover" className="section-anchor" aria-labelledby="house-cover-heading">
          <h2 id="house-cover-heading" className="text-xl font-semibold">{t.review}</h2>
          <p className="mt-2 text-sm wrap-anywhere" data-testid="house-coverage-policy">
            <strong>{t.userEntered}</strong> {policy.insurer.trim() || t.unknown} · {policy.product.trim() || t.unknown}
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-2">
            <strong className="status-label border-line bg-[#f0f3ec]" data-testid="house-coverage-status">{t.coverageUnverified}</strong>
            <span className="text-sm text-muted">{t.generalGuidance}</span>
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t.coverageHint}</p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{t.wordingUnavailable}</p>
          <details className="analysis-disclosure mt-4">
            <summary>{t.nhTitle}</summary>
            <p className="mt-2 max-w-3xl text-sm leading-6">{t.propertyScope}</p>
            {t.nh.map((paragraph) => <p key={paragraph} className="mt-3 max-w-3xl text-sm leading-6">{paragraph}</p>)}
            <a className="text-action mt-2" href={insuranceSources.naturalHazards} rel="noreferrer">{t.nhLink}</a>
          </details>
          {(Object.keys(houseEventGroups) as (keyof typeof houseEventGroups)[]).map((group) => (
            <section key={group} className="mt-5" aria-labelledby={`house-events-${group}`}>
              <h3 id={`house-events-${group}`} className="mb-3 text-lg font-semibold">{t.groups[group]}</h3>
              <div className="grid items-start gap-2 md:grid-cols-2">
                {houseEventGroups[group].map((event) => <EventReview key={event} locale={locale} event={event} version={version} />)}
              </div>
            </section>
          ))}
        </section>
        <details className="analysis-card !p-0">
          <summary className="min-h-11 cursor-pointer rounded-xl px-4 py-3 font-semibold">{t.advanced}</summary>
          <div className="border-t border-line p-4">
            <h3 className="text-lg font-semibold">{t.policy}</h3>
            <p className="mt-2 mb-4 text-sm leading-6 text-muted">{t.policyHint}</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <HouseField label={t.wordingVersion} value={version} onChange={(e) => setVersion(e.target.value)} />
              <HouseField label={t.reviewDate} type="date" />
              <HouseField label={t.publicUrl} type="url" />
              <HouseSelect label={t.settlement} options={t.settlements} empty={t.unknown} value={policy.settlement}
                onChange={(value) => update("settlement", value)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">{t.settlementHint}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {Object.entries(t.checklist).map(([key, label]) => <HouseField key={key} label={label} />)}
            </div>
          </div>
        </details>
      </div>
      <HouseQuoteComparison locale={locale} baseline={policy} />
    </>
  );
}
