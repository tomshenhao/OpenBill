import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) test(`${locale}: honest supplier state and local-only comparison controls`, async ({ page }) => {
  const t = messages[locale].analysis;
  await page.goto(locale === "en" ? "/electricity/" : "/zh/electricity/");
  await page.waitForLoadState("networkidle");
  const requests: string[] = []; page.on("request", (request) => requests.push(request.url()));
  await page.locator("#bill-kwh").fill("223");
  await page.getByRole("button", { name: t.journey.next, exact: true }).click();
  const supplier = page.getByRole("complementary", { name: t.offersHeading });
  await expect(supplier.getByText(t.comparisonBody, { exact: true })).toBeVisible();
  await expect(supplier.locator("select")).toHaveCount(0);
  await expect(supplier.getByTestId("supplier-data-limitation")).toHaveText(t.journey.noPriceInputs);
  await expect(page.locator("#bill-totalNzd")).not.toBeVisible();
  await supplier.locator("summary").click();
  await expect(supplier.getByText(t.offersAnnual, { exact: true })).toBeVisible();
  await expect(supplier.getByText(t.comparisonCoverage, { exact: true })).toBeVisible();
  await expect(supplier.getByRole("link", { name: t.externalBilly })).toHaveAttribute("href", "https://www.billy.govt.nz/");
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, cookies: "", fits: true });
  expect(page.url()).not.toContain("223");
});
