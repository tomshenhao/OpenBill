import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { languageTags, messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) {
  test(`${locale}: NZD grouping preserves the editing caret and all three repayment frequencies`, async ({ page }) => {
    const t = messages[locale].mortgage;
    await page.goto(locale === "en" ? "/mortgage/" : "/zh/mortgage/");
    const amount = page.getByLabel(t.amount);
    const rate = page.getByLabel(t.annualRate);
    await amount.fill("500000");
    await amount.evaluate((input: HTMLInputElement) => input.setSelectionRange(1, 1));
    await amount.press("2");
    await expect(amount).toHaveValue("5200000");
    expect(await amount.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(2);
    await amount.fill("125000.50");
    await rate.fill("0");
    await expect(amount).toHaveValue("125,000.50");
    await expect(rate).toHaveValue("0");
    await amount.fill("500000");
    await page.getByLabel(t.years, { exact: true }).fill("1");
    await expect(amount).toHaveValue("500,000");
    const calculate = page.getByRole("button", { name: t.calculate });
    for (const [frequency, expected] of [
      ["weekly", "9,615.38"], ["fortnightly", "19,230.77"], ["monthly", "41,666.67"],
    ]) {
      await page.getByLabel(t.frequency).selectOption(frequency);
      await calculate.click();
      await expect(page.getByTestId("mortgage-payment")).toContainText(expected);
    }
    await page.getByText(t.extraTitle, { exact: true }).click();
    const extra = page.getByLabel(t.extra, { exact: true });
    await extra.fill("1250.50");
    await expect(extra).toHaveValue("1250.50");
    await extra.press("Tab");
    await expect(extra).toHaveValue("1,250.50");
  });

  test(`${locale}: private mortgage repayments, interest-only transition and bank source filters`, async ({ page }) => {
    const home = locale === "en" ? "/" : "/zh/";
    const t = messages[locale].mortgage;
    await page.goto(home);
    await page.getByRole("link", { name: messages[locale].product.categories.mortgage.name, exact: true }).click();
    await expect(page).toHaveURL(`${home}mortgage/`);
    await expect(page).toHaveTitle(t.metaTitle);
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[locale]);
    await expect(page.getByRole("heading", { name: t.title })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    const form = page.getByRole("form", { name: t.calculator });
    const calculate = form.getByRole("button", { name: t.calculate });
    await calculate.click();
    await expect(form.getByLabel(t.amount)).toBeFocused();
    await expect(form.getByRole("alert")).toHaveText(t.errors.amount);
    await form.getByLabel(t.amount).fill("400000");
    await form.getByLabel(t.annualRate).fill("4");
    await form.getByLabel(t.years, { exact: true }).fill("20");
    await expect(form.getByLabel(t.interestOnlyYears)).toBeHidden();
    await calculate.click();
    await expect(page.getByTestId("mortgage-payment")).toContainText("2,423.92");
    await expect(page.getByRole("heading", { name: t.comparison })).toBeVisible();
    await page.getByText(t.balances, { exact: true }).click();
    await expect(page.getByRole("table", { name: t.balances })).toBeVisible();
    await page.getByText(t.extraTitle, { exact: true }).click();
    await page.getByLabel(t.extra, { exact: true }).fill("100");
    await expect(page.getByText(t.extraResult)).toBeVisible();

    await form.getByLabel(t.type, { exact: true }).selectOption("interest-only");
    await form.getByLabel(t.amount).fill("120000");
    await form.getByLabel(t.annualRate).fill("6");
    await form.getByLabel(t.years, { exact: true }).fill("10");
    await expect(page.getByText(t.interestOnlyWarning)).toBeVisible();
    await calculate.click();
    await expect(page.getByTestId("mortgage-payment")).toContainText("600.00");
    await expect(page.getByText(t.transition)).toBeHidden();
    await form.getByLabel(t.interestOnlyYears).fill("10");
    await calculate.click();
    await expect(form.getByRole("alert")).toHaveText(t.errors.interestOnlyYears);
    await form.getByLabel(t.interestOnlyYears).fill("2");
    await form.getByLabel(t.frequency, { exact: true }).selectOption("weekly");
    await calculate.click();
    await expect(page.getByTestId("mortgage-payment")).toContainText("138.46");
    await expect(page.getByText(t.transition)).toBeVisible();
    await expect(page.getByText(t.extraTitle)).toBeHidden();

    const table = page.getByRole("table", { name: t.rates });
    await expect(page.getByText(t.noRates)).toBeVisible();
    await expect(page.getByText(t.rateStatusHelp)).toBeVisible();
    await expect(table.getByRole("cell", { name: t.missing, exact: true })).toHaveCount(64);
    await expect(table.getByRole("row")).toHaveCount(9);
    await expect(table.getByRole("columnheader")).toHaveCount(9);
    await expect(table.getByRole("rowheader", { name: /ANZ/ }).getByRole("link"))
      .toHaveAttribute("href", "https://www.anz.co.nz/rates-fees-agreements/home-loans/");
    await expect(table.getByRole("rowheader", { name: /Kiwibank/ }).getByText(t.linkPending)).toBeVisible();
    const sbs = table.getByRole("rowheader", { name: /SBS Bank/ });
    await expect(sbs.getByText(t.linkPending)).toBeVisible();
    await expect(sbs.getByRole("link")).toHaveCount(0);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByLabel(t.rateTerm).selectOption("floating");
    await page.getByLabel(t.rateBasis).selectOption("special");
    await page.getByLabel(t.occupancy).selectOption("investment");
    await expect(table.getByRole("columnheader")).toHaveCount(2);
    await expect(table.getByRole("columnheader", { name: t.terms.floating })).toBeVisible();
    await expect(page.getByRole("button", { name: t.apply })).toHaveCount(0);

    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    expect(requests).toEqual([]);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie })))
      .toEqual({ local: 0, session: 0, cookie: "" });
    await form.getByRole("button", { name: t.clear }).click();
    await expect(form.getByLabel(t.amount)).toHaveValue("");
    await expect(page.getByTestId("mortgage-payment")).toHaveCount(0);
  });
}
