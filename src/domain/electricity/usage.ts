export type UsageInput = { kwh: string; days: string };
export type UsageError = "usageRequired" | "usageInvalid" | "daysRequired" | "daysInvalid";
export type UsageErrors = Partial<Record<keyof UsageInput, UsageError>>;
export type UsageSummary = { kwh: number; days: number; dailyKwh: number };
export type UsageResult = { ok: true; summary: UsageSummary } | { ok: false; errors: UsageErrors };

// Pure calculation: no UI, tariffs, I/O, persistence, or logging.
// 0–100,000 kWh and 1–366 days are input guardrails, not typical household usage.
export function calculateUsage(input: UsageInput): UsageResult {
  const kwhText = input.kwh.trim();
  const daysText = input.days.trim();
  const errors: UsageErrors = {};

  if (!kwhText) errors.kwh = "usageRequired";
  else if (!/^\d+(?:\.\d{1,3})?$/.test(kwhText) || Number(kwhText) > 100_000) {
    errors.kwh = "usageInvalid";
  }

  if (!daysText) errors.days = "daysRequired";
  else if (!/^\d+$/.test(daysText) || Number(daysText) < 1 || Number(daysText) > 366) {
    errors.days = "daysInvalid";
  }

  if (Object.keys(errors).length) return { ok: false, errors };

  const kwh = Number(kwhText);
  const days = Number(daysText);
  return { ok: true, summary: { kwh, days, dailyKwh: kwh / days } };
}
