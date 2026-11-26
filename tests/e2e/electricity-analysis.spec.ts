import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) {
  const path = locale === "en" ? "/electricity/" : "/zh/electricity/";
  const { analysis: a, electricityReview: t } = messages[locale];
  test(`${locale}: manual bill, cost shares and daily savings`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page).toHaveTitle(a.metaTitle);
    await expect(page.locator("html")).toHaveAttribute("lang", locale === "en" ? "en-NZ" : "zh-Hans-NZ");
    await page.getByRole("button", { name: t.manual }).click();
    await page.locator("#bill-days").fill("30");
    await page.locator("#bill-kwh").fill("300");
    await page.locator("#bill-dailyNzd").fill("1");
    await page.locator("#bill-usageCents").fill("30");
    await page.getByTestId("electricity-edit").getByLabel(a.rateGst, { exact: true }).selectOption("inclusive");
    await page.locator("#bill-totalNzd").fill("120");
    const saving = page.getByRole("region", { name: t.save });
    await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.matches);
    await expect(saving.getByText(t.fixedShare, { exact: true }).locator("..")).toContainText("25%");
    await expect(saving.getByText(t.usageShare, { exact: true }).locator("..")).toContainText("75%");
    await expect(saving.getByText(t.dailyUsage, { exact: true }).locator("..")).toContainText("10 kWh");
    await expect(saving.getByText(t.dailyCost, { exact: true }).locator("..")).toContainText("4.00");
    for (const [percent, amount] of [[5, "4.50"], [10, "9.00"], [20, "18.00"]]) {
      const group = saving.getByRole("heading", { name: t.reduction.replace("{percent}", String(percent)) }).locator("..");
      await expect(group.getByText(t.savings, { exact: true }).locator("..")).toContainText(String(amount));
    }
    await saving.getByLabel(t.context).selectOption("occupied");
    await expect(saving.getByText(t.advice.occupied)).toBeVisible();
    expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
    expect(errors).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`${locale}: mixed GST, zero usage and privacy boundaries`, async ({ page, context }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const requests: string[] = [], logs: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("console", (message) => logs.push(message.text()));
    await page.getByRole("button", { name: t.manual }).click();
    await page.locator("#bill-days").fill("30");
    await page.locator("#bill-kwh").fill("300");
    await page.locator("#bill-dailyNzd").fill("1");
    await page.locator("#bill-usageCents").fill("20");
    await page.getByTestId("electricity-edit").getByLabel(a.rateGst, { exact: true }).selectOption("inclusive");
    await page.getByTestId("electricity-edit").getByText(t.advanced, { exact: true }).click();
    await page.getByLabel(a.dailyGst, { exact: true }).selectOption("exclusive");
    await page.locator("#bill-totalNzd").fill("94.50");
    await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.matches);
    await expect(page.getByTestId("current-electricity-review").getByText(t.gst, { exact: true }).locator("..")).toContainText("12.33");
    await expect(page.getByText(t.effective, { exact: true }).locator("..")).toContainText("0.32");
    await page.locator("#bill-kwh").fill("0");
    await page.locator("#bill-totalNzd").fill("34.50");
    await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.matches);
    await expect(page.getByText(t.effective, { exact: true })).toHaveCount(0);
    expect(requests).toEqual([]);
    expect(logs).toEqual([]);
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length }))).toEqual({ local: 0, session: 0, databases: 0 });
    await page.getByRole("button", { name: t.reset }).click();
    await expect(page.getByTestId("current-electricity-review")).toHaveCount(0);
    await page.getByRole("button", { name: t.manual }).click();
    await expect(page.locator("#bill-totalNzd")).toHaveValue("");
    await page.locator("#bill-kwh").fill("125");
    await page.getByRole("link", { name: messages[locale].otherLanguage, exact: true }).click();
    await expect(page.locator("#bill-kwh")).toHaveCount(0);
  });
}
