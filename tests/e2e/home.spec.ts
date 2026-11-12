import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const locales = [
  { path: "/", lang: "en-NZ", title: "Less on bills.", usage: "Electricity used", days: "Days in this billing period", submit: "Show my daily usage", clear: "Clear inputs", switch: "简体中文", otherPath: "/zh/", priceNotice: "Verified prices come next" },
  { path: "/zh/", lang: "zh-Hans-NZ", title: "让账单更轻，", usage: "用电量", days: "本计费周期的天数", submit: "查看日均用电量", clear: "清空输入", switch: "English", otherPath: "/", priceNotice: "核实价格后，再提供比价" },
] as const;

for (const locale of locales) {
  test(`${locale.lang}: accessible, responsive homepage and usage result`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(locale.path);
    await expect(page.locator("html")).toHaveAttribute("lang", locale.lang);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(locale.title);
    await expect(page.getByRole("heading", { name: locale.priceNotice })).toBeVisible();
    await page.getByLabel(locale.usage, { exact: true }).fill("372");
    await page.getByLabel(locale.days, { exact: true }).fill("31");
    await page.getByRole("button", { name: locale.submit, exact: true }).click();
    await expect(page.getByTestId("daily-average")).toHaveText("12.00");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    expect(errors).toEqual([]);
  });

  test(`${locale.lang}: validation, focus, editing and clear`, async ({ page }) => {
    await page.goto(locale.path);
    const usage = page.getByLabel(locale.usage, { exact: true });
    const days = page.getByLabel(locale.days, { exact: true });
    const submit = page.getByRole("button", { name: locale.submit, exact: true });
    await submit.click();
    await expect(usage).toHaveAttribute("aria-invalid", "true");
    await expect(usage).toBeFocused();
    await usage.fill("300");
    await days.fill("0");
    await submit.click();
    await expect(days).toHaveAttribute("aria-invalid", "true");
    await expect(days).toBeFocused();
    await days.fill("30");
    await days.press("Enter");
    await expect(page.getByTestId("daily-average")).toHaveText("10.00");
    await usage.fill("600");
    await expect(page.getByTestId("daily-average")).toHaveCount(0);
    await submit.click();
    await expect(page.getByTestId("daily-average")).toHaveText("20.00");
    await page.getByRole("button", { name: locale.clear, exact: true }).click();
    await expect(usage).toHaveValue("");
    await expect(days).toHaveValue("");
    await expect(usage).toBeFocused();
    await expect(page.getByTestId("daily-average")).toHaveCount(0);
  });

  test(`${locale.lang}: inputs cause no requests, logs, storage or URL changes`, async ({ page, context }) => {
    await page.goto(locale.path);
    await page.waitForLoadState("networkidle");
    let requests = 0;
    let consoleMessages = 0;
    page.on("request", () => { requests += 1; });
    page.on("console", () => { consoleMessages += 1; });
    await page.getByLabel(locale.usage, { exact: true }).fill("543.21");
    await page.getByLabel(locale.days, { exact: true }).fill("29");
    await page.getByRole("button", { name: locale.submit, exact: true }).click();
    await expect(page.getByTestId("daily-average")).toHaveText("18.73");
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    expect(requests).toBe(0);
    expect(consoleMessages).toBe(0);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, search: location.search, hash: location.hash }))).toEqual({ local: 0, session: 0, search: "", hash: "" });
    expect(await context.cookies()).toEqual([]);
    await page.reload();
    await expect(page.getByLabel(locale.usage, { exact: true })).toHaveValue("");
    await expect(page.getByLabel(locale.days, { exact: true })).toHaveValue("");
  });

  test(`${locale.lang}: changing language clears inputs`, async ({ page }) => {
    await page.goto(locale.path);
    await page.getByLabel(locale.usage, { exact: true }).fill("543.21");
    await page.getByRole("link", { name: locale.switch, exact: true }).click();
    await expect(page).toHaveURL(`http://127.0.0.1:3100${locale.otherPath}`);
    await expect(page.locator("#usage-kwh")).toHaveValue("");
    await expect(page.locator("#usage-days")).toHaveValue("");
  });
}

test("unknown routes return a 404", async ({ page }) => {
  const response = await page.goto("/unsupported/");
  expect(response?.status()).toBe(404);
});
