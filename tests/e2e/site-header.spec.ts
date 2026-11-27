import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { languageTags, messages } from "../../src/i18n/index";

const tools = [
  { module: "electricity", skipTarget: "#main" },
  { module: "water", skipTarget: null },
  { module: "mortgage", skipTarget: "#mortgage-calculator" },
] as const;

for (const locale of ["en", "zh"] as const) {
  const alternate = locale === "en" ? "zh" : "en";
  const home = locale === "en" ? "/" : "/zh/";
  const alternateHome = alternate === "en" ? "/" : "/zh/";
  const copy = messages[locale];

  for (const { module, skipTarget } of tools) {
    test(`${locale}: ${module} shares the homepage header and stays on the same tool when switching language`, async ({ page, isMobile }) => {
      if (isMobile) await page.setViewportSize({ width: 320, height: 800 });
      const banner = page.getByRole("banner");
      await page.goto(home);
      const homeHeight = await banner.evaluate((element) => element.getBoundingClientRect().height);

      const path = `${home}${module}/`;
      await page.goto(path);
      await expect(banner).toHaveCount(1);
      expect(await banner.evaluate((element) => element.getBoundingClientRect().height)).toBe(homeHeight);
      expect(await banner.evaluate((element) => element.scrollWidth)).toBeLessThanOrEqual(await page.evaluate(() => window.innerWidth));

      const logo = banner.getByRole("link", { name: "OpenBill", exact: true });
      const navigation = banner.getByRole("navigation", { name: copy.navigation });
      const homeLink = navigation.getByRole("link", { name: copy.home, exact: true });
      const language = navigation.getByRole("link", { name: copy.otherLanguage, exact: true });
      await expect(navigation.getByRole("link")).toHaveCount(2);
      await expect(page.locator(`a[href="${home}"]`)).toHaveCount(2);
      await expect(logo).toHaveAttribute("href", home);
      await expect(homeLink).toHaveAttribute("href", home);
      await expect(language).toHaveAttribute("href", `${alternateHome}${module}/`);
      await expect(language).toHaveAttribute("hreflang", languageTags[alternate]);
      await expect(language).toHaveAttribute("lang", languageTags[alternate]);

      const accessibility = await new AxeBuilder({ page }).include(".site-header")
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(accessibility.violations).toEqual([]);

      if (skipTarget) {
        await page.keyboard.press("Tab");
        await expect(page.locator(`a.skip-link[href="${skipTarget}"]`)).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator(skipTarget)).toBeFocused();
        await page.goto(path);
        await page.keyboard.press("Tab");
      } else {
        await expect(page.locator("a.skip-link")).toHaveCount(0);
        await expect(page.getByRole("main")).toHaveCount(1);
      }
      await page.keyboard.press("Tab");
      await expect(logo).toBeFocused();
      await expect(logo).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("Tab");
      await expect(homeLink).toBeFocused();
      await expect(homeLink).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("Tab");
      await expect(language).toBeFocused();
      await expect(language).toHaveCSS("outline-style", "solid");
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL(`${alternateHome}${module}/`);
      await expect(page.locator("html")).toHaveAttribute("lang", languageTags[alternate]);

      await page.goto(path);
      await homeLink.click();
      await expect(page).toHaveURL(home);
      await page.goto(path);
      await logo.click();
      await expect(page).toHaveURL(home);
    });
  }
}
