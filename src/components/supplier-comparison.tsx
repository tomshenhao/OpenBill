"use client";

import { useState } from "react";
import { messages, type Locale } from "@/i18n";
import { comparisonPlans, comparisonPolicy, priceRatingCoverage } from "@/data/electricity/comparison-data";
import { comparePeriodPlans, entryIsCurrent, type ComparisonScope } from "@/domain/electricity/comparison";
import { assessPrice } from "@/domain/electricity/ratings";

export function SupplierComparison({ locale, bill }: { locale: Locale; bill: { days: string; kwh: string } | null }) {
  const { analysis: t, electricityReview: review } = messages[locale];
  const [selected, setSelected] = useState(""), [baseline, setBaseline] = useState("");
  const [region, setRegion] = useState("");
  const now = new Date();
  const asOf = new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  const currentEntries = comparisonPlans.entries.filter((entry) => entryIsCurrent(entry, comparisonPolicy, now, asOf));
  if (!currentEntries.length) return <p className="field-hint mt-5" data-testid="supplier-data-limitation">{review.official}</p>;

  const scopes = new Map<string, ComparisonScope>();
  const supportedEntries = currentEntries.filter(({ record }) => record.metering.registers.length === 1 && record.charges.usage.every((band) => band.kind === "flat"));
  for (const { record } of supportedEntries) {
    // This simple form has one total, not register or interval measurements.
    for (const regionCode of record.coverage.regionCodes) for (const network of record.coverage.networkIds) for (const userCategory of ["low", "standard"] as const) {
      if (regionCode !== region || (record.eligibility.userCategory !== "unrestricted" && record.eligibility.userCategory !== userCategory)) continue;
      const scope = { region: regionCode, network, metering: record.metering.configuration, userCategory, registers: record.metering.registers };
      scopes.set(JSON.stringify(scope), scope);
    }
  }
  const scope = scopes.get(selected);
  const result = scope && bill ? comparePeriodPlans(comparisonPlans, comparisonPolicy, scope, { days: Number(bill.days), registerKwh: { [scope.registers[0]]: bill.kwh } }, { now, asOf, currentRecordId: baseline }) : null;
  const rating = scope && bill ? assessPrice(comparisonPlans, comparisonPolicy, scope, { days: Number(bill.days), registerKwh: { [scope.registers[0]]: bill.kwh } }, priceRatingCoverage, { now, asOf, currentRecordId: baseline }) : { rating: "unknown" as const };
  const money = (cents: bigint) => new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-Hans-NZ", { style: "currency", currency: "NZD" }).format(Number(cents) / 100);
  return <aside className="rating-card" data-rating={rating.rating} data-testid="price-rating" aria-label={t.offersHeading}>
    <h3 className="text-xl font-semibold">{t.ratings.priceTitle}</h3>
    <p className="rating-status"><span className="rating-dot" aria-hidden="true" />{t.ratings.priceLabels[rating.rating]}</p>
    {rating.rating === "unknown" ? <p className="mb-4 text-sm leading-7">{t.ratings.priceUnknown}</p> : "premiumPercent" in rating && <div className="mb-5 space-y-2 text-sm leading-7"><p>{t.ratings.premium}: ≈ {new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-Hans-NZ", { maximumFractionDigits: 6 }).format(rating.premiumPercent)}%</p><p>{t.ratings.savings}: {money(rating.savingsCents)}</p></div>}
    <p className="field-hint mb-5">{t.ratings.priceCoverage}</p>
    <h4 className="font-semibold">{t.offersHeading}</h4>
    {supportedEntries.length === 0 ? <p className="mt-4 text-sm leading-7">{t.journey.unsupportedOffers}</p> : !bill ? <p className="mt-4 text-sm leading-7" data-testid="price-input-requirement">{review.officialNeedsBill}</p> : <>
      <p className="field-hint">{t.offersCoverage}</p>
      <label className="field-label mt-4" htmlFor="offer-region">{t.region}</label>
      <select id="offer-region" className="analysis-input" value={region} onChange={(event) => { setRegion(event.target.value); setSelected(""); setBaseline(""); }}>
        <option value="">{t.chooseRegion}</option>
        {Object.entries(t.regions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
      </select>
      {scopes.size ? <details className="analysis-disclosure mt-4"><summary>{t.journey.matchAdvanced}</summary><label className="field-label mt-4" htmlFor="offer-scope">{t.offersScope}</label><select id="offer-scope" className="analysis-input" value={selected} onChange={(e) => { setSelected(e.target.value); setBaseline(""); }}><option value="">{t.offersChoose}</option>{[...scopes].map(([key, s]) => <option key={key} value={key}>{s.network} · {t.offerMeters[s.metering]} · {t.offerCategories[s.userCategory]} · {s.registers[0]}</option>)}</select></details> : region && <p className="mt-4">{t.offersNoMatch}</p>}
      {result && result.rows.length === 0 && <p className="mt-4">{t.offersNoMatch}</p>}
      {!!result?.rows.length && <>
        <label className="field-label mt-4" htmlFor="offer-baseline">{t.offersBaseline}</label><select id="offer-baseline" className="analysis-input" value={baseline} onChange={(e) => setBaseline(e.target.value)}><option value="">{t.offersNoBaseline}</option>{result.rows.map(({ entry: { record } }) => <option key={record.recordId} value={record.recordId}>{record.retailerId} · {record.plan.name}</option>)}</select>
        <p className="field-hint">{t.offersCostBasis}</p>
        <ul className="mt-4 space-y-4">{result.rows.map(({ entry, periodCents, differenceCents }) => <li key={entry.record.recordId} className="result-panel">
          <h4 className="font-semibold">{comparisonPolicy.retailers.find((r) => r.id === entry.record.retailerId)?.name ?? entry.record.retailerId} · {entry.record.plan.name}</h4>
          <p>{t.offersPeriodCost}: {money(periodCents)}</p>
          {differenceCents !== null && <p>{t.offersDifference}: {money(differenceCents)}</p>}
          <p className="field-hint">{t.offersConditions}</p>
          <a className="source-link" href={entry.record.provenance.sourceUrl} rel="noreferrer">{t.source}</a><p className="field-hint">{t.offersReviewed}: <time dateTime={entry.review.reviewedAt}>{entry.review.reviewedAt.slice(0, 10)}</time></p>
        </li>)}</ul>
      </>}
    </>}
    <details className="mt-4"><summary>{t.offersLimitations}</summary><p className="field-hint">{t.ratings.pricePolicy}</p><p className="field-hint">{t.comparisonGate}</p><p className="field-hint">{t.offersAnnual}</p><p className="field-hint">{comparisonPlans.entries.length ? t.offersCoverage : t.comparisonCoverage}</p></details>
    <p className="mt-4 text-sm leading-7">{t.externalNotice}</p><a className="text-action" href="https://www.billy.govt.nz/" rel="noreferrer">{t.externalBilly}</a>
  </aside>;
}
