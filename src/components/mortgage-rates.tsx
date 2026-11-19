"use client";

import { useState, useSyncExternalStore } from "react";
import { mortgageCatalogue, mortgageLenders } from "@/data/mortgage/catalogue";
import { filterMortgageRates, formatAdvertisedMortgageRate, listMortgageRates, occupancies, rateBases, rateTerms, type MortgageRate, type RateFilters } from "@/domain/mortgage/rates";
import { languageTags, messages, type Locale } from "@/i18n";

const allFilters: RateFilters = { term: "all", basis: "all", occupancy: "all" };
const minute = 60_000;
const now = () => Math.floor(Date.now() / minute);
const serverTime = () => null;

function subscribe(update: () => void) {
  const timer = window.setInterval(update, minute);
  window.addEventListener("focus", update);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("focus", update);
  };
}

export function MortgageRates({ locale, onApply }: { locale: Locale; onApply: (rate: MortgageRate) => void }) {
  const t = messages[locale].mortgage;
  const [filters, setFilters] = useState<RateFilters>(allFilters);
  const time = useSyncExternalStore(subscribe, now, serverTime);
  const asOf = time === null ? "" : new Date(time * minute).toISOString();
  const all = filterMortgageRates(mortgageCatalogue.entries, allFilters, asOf);
  const { current: visible, outdated } = listMortgageRates(mortgageCatalogue.entries, filters, asOf);
  const columns = filters.term === "all" ? rateTerms : [filters.term];
  const date = new Intl.DateTimeFormat(languageTags[locale], { timeZone: "Pacific/Auckland", dateStyle: "medium" });
  const number = new Intl.NumberFormat(languageTags[locale], { maximumFractionDigits: 4 });

  function apply(id: string) {
    const current = filterMortgageRates(mortgageCatalogue.entries, filters, new Date().toISOString()).find(({ rate }) => rate.id === id);
    if (current) onApply(current.rate);
  }

  return (
    <section id="mortgage-rates" aria-labelledby="mortgage-rates-heading" className="section-anchor mt-12">
      <h2 id="mortgage-rates-heading" className="section-title">{t.rates}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{t.rateIntro}</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-3">
        {([
          ["term", t.rateTerm, rateTerms, t.terms],
          ["basis", t.rateBasis, rateBases, t.bases],
          ["occupancy", t.occupancy, occupancies, t.occupancies],
        ] as const).map(([key, label, options, names]) => (
          <div key={key}>
            <label htmlFor={`mortgage-rate-${key}`} className="field-label">{label}</label>
            <select id={`mortgage-rate-${key}`} className="analysis-input" value={filters[key]} onChange={(event) => setFilters({ ...filters, [key]: event.target.value })}>
              <option value="all">{t.all}</option>
              {options.map((value) => <option key={value} value={value}>{(names as Record<string, string>)[value]}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div role="status" className="mt-4 text-sm leading-6 text-muted">
        {!all.length ? t.noRates : !visible.length ? t.noMatch : null}
      </div>
      <p className="mt-2 text-xs text-muted">{t.rateStatusHelp}</p>
      <div role="region" aria-labelledby="mortgage-rates-heading" tabIndex={0} className="relative mt-4 overflow-x-auto rounded-xl border border-line bg-white">
        <table aria-labelledby="mortgage-rates-heading" className="w-full border-collapse text-left text-sm">
          <thead className="bg-[#eef2e9]">
            <tr>
              <th scope="col" className="min-w-44 px-4 py-3">{t.lender}</th>
              {columns.map((term) => <th key={term} scope="col" className="min-w-24 px-3 py-3">{t.terms[term]}</th>)}
            </tr>
          </thead>
          <tbody>
            {mortgageLenders.map((lender) => (
              <tr key={lender.id} className="border-t border-line align-top">
                <th scope="row" className="px-4 py-3 font-semibold">
                  {lender.name}
                  {lender.linkPermissionRequired && !all.some(({ rate }) => rate.lenderId === lender.id)
                    ? <span className="mt-1 block text-xs font-normal text-muted">{t.linkPending}</span>
                    : <div><a className="text-action text-xs" href={lender.url} target="_blank" rel="noreferrer">{t.source}</a></div>}
                </th>
                {columns.map((term) => {
                  const offers = visible.filter(({ rate }) => rate.lenderId === lender.id && rate.term === term);
                  const expired = outdated.some(({ rate }) => rate.lenderId === lender.id && rate.term === term);
                  return (
                    <td key={term} className="px-3 py-3" aria-label={offers.length === 0 && !expired ? t.missing : undefined}>
                      {offers.length === 0 ? (expired ? <span className="text-xs font-medium text-muted">{t.outdated}</span> : <span aria-hidden="true">–</span>) :
                        <ul className="space-y-3">{offers.map(({ rate, review }) => (
                          <li key={rate.id} className="min-w-48">
                            <p className="font-semibold">{formatAdvertisedMortgageRate(rate.annualRate, languageTags[locale])}% · {t.bases[rate.basis]}</p>
                            <details className="analysis-disclosure py-1">
                              <summary>{t.conditions}</summary>
                              <p className="text-xs leading-5 text-muted">{rate.product}</p>
                              <p className="text-xs leading-5 text-muted">{rate.occupancy.map((use) => t.occupancies[use]).join(" / ")}</p>
                              {rate.minEquityPercent !== null && <p className="text-xs leading-5">{t.equity} {number.format(rate.minEquityPercent)}%</p>}
                              {rate.lowEquity && <p className="text-xs leading-5"><strong>{t.lowEquity}</strong> {rate.lowEquity[locale]}</p>}
                              <p className="text-xs leading-5">{rate.conditions[locale]}</p>
                              <p className="text-xs leading-5"><strong>{t.verified}</strong> <time dateTime={review.verifiedAt}>{date.format(new Date(review.verifiedAt))}</time></p>
                              {rate.effectiveFrom && <p className="text-xs leading-5"><strong>{t.effective}</strong> <time dateTime={rate.effectiveFrom}>{rate.effectiveFrom}</time></p>}
                              <a className="text-action text-xs" href={rate.provenance.sourceUrl} target="_blank" rel="noreferrer">{t.source}</a>
                            </details>
                            <button type="button" className="clear-button text-sm" onClick={() => apply(rate.id)}>{t.apply}</button>
                          </li>
                        ))}</ul>}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
