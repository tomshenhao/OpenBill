import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { insuranceModules, insuranceRoutes, insuranceSources } from "../../src/config/insurance";
import { languageTags, messages } from "../../src/i18n";

async function checkLayout(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.locator("form, input, select, textarea")).toHaveCount(0);
  const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
  expect(result.violations).toEqual([]);
}

for (const locale of ["en", "zh"] as const) {
  const alternate = locale === "en" ? "zh" : "en";
  const copy = messages[locale];
  const t = copy.insurance;
  const home = locale === "en" ? "/" : "/zh/";

  test(`${locale}: insurance directory links to the six guides`, async ({ page, isMobile }) => {
    if (isMobile) await page.setViewportSize({ width: 320, height: 800 });
    expect((await page.goto(insuranceRoutes[locale]))?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(t.title);
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[locale]);
    const main = page.getByRole("main");
    await expect(main.getByText(t.directoryNote, { exact: true })).toBeVisible();
    await expect(main.getByRole("link")).toHaveCount(6);
    for (const guide of insuranceModules) {
      const link = main.getByRole("link", { name: t.modules[guide.id].title, exact: true });
      await expect(link).toHaveAttribute("href", guide.route[locale]);
      await expect(link).toHaveAccessibleDescription(t.modules[guide.id].summary);
    }
    await checkLayout(page);
    const language = page.getByRole("banner").getByRole("link", { name: copy.otherLanguage });
    await language.click();
    await expect(page).toHaveURL(insuranceRoutes[alternate]);
    await page.goto(insuranceRoutes[locale]);
    await page.getByRole("banner").getByRole("link", { name: copy.home, exact: true }).click();
    await expect(page).toHaveURL(home);
    await page.goto(insuranceRoutes[locale]);
    await page.getByRole("banner").getByRole("link", { name: "OpenBill", exact: true }).click();
    await expect(page).toHaveURL(home);
  });

  for (const guide of insuranceModules) {
    // House now has its own interactive test suite.
    if (guide.id === "house") continue;
    test(`${locale}: ${guide.id} has its own guidance, sources and navigation`, async ({ page, isMobile }) => {
      if (isMobile) await page.setViewportSize({ width: 320, height: 800 });
      await page.goto(insuranceRoutes[locale]);
      const card = page.getByRole("main").getByRole("link", { name: t.modules[guide.id].title, exact: true });
      await card.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(guide.route[locale]);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(t.modules[guide.id].title);
      await expect(page).toHaveTitle(`${t.modules[guide.id].title} | OpenBill`);
      const main = page.getByRole("main");
      for (const heading of [t.coverHeading, t.termsHeading, t.reviewHeading]) {
        await expect(main.getByRole("region", { name: heading }).getByRole("listitem").first()).toBeVisible();
      }
      await expect(main.getByRole("region", { name: t.plannedHeading })).toContainText(t.modules[guide.id].planned);
      const sources = main.getByRole("region", { name: t.sourcesHeading });
      await expect(sources.getByRole("link")).toHaveCount(guide.sources.length);
      for (const source of guide.sources) {
        const link = sources.getByRole("link", { name: t.sources[source], exact: true });
        await expect(link).toHaveAttribute("href", insuranceSources[source]);
        await expect(link).toHaveAttribute("rel", "noreferrer");
      }
      await checkLayout(page);
      const header = page.getByRole("banner");
      await expect(header.getByRole("link", { name: "OpenBill" })).toHaveAttribute("href", home);
      await expect(header.getByRole("link", { name: copy.home, exact: true })).toHaveAttribute("href", home);
      const language = header.getByRole("link", { name: copy.otherLanguage });
      await expect(language).toHaveAttribute("hreflang", languageTags[alternate]);
      await language.click();
      await expect(page).toHaveURL(guide.route[alternate]);
      await expect(page.locator("html")).toHaveAttribute("lang", languageTags[alternate]);
      await page.getByRole("main").getByRole("link", { name: messages[alternate].insurance.back }).click();
      await expect(page).toHaveURL(insuranceRoutes[alternate]);
    });
  }
}
