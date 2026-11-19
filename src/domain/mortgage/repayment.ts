import { parseMortgageMoney } from "./money.ts";

export const frequencies = { weekly: 52, fortnightly: 26, monthly: 12 } as const;
export type Frequency = keyof typeof frequencies;

export type MortgageInput = {
  amount: string;
  annualRate: string;
  years: string;
  type: "principal" | "interest-only";
  frequency: Frequency;
  interestOnlyYears: string;
};

const percent = /^\d{1,3}(\.\d{1,4})?$/;
const halfYears = /^(\d{1,2})(\.[05]0?)?$/;

export function parseMortgage(input: MortgageInput) {
  const cents = parseMortgageMoney(input.amount);
  if (cents === null || cents <= 0) return { ok: false as const, field: "amount" as const };
  const annualRate = Number(input.annualRate);
  if (!percent.test(input.annualRate) || annualRate > 100) return { ok: false as const, field: "annualRate" as const };
  const years = Number(input.years);
  if (!halfYears.test(input.years) || years < 0.5 || years > 40) return { ok: false as const, field: "years" as const };
  const interestOnly = input.type === "interest-only";
  const transition = interestOnly && input.interestOnlyYears !== "";
  const interestOnlyYears = transition ? Number(input.interestOnlyYears) : interestOnly ? years : 0;
  if (transition && (!halfYears.test(input.interestOnlyYears) || interestOnlyYears < 0.5 || interestOnlyYears >= years)) {
    return { ok: false as const, field: "interestOnlyYears" as const };
  }
  return {
    ok: true as const, cents, rateUnits: Math.round(annualRate * 10_000),
    years, interestOnlyYears,
  };
}

type Mortgage = Extract<ReturnType<typeof parseMortgage>, { ok: true }>;

export function parseExtraRepayment(value: string): number | null {
  if (value.trim() === "") return 0;
  return parseMortgageMoney(value);
}

export function estimateMortgage(loan: Mortgage, frequency: Frequency, extraCents = 0) {
  const perYear = frequencies[frequency];
  const count = loan.years * perYear;
  const onlyCount = loan.interestOnlyYears * perYear;
  const denominator = BigInt(1_000_000 * perYear);
  const rate = loan.rateUnits / Number(denominator);
  const rateUnits = BigInt(loan.rateUnits);
  const periodInterest = (balance: number) => Number((BigInt(balance) * rateUnits + denominator / 2n) / denominator);
  const remainingCount = count - onlyCount;
  const principalPayment = remainingCount === 0 ? null : Math.round(
    rate === 0 ? loan.cents / remainingCount : loan.cents * rate / -Math.expm1(-remainingCount * Math.log1p(rate)),
  );
  const interestOnlyPayment = onlyCount > 0 ? periodInterest(loan.cents) : null;
  const regularPayment = interestOnlyPayment ?? principalPayment ?? 0;

  let balance = loan.cents;
  let interest = 0;
  let paid = 0;
  let periods = 0;
  const balances = [{ period: 0, balance }];
  for (let period = 1; period <= count && balance > 0; period += 1) {
    const charge = periodInterest(balance);
    const due = balance + charge;
    const payment = period <= onlyCount ? charge
      : period === count ? due : Math.min(due, Math.max(charge, (principalPayment ?? 0) + extraCents));
    interest += charge;
    paid += payment;
    balance = due - payment;
    periods = period;
    if (period % perYear === 0 || period === onlyCount || period === count || balance === 0) balances.push({ period, balance });
  }
  return {
    regularPayment, transitionPayment: onlyCount > 0 ? principalPayment : null,
    interest, paid, balance, periods, balances,
  };
}
