import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { positionedGenesis, positionedMercury, syntheticPdf } from "../fixtures/electricity-bills";
import { messages } from "../../src/i18n/index";

const scenarios = [
  { locale: "en", path: "/electricity/", lines: positionedGenesis, total: "115.37", days: "31", kwh: "211", fixed: "1.375000", rate: "27.34", account: "219.14", charges: ["42.63", "57.69", "15.05"] },
  { locale: "zh", path: "/zh/electricity/", lines: positionedMercury, total: "68.82", days: "21", kwh: "7.63", fixed: "2.760000", rate: "24.58", account: "75.00", charges: ["57.96", "1.88", "8.98"] },
] as const;

for (const scenario of scenarios) test(`${scenario.locale}: local PDF review, corrections and manual parity`, async ({ page, context, baseURL }) => {
  const { analysis: a, electricityReview: t } = messages[scenario.locale];
  const requests: { method: string; url: string; data: string | null }[] = [], logs: string[] = [];
  await context.route("**/*", async (route) => {
    const req = route.request();
    requests.push({ method: req.method(), url: req.url(), data: req.postData() });
    const url = new URL(req.url());
    if (url.origin === baseURL && (url.pathname === scenario.path || url.pathname === "/icon.svg" ||
      url.pathname.startsWith("/_next/static/") || url.pathname === "/_openbill/pdf.worker.mjs")) await route.continue();
    else await route.abort();
  });
  page.on("pageerror", (error) => logs.push(error.message));
  page.on("console", (message) => logs.push(message.text()));
  await page.goto(scenario.path);
  await page.waitForLoadState("networkidle");
  for (const request of requests.splice(0)) {
    const url = new URL(request.url);
    expect(url.origin).toBe(baseURL);
    expect(url.search).toBe("");
    expect(request).toMatchObject({ method: "GET", data: null });
  }
  const bill = page.getByRole("region", { name: t.understand, exact: true });
  const summary = page.getByTestId("current-electricity-review");
  await bill.getByRole("button", { name: t.choosePdf }).click();
  await bill.getByLabel(t.file, { exact: true }).setInputFiles({
    name: "synthetic-private-sentinel.pdf", mimeType: "application/pdf",
    buffer: syntheticPdf([["Synthetic account identifier: PRIVATE-SENTINEL-883197", ...scenario.lines]]),
  });
  await expect(summary).toContainText(scenario.total);
  await expect(bill.getByRole("status")).toHaveText(t.pdfReady);
  await expect(summary).toBeFocused();
  await expect(summary.getByTestId("electricity-total")).toContainText(scenario.total);
  for (const [i, label] of [t.fixed, t.usage, t.gst].entries()) {
    await expect(summary.getByText(label, { exact: true }).locator("..")).toContainText(scenario.charges[i]);
  }
  const edit = bill.getByTestId("electricity-edit");
  const disclosure = edit.locator(":scope > summary");
  await expect(disclosure).toHaveText(t.reviewFields);
  await expect(edit).not.toHaveAttribute("open", "");
  await expect(edit.locator("#bill-kwh")).toBeHidden();
  expect(await summary.evaluate((element) => !!(element.compareDocumentPosition(document.querySelector('[data-testid="electricity-edit"]')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  const diagnostics = JSON.parse((await page.getByTestId("pdf-diagnostics").textContent())!);
  expect(Object.keys(diagnostics).sort()).toEqual(["itemRules", "outcome", "positionedRules", "stage", "unresolved"]);
  expect(diagnostics).toMatchObject({ outcome: "recognised", stage: "layout", unresolved: [] });
  expect(JSON.stringify(diagnostics)).not.toMatch(/SENTINEL|\.pdf|\d/);
  await expect(summary.getByText(t.supplied, { exact: true })).toBeVisible();
  await expect(summary.getByText(t.reconstructed, { exact: true })).toBeVisible();
  await expect(bill.locator("#bill-kwh")).toHaveValue(scenario.kwh);
  await expect(bill.locator("#bill-pdf")).toHaveValue("");
  await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.matches);
  await disclosure.focus();
  await page.keyboard.press("Enter");
  await expect(edit.locator("#bill-kwh")).toBeVisible();
  await bill.getByText(t.account, { exact: true }).click();
  await expect(bill.getByText(new RegExp(scenario.account.replace(".", "\\."))).first()).toBeVisible();
  await expect(summary).not.toContainText(scenario.account);
  if (scenario.locale === "zh") {
    await expect(bill.getByText(t.final, { exact: true })).toBeVisible();
    await expect(bill.getByText(t.estimated, { exact: true })).toBeVisible();
    await expect(page.getByText(t.fixedShare, { exact: true }).locator("..")).toContainText("96.8%");
  }
  await expect(bill.locator("#bill-days")).toHaveValue(scenario.days);
  await bill.locator("#bill-totalNzd").fill("150");
  await expect(page.getByTestId("electricity-verification")).toContainText(t.verification.difference);
  await expect(summary.getByTestId("electricity-total")).toContainText("150.00");
  await bill.locator("#bill-totalNzd").fill(scenario.total);
  await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.matches);

  const savings = page.getByRole("region", { name: t.save, exact: true });
  await expect(savings.getByRole("heading", { name: t.scenarios })).toBeVisible();
  const estimates = savings.getByRole("heading", { name: t.scenarios }).locator("..");
  const beforeVacancy = await estimates.innerText();
  await savings.getByLabel(t.context).selectOption("vacant");
  if (scenario.locale === "zh") {
    await expect(savings.getByRole("heading", { name: t.vacantFixedTitle })).toBeVisible();
    await expect(savings.getByText(t.vacantFixedShare.replace("{share}", "96.8"), { exact: true })).toBeVisible();
    await expect(savings.getByText(t.vacantFlexibility, { exact: true })).toBeVisible();
  } else {
    await expect(savings.getByText(t.advice.vacant, { exact: true })).toBeVisible();
    await expect(savings.getByRole("heading", { name: t.vacantFixedTitle })).toHaveCount(0);
  }
  expect(await estimates.innerText()).toBe(beforeVacancy);
  await expect(page.getByTestId("usage-rating")).toHaveCount(0);
  await savings.getByLabel(t.context).selectOption("occupied");
  await expect(savings.getByRole("heading", { name: t.vacantFixedTitle })).toHaveCount(0);
  await expect(page.getByTestId("usage-rating")).toHaveCount(0);
  await savings.getByText(t.quote, { exact: true }).click();
  const quote = savings.locator("details").filter({ hasText: t.quote });
  await quote.getByLabel(a.daily, { exact: true }).fill("1");
  await quote.getByLabel(a.rate, { exact: true }).fill("20");
  await quote.getByLabel(a.rateGst, { exact: true }).selectOption("inclusive");
  await expect(quote.getByText(t.quoteTotal, { exact: true })).toBeVisible();
  await expect(quote.getByText(t.quoteDifference, { exact: true })).toBeVisible();
  await expect(savings.getByText(t.official, { exact: true })).toBeVisible();
  const fileRequests = requests.filter(({ url }) => url.includes("pdf.worker"));
  expect(fileRequests).toHaveLength(1);
  for (const request of requests) {
    const url = new URL(request.url);
    expect(url.origin).toBe(baseURL);
    expect(url.pathname).toMatch(/^\/(?:_next\/static\/|_openbill\/pdf\.worker\.mjs$)/);
    expect(url.search).toBe("");
    expect(request).toMatchObject({ method: "GET", data: null });
  }
  expect(logs).toEqual([]);
  await context.unrouteAll();
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  expect(await page.evaluate(async () => ({ local: localStorage.length, session: sessionStorage.length, databases: (await indexedDB.databases()).length, caches: (await caches.keys()).length, fits: document.documentElement.scrollWidth <= innerWidth }))).toEqual({ local: 0, session: 0, databases: 0, caches: 0, fits: true });

  await bill.getByRole("button", { name: t.reset }).click();
  await expect(summary).toHaveCount(0);
  await expect(bill.locator("#bill-kwh")).toHaveCount(0);
  await bill.getByRole("button", { name: t.manual }).click();
  await bill.locator("#bill-days").fill(scenario.days);
  await bill.locator("#bill-kwh").fill(scenario.kwh);
  await bill.locator("#bill-dailyNzd").fill(scenario.fixed);
  await bill.locator("#bill-usageCents").fill(scenario.rate);
  await bill.getByLabel(a.rateGst, { exact: true }).selectOption("exclusive");
  await expect(summary.getByText(t.reconstructed).locator("..")).toContainText(scenario.total);
  await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.unable);
  await bill.locator("#bill-totalNzd").fill(scenario.total);
  await expect(page.getByTestId("electricity-verification")).toHaveText(t.verification.matches);
  await page.reload();
  await expect(bill.locator("#bill-kwh")).toHaveCount(0);
  await expect(summary).toHaveCount(0);
});

test("PDF limits, incompatible layouts and recovery to manual entry", async ({ page }) => {
  const t = messages.en.electricityReview;
  await page.goto("/electricity/");
  const bill = page.getByRole("region", { name: t.understand, exact: true });
  await bill.getByRole("button", { name: t.choosePdf }).click();
  for (const [buffer, error] of [
    [Buffer.from("not a pdf"), "invalid"],
    [Buffer.alloc(8 * 1024 * 1024 + 1), "size"],
    [syntheticPdf(Array.from({ length: 13 }, () => [])), "pages"],
    [syntheticPdf([[]]), "image"],
    [syntheticPdf([[]], true), "encrypted"],
    [syntheticPdf([["Different company", "Electricity charges"]]), "unsupported"],
  ] as const) {
    await bill.getByLabel(t.file, { exact: true }).setInputFiles({ name: "synthetic.pdf", mimeType: "application/pdf", buffer });
    await expect(bill.getByRole("status")).toContainText(t.pdfErrors[error], { timeout: 12_000 });
  }
  await bill.getByRole("button", { name: t.manual }).click();
  await expect(bill.locator("#bill-days")).toBeVisible();
  await expect(bill.locator("#bill-kwh")).toHaveValue("");
  await expect(page.getByTestId("current-electricity-review")).toHaveCount(0);
});
