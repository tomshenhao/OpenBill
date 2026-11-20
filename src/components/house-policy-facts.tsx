import { formatHouseMoney, housePremiumEquivalents, readHouseQuote, type HouseQuote } from "@/domain/insurance/house";
import { languageTags, messages, type Locale } from "@/i18n";

export function HousePolicyFacts({ policy, locale, summary = false }: { policy: HouseQuote; locale: Locale; summary?: boolean }) {
  const t = messages[locale].houseInsurance;
  const { amounts } = readHouseQuote(policy);
  const money = (cents: number | null) => cents === null ? t.unknown : formatHouseMoney(cents, languageTags[locale]);
  const equivalents = amounts.premium === null ? null : housePremiumEquivalents(amounts.premium);
  const facts = [
    { label: t.insurer, value: policy.insurer.trim() || t.unknown },
    { label: t.product, value: policy.product.trim() || t.unknown },
    { label: t.summaryInsured, value: money(amounts.sumInsured) },
    { label: t.summaryExcess, value: money(amounts.standardExcess) },
  ];
  if (!summary || equivalents) facts.push({ label: t.summaryPremium, value: money(amounts.premium) });
  if (summary && equivalents) {
    facts.push({ label: t.monthlyPremium, value: money(equivalents.monthly) }, { label: t.weeklyPremium, value: money(equivalents.weekly) });
  }

  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {facts.map(({ label, value }) => (
        <div key={label} className="min-w-0 wrap-anywhere">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="mt-1 font-semibold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
