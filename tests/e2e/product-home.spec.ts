import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";
import { coreCategories } from "../../src/config/categories";
import { communityFeedbackUrl, projectRepositoryUrl, projectRoadmapUrl } from "../../src/config/community";

for (const locale of ["en", "zh"] as const) {
  const path = locale === "en" ? "/" : "/zh/";
  const copy = messages[locale];
  const t = copy.product;

  test(`${locale}: six cards show honest status and open the three tools and insurance directory`, async ({ page }) => {
    await page.goto(path);
    const modules = page.getByRole("region", { name: t.coreTitle });
    await expect(modules.getByRole("listitem")).toHaveCount(6);
    await expect(modules.getByRole("link")).toHaveCount(4);
    const toolHeadings = { electricity: copy.analysis.title, water: copy.water.title, mortgage: copy.mortgage.title, insurance: copy.insurance.title };

    for (const category of coreCategories) {
      const name = t.categories[category.id].name;
      const card = modules.locator(`[data-category="${category.id}"]`);
      await expect(card.getByRole("heading", { name, exact: true })).toBeVisible();
      await expect(card).toHaveAttribute("data-status", category.status);
      if (!category.route) {
        await expect(card.getByText(t.categoryStatus.planned, { exact: true })).toBeVisible();
        await expect(card.locator("a, button")).toHaveCount(0);
        continue;
      }

      const href = category.route[locale];
      const link = card.getByRole("link", { name, exact: true });
      await expect(link).toHaveAttribute("href", href);
      await expect(link).toHaveAccessibleDescription(t.homeModuleStatus[category.id]);
      await expect(page.locator(`a[href="${href}"]`)).toHaveCount(1);
      if (category.id === "electricity") {
        await link.focus();
        await expect(link).toBeFocused();
        await page.keyboard.press("Enter");
      } else {
        // The title link covers the card, including its padding.
        await card.click({ position: { x: 8, y: 8 } });
      }
      await expect(page).toHaveURL(href);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(toolHeadings[category.id]);
      await page.goto(path);
    }
  });

  test(`${locale}: footer links to GitHub and feedback sends no household data`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    const outgoing: string[] = [];
    await page.route("https://github.com/**", async (route) => {
      const request = route.request();
      outgoing.push(request.url());
      expect(request.method()).toBe("GET");
      expect(request.postData()).toBeNull();
      expect(request.headers()["referer"]).toBeUndefined();
      await route.fulfill({ status: 200, contentType: "text/html", body: "<!doctype html><title>Read-only feedback destination test</title><p>No issue was submitted.</p>" });
    });
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: t.communityRepository })).toHaveAttribute("href", projectRepositoryUrl);
    await expect(footer.getByRole("link", { name: t.roadmapNav })).toHaveAttribute("href", projectRoadmapUrl);
    await expect(footer.locator("#feedback-public")).toHaveText(t.communityPublic);
    await expect(footer.locator("#feedback-privacy")).toHaveText(t.communityPrivacy);
    expect(outgoing).toEqual([]);
    const feedback = footer.getByRole("link", { name: t.communityAction, exact: true });
    await expect(feedback).toHaveAttribute("href", communityFeedbackUrl);
    await expect(feedback).toHaveAccessibleDescription(`${t.communityPublic} ${t.communityPrivacy}`);
    await feedback.click();
    await expect(page).toHaveURL(communityFeedbackUrl);
    expect(outgoing).toEqual([communityFeedbackUrl]);
  });
}
