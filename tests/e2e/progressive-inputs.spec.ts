import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";

for (const locale of ["en", "zh"] as const) test(`${locale}: bill entry and advanced fields are keyboard-accessible`, async ({ page }) => {
  const { electricityReview: t } = messages[locale];
  await page.goto(locale === "en" ? "/electricity/" : "/zh/electricity/");
  await page.waitForLoadState("networkidle");
  const requests: string[] = [], logs: string[] = [];
  page.on("request", (request) => requests.push(request.url()));
  page.on("console", (message) => logs.push(message.text()));

  const manual = page.getByRole("button", { name: t.manual });
  await expect(page.locator("#bill-kwh")).toHaveCount(0);
  await expect(page.getByTestId("current-electricity-review")).toHaveCount(0);
  await manual.focus();
  await page.keyboard.press("Enter");
  await expect(manual).toHaveAttribute("aria-pressed", "true");
  const edit = page.getByTestId("electricity-edit");
  await expect(edit.locator("#bill-kwh")).toBeVisible();
  await expect(edit.locator("input:visible, select:visible")).toHaveCount(6);
  const advanced = edit.getByText(t.advanced, { exact: true });
  await advanced.focus();
  await page.keyboard.press("Enter");
  await expect(edit.getByLabel(t.fixedDays)).toBeVisible();
  await page.locator("#bill-days").fill("30");
  await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.unable);
  await page.getByRole("button", { name: t.reset }).click();
  await expect(manual).toBeFocused();
  await expect(edit).toHaveCount(0);
  await expect(page.getByTestId("current-electricity-review")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  expect(requests).toEqual([]);
  expect(logs).toEqual([]);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, cookies: "", fits: true });
});
