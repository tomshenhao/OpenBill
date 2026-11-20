import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { languageTags, messages } from "../../src/i18n";

for (const locale of ["en", "zh"] as const) {
  const alternate = locale === "en" ? "zh" : "en";
  const prefix = locale === "en" ? "" : "/zh";
  const path = `${prefix}/insurance/house/`;
  const copy = messages[locale];
  const t = copy.houseInsurance;

  test(`${locale}: the policy summary and quote comparison share private inputs without verifying coverage`, async ({ page, isMobile, context }) => {
    if (isMobile) await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${prefix}/insurance/`);
    const card = page.getByRole("link", { name: copy.insurance.modules.house.title, exact: true });
    await card.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(path);
    await expect(page).toHaveTitle(`${copy.insurance.modules.house.title} | OpenBill`);
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[locale]);
    await page.waitForLoadState("networkidle");
    const requests: string[] = [];
    page.on("request", (request) => requests.push(request.url()));

    await expect(page.getByText(t.privacy, { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: t.pending })).toContainText(t.pendingBody);
    await expect(page.locator("form, input[type=file]")).toHaveCount(0);
    const entry = page.getByRole("region", { name: t.enterPolicy, exact: true });
    const summary = page.locator("#house-summary-heading").locator("..");
    const coverage = page.getByRole("region", { name: t.review, exact: true });
    const status = coverage.getByTestId("house-coverage-status");
    const quotes = page.getByRole("region", { name: t.quotes, exact: true });
    const reference = quotes.getByRole("region", { name: t.reference, exact: true });
    await expect(summary).toBeHidden();
    await expect(entry.locator("input")).toHaveCount(5);
    await expect(entry.locator("select")).toHaveCount(0);
    await expect(quotes.locator("fieldset")).toHaveCount(1);
    await expect(reference.locator("input, select")).toHaveCount(0);
    await expect(quotes.getByText(t.referencePremiumNeeded)).toBeVisible();
    await expect(page.getByLabel(t.wordingVersion)).toBeHidden();
    await expect(status).toHaveText(t.coverageUnverified);

    const insurer = entry.getByLabel(t.insurer, { exact: true });
    const help = entry.locator("summary").first();
    await help.focus();
    await page.keyboard.press("Enter");
    await expect(entry.getByText(t.help.insurer)).toBeVisible();
    await expect(insurer).toHaveAccessibleDescription(t.help.insurer);
    await insurer.fill("Example Insurer");
    await entry.getByLabel(t.product, { exact: true }).fill("Home Cover");
    const sumInsured = entry.getByLabel(t.basicLabels.sumInsured, { exact: true });
    await sumInsured.fill("700000");
    await sumInsured.press("Tab");
    await expect(sumInsured).toHaveValue("700,000");
    await entry.getByLabel(t.basicLabels.standardExcess, { exact: true }).fill("750");
    const annual = entry.getByLabel(t.basicLabels.premium, { exact: true });

    await entry.getByRole("button", { name: t.reviewAction, exact: true }).click();
    await expect(summary).toBeFocused();
    await expect(summary).toContainText("Example Insurer");
    await expect(summary).toContainText("Home Cover");
    await expect(summary).toContainText("NZ$700,000.00");
    await expect(summary).toContainText("NZ$750.00");
    await expect(summary).not.toContainText(t.monthlyPremium);
    await expect(summary).not.toContainText(t.weeklyPremium);
    await expect(quotes.getByText(t.referencePremiumNeeded)).toBeVisible();

    await annual.fill("NZ$1,500");
    await entry.getByRole("button", { name: t.reviewAction, exact: true }).click();
    for (const amount of ["NZ$1,500.00", "NZ$125.00", "NZ$28.85"]) await expect(summary).toContainText(amount);
    await expect(summary).toContainText(t.rebuildExplanation);
    await expect(summary).toContainText(t.excessExplanation);
    await expect(summary).toContainText(t.paymentExplanation);
    for (const value of ["Example Insurer", "Home Cover", "NZ$700,000.00", "NZ$750.00", "NZ$1,500.00"]) {
      await expect(reference).toContainText(value);
    }
    const namedPolicy = coverage.getByTestId("house-coverage-policy");
    await expect(namedPolicy).toContainText("Example Insurer");
    await expect(namedPolicy).toContainText("Home Cover");
    await expect(coverage.getByText(t.generalGuidance)).toBeVisible();
    await expect(coverage.getByText(t.wordingUnavailable)).toBeVisible();

    await expect(coverage.locator("details[data-event]")).toHaveCount(11);
    const earthquake = coverage.locator('[data-event="earthquake"]');
    await earthquake.locator("summary").first().click();
    await expect(earthquake.getByText(t.eventGuidance.earthquake.cover)).toBeVisible();
    await expect(earthquake.getByLabel(t.source)).toBeHidden();
    await earthquake.getByText(t.advancedEvent, { exact: true }).click();
    await earthquake.getByLabel(t.stateLabel).selectOption("covered");
    await expect(earthquake.getByText(`${t.personalStatus} · ${t.states.unverified}`)).toBeVisible();
    await earthquake.getByLabel(t.source).fill("Synthetic section 4");
    await page.locator("summary").filter({ hasText: new RegExp(`^${t.advanced}$`) }).first().click();
    await page.getByLabel(t.wordingVersion).fill("Synthetic edition");
    await expect(earthquake.getByText(`${t.personalStatus} · ${t.states.covered}`)).toBeVisible();
    for (const state of ["excluded", "conditional", "unverified"] as const) {
      await earthquake.getByLabel(t.stateLabel).selectOption(state);
      await expect(earthquake.getByText(`${t.personalStatus} · ${t.states[state]}`)).toBeVisible();
    }
    await expect(status).toHaveText(t.coverageUnverified);

    const alternative = quotes.getByRole("group", { name: t.alternative, exact: true });
    const premium = alternative.getByLabel(t.amounts.premium);
    await expect(alternative.locator("input:visible")).toHaveCount(5);
    await expect(alternative.getByLabel(t.amounts.hazardExcess)).toBeHidden();
    await expect(quotes.getByText(t.waitingQuotes)).toBeVisible();
    await premium.fill("-1");
    await expect(premium).toHaveAttribute("aria-invalid", "true");
    await expect(quotes.getByTestId("house-premium-difference")).toHaveCount(0);
    await premium.fill("1200");
    await premium.press("Tab");
    await expect(premium).toHaveValue("1,200");
    await alternative.getByLabel(t.amounts.sumInsured).fill("680000");
    await alternative.getByLabel(t.amounts.standardExcess).fill("900");
    await alternative.locator("summary").click();
    await alternative.getByLabel(t.quoteDate).fill("2026-10-01");
    await alternative.getByLabel(t.events.gradualWater).selectOption("excluded");
    const result = quotes.getByTestId("house-quote-difference");
    for (const text of [t.checkCover, t.amounts.sumInsured, t.amounts.standardExcess, t.states.excluded, t.partialDetails]) {
      await expect(result).toContainText(text);
    }
    await expect(result.getByTestId("house-premium-difference")).toContainText("NZ$300.00");
    await expect(result.getByTestId("house-monthly-difference")).toContainText("NZ$25.00");

    await annual.fill("1800");
    await insurer.fill("Example Insurer Updated");
    await expect(reference).toContainText("Example Insurer Updated");
    await expect(summary).toContainText("NZ$1,800.00");
    await expect(result.getByTestId("house-premium-difference")).toContainText("NZ$600.00");
    await expect(result.getByTestId("house-monthly-difference")).toContainText("NZ$50.00");
    await quotes.getByRole("button", { name: t.addQuote }).click();
    const third = quotes.getByRole("group", { name: `${t.quoteLabel} 3`, exact: true });
    await third.getByLabel(t.amounts.premium).fill("2000");
    await expect(quotes.getByTestId("house-premium-difference")).toHaveCount(2);
    await third.getByRole("button", { name: t.removeQuote }).click();
    await expect(quotes.getByTestId("house-premium-difference")).toHaveCount(1);

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const a11y = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(a11y.violations).toEqual([]);
    expect(requests).toEqual([]);
    expect(await context.cookies()).toEqual([]);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length, location.search])).toEqual([0, 0, ""]);
    await entry.getByRole("button", { name: t.clearReview }).click();
    await expect(summary).toBeHidden();
    await expect(quotes.getByText(t.referencePremiumNeeded)).toBeVisible();
    await expect(premium).toHaveValue("1,200");
    await page.getByRole("banner").getByRole("link", { name: copy.otherLanguage }).click();
    await expect(page).toHaveURL(locale === "en" ? "/zh/insurance/house/" : "/insurance/house/");
    await expect(page.getByLabel(messages[alternate].houseInsurance.basicLabels.premium, { exact: true })).toHaveValue("");
    await page.getByRole("link", { name: messages[alternate].insurance.back }).click();
    await expect(page).toHaveURL(locale === "en" ? "/zh/insurance/" : "/insurance/");
  });
}
