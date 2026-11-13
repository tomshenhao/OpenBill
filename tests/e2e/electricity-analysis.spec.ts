import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";

// All entered values are explicitly synthetic QA values, never real household data.
for (const locale of ["en", "zh"] as const) {
  const path = locale === "en" ? "/electricity/" : "/zh/electricity/", t = messages[locale].analysis;
  test(`${locale}: bill, monthly official benchmark and contextual tips`, async ({ page }) => {
    const errors: string[] = []; page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(path); await expect(page).toHaveTitle(t.metaTitle);
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "en" ? "en-NZ" : "zh-Hans-NZ");
    await page.getByRole("button", { name: t.calculate, exact: true }).click();
    await expect(page.locator("#bill-error")).toHaveText(t.invalid); await expect(page.locator("#bill-error")).toBeFocused();
    await page.getByLabel(t.days, { exact: true }).fill("31"); await page.getByLabel(t.kwh, { exact: true }).fill("922"); await page.getByLabel(t.total, { exact: true }).fill("120");
    await page.getByText(t.context, { exact: true }).click();
    await page.getByLabel(t.region, { exact: true }).selectOption("NZ-NTL"); await page.getByLabel(t.month, { exact: true }).selectOption("2025-01"); await page.getByLabel(t.fullMonth, { exact: true }).check();
    await page.getByLabel(t.people, { exact: true }).fill("2"); await page.getByLabel(t.heating, { exact: true }).selectOption("heat-pump"); await page.getByLabel(t.hotWater, { exact: true }).selectOption("electric"); await page.getByLabel(t.estimated, { exact: true }).check();
    await page.getByRole("button", { name: t.calculate, exact: true }).click();
    await expect(page.getByTestId("bill-daily-kwh")).toContainText("29.74"); await expect(page.getByTestId("bill-blended")).toContainText("13.02");
    await expect(page.getByTestId("benchmark-difference")).toContainText("100.0%");
    await expect(page.getByTestId("regional-range")).toContainText(t.regionalRange);
    await expect(page.getByText(t.householdUnavailable, { exact: true })).toBeVisible();
    await expect(page.locator("[data-tip]")).toHaveCount(3); await expect(page.locator('[data-tip="hotWater"]')).toContainText(t.advice.hotWater.condition);
    await expect(page.getByText(t.comparisonBody, { exact: true })).toBeVisible();
    await page.getByText(t.sourceTitle, { exact: true }).click(); await expect(page.getByText(t.sourceCaveats, { exact: true })).toBeVisible();
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations).toEqual([]); expect(errors).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 }); expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByLabel(t.days, { exact: true }).fill("30"); await page.getByRole("button", { name: t.calculate, exact: true }).click();
    await expect(page.getByTestId("benchmark-difference")).toHaveCount(0); await expect(page.getByTestId("benchmark-requirement")).toBeVisible();
  });

  test(`${locale}: mixed GST, zero usage and privacy boundaries`, async ({ page, context }) => {
    await page.goto(path); await page.waitForLoadState("networkidle");
    const requests: string[] = [], logs: string[] = [];
    page.on("request", (request) => requests.push(request.url())); page.on("console", (m) => logs.push(m.text()));
    await page.getByLabel(t.days, { exact: true }).fill("30"); await page.getByLabel(t.kwh, { exact: true }).fill("300"); await page.getByLabel(t.total, { exact: true }).fill("100");
    await page.getByLabel(t.gst, { exact: true }).selectOption("exclusive"); await page.getByText(t.optional, { exact: true }).click();
    await page.getByLabel(t.daily, { exact: true }).fill("1"); await page.getByLabel(t.rate, { exact: true }).fill("20"); await page.getByLabel(t.dailyGst, { exact: true }).selectOption("exclusive");
    await expect(page.getByText(t.rateExample, { exact: true })).toBeVisible();
    await page.getByLabel(t.rate, { exact: true }).fill("0.29");
    await expect(page.getByText(t.unitWarnings["sub-cent"], { exact: true })).toBeVisible();
    await page.getByLabel(t.rate, { exact: true }).fill("20");
    await page.getByLabel(t.meter, { exact: true }).selectOption("smart");
    await page.getByLabel(t.peak, { exact: true }).fill("100"); await page.getByLabel(t.offPeak, { exact: true }).fill("150"); await page.getByLabel(t.controlled, { exact: true }).fill("50");
    await page.getByRole("button", { name: t.calculate, exact: true }).click();
    await expect(page.getByTestId("bill-blended")).toContainText("38.33"); await expect(page.locator(".analysis-subtotal").filter({ has: page.getByRole("heading", { name: t.components, exact: true }) })).toContainText("94.50");
    expect(requests).toEqual([]); expect(logs).toEqual([]); await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length }))).toEqual({ local: 0, session: 0, databases: 0 });
    await page.getByRole("button", { name: t.clear, exact: true }).click();
    await expect(page.getByLabel(t.total, { exact: true })).toHaveValue(""); await expect(page.getByTestId("bill-blended")).toHaveCount(0);
    await page.getByLabel(t.days, { exact: true }).fill("30"); await page.getByLabel(t.kwh, { exact: true }).fill("0"); await page.getByLabel(t.total, { exact: true }).fill("0");
    await page.getByRole("button", { name: t.calculate, exact: true }).click(); await expect(page.getByTestId("bill-blended")).toHaveText(t.noUsageRate);
    await page.getByRole("link", { name: messages[locale].otherLanguage, exact: true }).click();
    await expect(page.getByLabel(messages[locale === "en" ? "zh" : "en"].analysis.total, { exact: true })).toHaveValue("");
  });
}
