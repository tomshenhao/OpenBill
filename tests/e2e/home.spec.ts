import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { languageTags, messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) {
  const alternate = locale === "en" ? "zh" : "en";
  const path = locale === "en" ? "/" : "/zh/";
  const otherPath = alternate === "en" ? "/" : "/zh/";
  const copy = messages[locale];

  test(`${locale}: homepage is concise, responsive and accessible`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(path);
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[locale]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.heroTitle);
    await expect(page.getByText(copy.heroDescription, { exact: true })).toBeVisible();
    const principles = page.getByRole("region", { name: copy.principlesTitle });
    await expect(principles.getByRole("listitem")).toHaveText(copy.principles);
    await expect(page.locator("form, #usage, #roadmap, #more-ways, [data-milestone]")).toHaveCount(0);

    const brokenAnchors = await page.locator('a[href^="#"]').evaluateAll((anchors) =>
      anchors.filter((anchor) => !document.getElementById((anchor as HTMLAnchorElement).hash.slice(1)))
        .map((anchor) => anchor.getAttribute("href")),
    );
    expect(brokenAnchors).toEqual([]);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });

  test(`${locale}: homepage header navigation, skip link and language switching work`, async ({ page, isMobile }) => {
    await page.goto(path);
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: copy.skip, exact: true });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("main")).toBeFocused();
    const banner = page.getByRole("banner");
    const logo = banner.getByRole("link", { name: "OpenBill", exact: true });
    await expect(logo).toHaveAttribute("href", path);
    const navigation = banner.getByRole("navigation", { name: copy.navigation });
    const tools = navigation.getByRole("link", { name: copy.product.categoriesNav, exact: true });
    const community = navigation.getByRole("link", { name: copy.product.communityNav, exact: true });
    if (isMobile) {
      await expect(tools).toBeHidden();
      await expect(community).toBeHidden();
    } else {
      await tools.click();
      await expect(page).toHaveURL(`${path}#categories`);
      await community.click();
      await expect(page).toHaveURL(`${path}#community`);
    }
    await logo.click();
    await expect(page).toHaveURL(path);
    const language = navigation.getByRole("link", { name: copy.otherLanguage, exact: true });
    await expect(language).toHaveAttribute("hreflang", languageTags[alternate]);
    await language.click();
    await expect(page).toHaveURL(otherPath);
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[alternate]);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages[alternate].heroTitle);
  });
}

test("unknown routes return a 404", async ({ page }) => {
  const response = await page.goto("/unsupported/");
  expect(response?.status()).toBe(404);
});
