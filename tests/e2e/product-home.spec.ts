import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";
import { coreCategories, futureCategories } from "../../src/config/categories";
import { communityFeedbackUrl } from "../../src/config/community";
import { roadmapMilestones } from "../../src/config/roadmap";

for (const locale of ["en", "zh"] as const) {
  const path = locale === "en" ? "/" : "/zh/";
  const copy = messages[locale]; const t = copy.product;

  test(`${locale}: honest categories, keyboard disclosure and roadmap navigation`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(copy.heroTitle.replace("\n", " "));
    await expect(page.locator("#categories [data-category]")).toHaveCount(6);
    for (const category of coreCategories) {
      const card = page.locator(`#categories [data-category="${category.id}"]`);
      await expect(card.getByRole("heading", { name: t.categories[category.id].name, exact: true })).toBeVisible();
      await expect(card).toContainText(t.categoryStatus[category.status]);
      if (category.route === null) { await expect(card.locator("a, button")).toHaveCount(0); }
    }
    await page.locator('#categories [data-category="electricity"] a').click();
    await expect(page).toHaveURL(new RegExp(`${path}#usage$`));
    await expect(page.getByRole("heading", { name: copy.formTitle })).toBeVisible();
    const details = page.locator("#more-ways details"); const summary = details.locator("summary");
    await expect(details).not.toHaveAttribute("open", "");
    await expect(details.locator("[data-category]").first()).toBeHidden();
    await summary.focus(); await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(details.locator("[data-category]")).toHaveCount(9);
    for (const category of futureCategories) await expect(details.getByRole("heading", { name: t.categories[category.id].name, exact: true })).toBeVisible();
    await expect(details.locator("a, button")).toHaveCount(0);
    for (const milestone of roadmapMilestones) {
      const row = page.locator(`[data-milestone="${milestone.id}"]`);
      await expect(row).toHaveAttribute("data-status", milestone.status);
      await expect(row).toContainText(t.milestoneStatus[milestone.status]);
      await expect(row).toContainText(t.milestones[milestone.id].description);
    }
    await page.locator('#community a[href="#roadmap"]').click();
    await expect(page).toHaveURL(new RegExp(`${path}#roadmap$`));
    await expect(page.locator("#roadmap-heading")).toBeInViewport();
    const brokenAnchors = await page.locator('a[href*="#"]').evaluateAll((anchors) => anchors.flatMap((anchor) => {
      const url = new URL((anchor as HTMLAnchorElement).href);
      return url.origin === location.origin && url.hash && !document.getElementById(url.hash.slice(1)) ? [url.hash] : [];
    }));
    expect(brokenAnchors).toEqual([]);
    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test(`${locale}: public feedback navigation never attaches household inputs`, async ({ page }) => {
    await page.goto(path); await page.waitForLoadState("networkidle");
    const outgoing: string[] = [];
    await page.route("https://github.com/**", async (route) => {
      const request = route.request(); outgoing.push(request.url());
      expect(request.method()).toBe("GET"); expect(request.postData()).toBeNull();
      expect(request.headers()["referer"]).toBeUndefined();
      await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Read-only feedback destination test</title><p>No issue was submitted.</p>" });
    });
    await page.getByLabel(copy.usageLabel, { exact: true }).fill("543.21");
    await page.getByLabel(copy.daysLabel, { exact: true }).fill("29");
    await page.getByRole("button", { name: copy.calculate, exact: true }).click();
    await expect(page.getByTestId("daily-average")).toHaveText("18.73");
    await expect(page.locator("#feedback-public")).toHaveText(t.communityPublic);
    await expect(page.locator("#feedback-privacy")).toHaveText(t.communityPrivacy);
    expect(outgoing).toEqual([]);
    const feedback = page.getByRole("link", { name: t.communityAction, exact: true });
    await expect(feedback).toHaveAttribute("href", communityFeedbackUrl);
    await expect(feedback).toHaveAccessibleDescription(`${t.communityPublic} ${t.communityPrivacy}`);
    await feedback.click(); await expect(page).toHaveURL(communityFeedbackUrl);
    expect(outgoing).toEqual([communityFeedbackUrl]);
  });
}
