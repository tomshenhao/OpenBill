import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) test(`${locale}: household comparisons stay outside the electricity interface`, async ({ page }) => {
  const { analysis: a, electricityReview: t } = messages[locale];
  await page.goto(locale === "en" ? "/electricity/" : "/zh/electricity/");
  await page.waitForLoadState("networkidle");
  const requests: string[] = [], logs: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => logs.push(message.text()));

  await expect(page.locator("main > section")).toHaveCount(2);
  await expect(page.getByRole("heading", { level: 2 })).toHaveText([t.understand, t.save]);
  await page.getByRole("button", { name: t.manual }).click();
  for (const kwh of ["0", "223", "1061"]) {
    await page.locator("#bill-kwh").fill(kwh);
    await expect(page.locator("#bill-region, #bill-month, [data-rating], [data-testid=regional-details]")).toHaveCount(0);
  }
  await expect(page.getByText(a.journey.usageStep, { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("supplier-data-limitation")).toHaveText(t.official);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  expect(requests).toEqual([]);
  expect(logs).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, cookies: "", fits: true });
});
