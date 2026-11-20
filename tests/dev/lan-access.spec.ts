import { readFile, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { messages } from "../../src/i18n/index";
import { openAdvancedBill } from "../e2e/journey-helpers";

const lanHost = process.env.OPENBILL_TEST_LAN_HOST ?? "127.0.0.2";
const hosts = ["127.0.0.1", lanHost];
const paths = ["/", "/zh/", "/electricity/", "/zh/electricity/"];

test("explicit dev origins serve both homepages and keep electricity inputs local", async ({ browser }) => {
  for (const host of hosts) for (const path of paths) {
    const page = await browser.newPage();
    const errors: string[] = [], submittedFrames: string[] = [], sockets: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("websocket", (socket) => {
      sockets.push(socket.url());
      socket.on("framesent", ({ payload }) => submittedFrames.push(payload.toString()));
    });
    const connected = page.waitForEvent("console", (message) => message.text().includes("[HMR] connected"));
    await page.goto(`http://${host}:3111${path}`); await connected;
    await page.waitForLoadState("networkidle");
    const requests: string[] = [], navigation: string[] = [];
    page.on("request", (request) => requests.push(request.url()));
    page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigation.push(frame.url()); });
    if (path.includes("electricity")) {
      // Usage is live; bill arithmetic is an optional disclosure in step 2.
      const copy = messages[path.startsWith("/zh/") ? "zh" : "en"].analysis;
      await page.locator("#bill-kwh").fill("987.654");
      await page.locator("#bill-region").selectOption("NZ-AUK");
      await page.locator("#bill-start").fill("2026-06-01"); await page.locator("#bill-end").fill("2026-06-30");
      await expect(page.getByTestId("usage-rating")).toHaveAttribute("data-rating", "yellow");
      await openAdvancedBill(page, copy);
      await expect(page.locator("#bill-days")).toHaveValue("30");
      await page.locator("#bill-totalNzd").fill("120");
      await page.locator('button[type="submit"]').click();
      await page.getByTestId("bill-details").locator(":scope > summary").click();
      await expect(page.getByTestId("bill-daily-kwh")).toContainText("32.92");
    } else {
      const locale = path === "/zh/" ? "zh" : "en";
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(messages[locale].heroTitle);
      await expect(page.locator("form")).toHaveCount(0);
    }
    expect(errors).toEqual([]); expect(navigation).toEqual([]); expect(requests).toEqual([]);
    expect(sockets.some((url) => url.startsWith(`ws://${host}:3111/_next/hmr`))).toBe(true);
    expect(submittedFrames.join(" ")).not.toContain("987.654");
    await page.close();
  }
});

test("HMR applies a real stylesheet edit without page navigation or losing form state", async ({ page }) => {
  const connected = page.waitForEvent("console", (message) => message.text().includes("[HMR] connected"));
  await page.goto(`http://${lanHost}:3111/electricity/`); await connected;
  await page.locator("#bill-kwh").fill("987.654");
  const stylesheet = "src/app/globals.css", original = await readFile(stylesheet, "utf8");
  const updated = `${original}\n:root { --openbill-hmr-regression: confirmed; }\n`;
  const navigations: string[] = [];
  page.on("framenavigated", (frame) => { if (frame === page.mainFrame()) navigations.push(frame.url()); });
  try {
    await writeFile(stylesheet, updated);
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--openbill-hmr-regression").trim()), { timeout: 20_000 }).toBe("confirmed");
    await expect(page.locator("#bill-kwh")).toHaveValue("987.654"); expect(navigations).toEqual([]);
  } finally {
    // Preserve any simultaneous contributor edit; remove only our exact test addition.
    const current = await readFile(stylesheet, "utf8");
    if (current === updated) await writeFile(stylesheet, original);
    else if (current.includes("\n:root { --openbill-hmr-regression: confirmed; }\n")) await writeFile(stylesheet, current.replace("\n:root { --openbill-hmr-regression: confirmed; }\n", ""));
  }
});

test("unlisted and opaque origins remain blocked", async ({ request }) => {
  for (const origin of ["https://untrusted.example", "null"]) {
    const response = await request.get("/_next/hmr", { headers: { Origin: origin } });
    expect(response.status()).toBe(403);
  }
});

test("development form navigation stays blocked when JavaScript cannot initialise", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    for (const path of paths) {
      const page = await context.newPage();
      const url = `http://${lanHost}:3111${path}`;
      await page.goto(url); await page.waitForLoadState("networkidle");
      if (path.includes("electricity")) {
        // As in the production CSP test, reveal the dormant form only in the
        // harness: the step control cannot run without JS. CSP must still block it.
        await page.locator("#price-step").evaluate((element) => element.removeAttribute("hidden"));
        await page.getByTestId("advanced-bill").locator(":scope > summary").click();
        await page.locator("#bill-days").fill("30"); await page.locator("#bill-kwh").fill("987.654"); await page.locator("#bill-totalNzd").fill("120");
      } else {
        await expect(page.locator("form")).toHaveCount(0);
        await page.close();
        continue;
      }
      const requests: string[] = []; page.on("request", (request) => requests.push(request.url()));
      const blocked = page.waitForEvent("console", (message) => message.text().includes("form-action"));
      await page.locator('button[type="submit"]').click({ noWaitAfter: true }); await blocked;
      // A CSP-denied navigation never commits; do not wait for it as a successful load.
      expect(page.url()).toBe(url); expect(requests).toEqual([]); await page.close();
    }
  } finally { await context.close(); }
});
