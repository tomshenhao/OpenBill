import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { languageTags, messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) {
  test(`${locale}: only water use above 170 L per person per day is red`, async ({ page }) => {
    const t = messages[locale].water;
    await page.goto(locale === "en" ? "/water/" : "/zh/water/");
    await page.getByLabel(t.occupants).fill("1");
    await page.getByLabel(t.days).fill("1");
    await page.getByLabel(t.unit).selectOption("L");
    const volume = page.getByLabel(t.volume, { exact: true });
    const assess = page.getByRole("button", { name: t.calculate });
    const cases = [
      { litres: "139", label: t.below, colour: "rgb(36, 92, 73)" },
      { litres: "170", label: t.within, colour: "rgb(36, 92, 73)" },
      { litres: "170.01", label: t.above, colour: "rgb(152, 45, 41)" },
    ];
    for (const { litres, label, colour } of cases) {
      await volume.fill(litres);
      await assess.click();
      const heading = page.getByRole("status").getByRole("heading", { name: label, exact: true });
      await expect(heading).toBeVisible();
      await expect(heading).toHaveCSS("color", colour);
      await expect(heading.locator('span[aria-hidden="true"]')).toHaveCSS("background-color", colour);
    }
    const accessibility = await new AxeBuilder({ page })
      .include('section[aria-labelledby="water-assessment"]')
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(accessibility.violations).toEqual([]);
  });

  test(`${locale}: Auckland water assessment, bill estimate, privacy and accessibility`, async ({ page }) => {
    const home = locale === "en" ? "/" : "/zh/";
    const t = messages[locale].water;
    await page.goto(home);
    await page.getByRole("link", { name: messages[locale].product.categories.water.name, exact: true }).click();
    await expect(page).toHaveURL(`${home}water/`);
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[locale]);
    await expect(page).toHaveTitle(t.metaTitle);
    await expect(page.getByRole("heading", { name: t.title })).toBeVisible();
    await page.waitForLoadState("networkidle");
    const outgoing: string[] = [];
    page.on("request", (request) => outgoing.push(request.url()));

    await expect(page.getByLabel(t.reading)).toBeHidden();
    await page.getByRole("button", { name: t.calculate }).click();
    await expect(page.getByLabel(t.occupants)).toBeFocused();
    await expect(page.getByRole("form", { name: t.assessment }).getByRole("alert")).toHaveText(t.errors.occupants);
    await page.getByLabel(t.occupants).fill("3");
    await page.getByLabel(t.days).fill("30");
    await page.getByLabel(t.volume, { exact: true }).fill("13500");
    await page.getByLabel(t.unit).selectOption("L");
    await page.getByText(t.context, { exact: true }).click();
    await page.getByLabel(t.reading).selectOption("actual");
    await page.getByLabel(t.pool).check();
    await page.getByLabel(t.garden).check();
    await page.getByRole("button", { name: t.calculate }).click();
    await expect(page.getByRole("heading", { name: t.within })).toBeVisible();
    await expect(page.getByText("150", { exact: true })).toBeVisible();
    await expect(page.getByText("450", { exact: true })).toBeVisible();
    await expect(page.getByText(t.actualNote, { exact: true })).toBeVisible();
    await expect(page.getByText(t.poolTip, { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: t.outdoorTitle })).toBeVisible();
    await page.getByLabel(t.reading).selectOption("estimated");
    await expect(page.getByText(t.estimatedNote, { exact: true })).toBeVisible();

    await expect(page.getByLabel(t.date)).toBeHidden();
    await page.getByText(t.bill, { exact: true }).click();
    await page.getByLabel(t.date).fill("2026-07-29");
    await expect(page.getByText(t.errors.split)).toBeVisible();
    await expect(page.getByRole("button", { name: t.check })).toBeHidden();
    await page.getByLabel(t.date).fill("2026-07-30");
    await expect(page.getByRole("link", { name: t.schedule })).toHaveAttribute("href", /2026_2027_rev/);
    await page.getByLabel(t.connection).selectOption("other");
    await expect(page.getByLabel(t.water, { exact: true })).toBeHidden();
    await page.getByLabel(t.connection).selectOption("apartment");
    await page.getByRole("button", { name: t.check }).click();
    await expect(page.getByLabel(t.water, { exact: true })).toBeFocused();
    await expect(page.getByRole("form", { name: t.bill }).getByRole("alert")).toHaveText(t.errors.rate);
    await page.getByLabel(t.water, { exact: true }).fill("2.501");
    await page.getByLabel(t.wastewater, { exact: true }).fill("4.001");
    await page.getByLabel(t.annual).fill("365.00");
    await page.getByLabel(t.billTotal).fill("120.00");
    await page.getByRole("button", { name: t.check }).click();
    await expect(page.getByText(/115\.07/)).toBeVisible();
    await expect(page.getByText(t.estimatedNote, { exact: true })).toHaveCount(2);

    const accessibility = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.setViewportSize({ width: 320, height: 800 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(outgoing).toEqual([]);
    expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookie: document.cookie })))
      .toEqual({ local: 0, session: 0, cookie: "" });
    await page.getByRole("button", { name: t.clear }).click();
    await expect(page.getByLabel(t.occupants)).toHaveValue("");
    await expect(page.getByText(t.estimatedNote, { exact: true })).toHaveCount(0);
    await expect(page.getByLabel(t.date)).toBeHidden();
    await page.getByRole("link", { name: messages[locale].otherLanguage }).click();
    await expect(page.locator("html")).toHaveAttribute("lang", languageTags[locale === "en" ? "zh" : "en"]);
  });
}
