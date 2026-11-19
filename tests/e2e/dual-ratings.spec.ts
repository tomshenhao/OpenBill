import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";
import { readFileSync } from "node:fs";
import { openRegionalDetails } from "./journey-helpers";

const data = JSON.parse(readFileSync("data/electricity/benchmarks/regional-monthly-ratings.json", "utf8")) as { rows: { region: string; month: string; p75Kwh: number; p95Kwh: number }[] };
const thresholds = data.rows.find((row) => row.region === "NZ-AUK" && row.month === "2026-06")!;
// All bill inputs are synthetic QA values, not a household bill.
for (const locale of ["en", "zh"] as const) test(`${locale}: independent ratings, layout, boundaries and privacy`, async ({ page }) => {
  const t = messages[locale].analysis;
  await page.goto(locale === "en" ? "/electricity/" : "/zh/electricity/");
  await page.waitForLoadState("networkidle");
  const requests: string[] = [], logs: string[] = []; page.on("request", (r) => requests.push(r.url())); page.on("console", (m) => logs.push(m.text()));
  const usage = page.getByTestId("usage-rating"), price = page.getByTestId("price-rating");
  await expect(usage).toHaveAttribute("data-rating", "unknown"); await expect(price).not.toBeVisible();
  await page.locator("#bill-kwh").fill("223");
  await page.locator("#bill-region").selectOption("NZ-AUK");
  await page.locator("#bill-start").fill("2026-06-01"); await page.locator("#bill-end").fill("2026-06-30");

  await expect(usage).toHaveAttribute("data-rating", "green"); await expect(usage).toContainText(t.ratings.usageLabels.green);
  await expect(usage).toContainText(t.ratings.population); await expect(usage).toContainText(new Intl.NumberFormat(locale === "en" ? "en-NZ" : "zh-Hans-NZ").format(thresholds.p95Kwh));
  await expect(usage.getByRole("img")).toBeVisible();
  await page.getByRole("button", { name: t.journey.next, exact: true }).click();
  await expect(page.locator("#price-step-heading")).toBeFocused();
  await expect(price).toHaveAttribute("data-rating", "unknown"); await expect(price).toContainText(t.ratings.priceLabels.unknown);
  await expect(page.getByTestId("advanced-bill")).not.toHaveAttribute("open", "");
  await expect(page.getByTestId("bill-blended")).not.toBeVisible();
  const a = (await page.getByTestId("usage-step-grid").locator(":scope > div").first().boundingBox())!, b = (await usage.boundingBox())!;
  if (page.viewportSize()!.width >= 768) { expect(Math.abs(a.y - b.y)).toBeLessThan(2); expect(b.x).toBeGreaterThan(a.x); }
  else { expect(b.y).toBeGreaterThan(a.y + a.height); }
  for (const [kwh, rating] of [[thresholds.p75Kwh, "green"], [thresholds.p75Kwh + 0.001, "yellow"], [thresholds.p95Kwh, "yellow"], [thresholds.p95Kwh + 0.001, "red"]] as const) {
    await page.locator("#bill-kwh").fill(String(kwh));
    await expect(usage).toHaveAttribute("data-rating", rating); await expect(price).toHaveAttribute("data-rating", "unknown");
  }
  await expect(usage).toContainText(t.ratings.highAdvice); await expect(usage).toContainText(t.ratings.safety);
  await expect(page.locator("[data-tip]")).toHaveCount(3);
  await expect(page.locator('[data-tip="appliances"]')).toBeVisible();
  const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(accessibility.violations).toEqual([]);
  await page.locator("#bill-start").fill("2026-05-16"); await page.locator("#bill-end").fill("2026-06-15");
  await openRegionalDetails(page);
  await page.locator("summary").filter({ hasText: t.approximateTitle }).click();
  await page.getByLabel(t.allowApproximate, { exact: true }).check();
  await expect(usage).toHaveAttribute("data-rating", "unknown"); await expect(page.getByTestId("approximate-comparison")).toBeVisible();
  await expect(price).toHaveAttribute("data-rating", "unknown");
  expect(requests).toEqual([]); expect(logs).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, cookies: "", fits: true });
  await page.getByRole("button", { name: t.clear, exact: true }).click();
  await expect(usage).toHaveAttribute("data-rating", "unknown"); await expect(price).not.toBeVisible();
});
