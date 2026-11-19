import type { Page } from "@playwright/test";
import type { messages } from "../../src/i18n/index";

type Copy = typeof messages.en.analysis;
export async function openAdvancedBill(page: Page, t: Copy) {
  if (!await page.locator("#price-step").isVisible()) await page.getByRole("button", { name: t.journey.next, exact: true }).click();
  const advanced = page.getByTestId("advanced-bill");
  if (await advanced.getAttribute("open") === null) await advanced.locator(":scope > summary").click();
}
export async function openRegionalDetails(page: Page) {
  const details = page.getByTestId("regional-details");
  if (await details.getAttribute("open") === null) await details.locator(":scope > summary").click();
}
