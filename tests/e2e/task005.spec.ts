import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) test(`${locale}: official pricing is pending and manual comparison stays local`, async ({ page }) => {
  const { analysis: a, electricityReview: t } = messages[locale];
  await page.goto(locale === "en" ? "/electricity/" : "/zh/electricity/");
  await page.waitForLoadState("networkidle");
  const requests: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  await expect(page.getByTestId("supplier-data-limitation")).toHaveText(t.official);
  await expect(page.getByTestId("price-rating")).toHaveCount(0);
  await expect(page.getByText(t.quote, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: t.manual }).click();
  await page.locator("#bill-kwh").fill("223");
  await page.locator("#bill-days").fill("34");
  await page.getByText(t.quote, { exact: true }).click();
  const quote = page.getByRole("region", { name: t.save }).locator("details").filter({ hasText: t.quote });
  await quote.getByLabel(a.daily, { exact: true }).fill("1");
  await quote.getByLabel(a.rate, { exact: true }).fill("20");
  await quote.getByLabel(a.rateGst, { exact: true }).selectOption("inclusive");
  await expect(quote.getByText(t.quoteTotal, { exact: true }).locator("..")).toContainText("78.60");
  await expect(page.getByTestId("supplier-data-limitation")).toHaveText(t.official);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, cookies: "", fits: true });
  expect(page.url()).not.toContain("223");
});
