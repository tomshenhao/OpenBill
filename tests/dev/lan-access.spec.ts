import { readFile, writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const lanHost = process.env.OPENBILL_TEST_LAN_HOST ?? "127.0.0.2";
const hosts = ["127.0.0.1", lanHost];
const paths = ["/", "/zh/", "/electricity/", "/zh/electricity/"];

test("explicit dev origins initialise both forms in both languages without submission or input transport", async ({ browser }) => {
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
      await page.locator("#bill-days").fill("30"); await page.locator("#bill-kwh").fill("987.654"); await page.locator("#bill-totalNzd").fill("120");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByTestId("bill-daily-kwh")).toContainText("32.92");
    } else {
      await page.locator("#usage-days").fill("30"); await page.locator("#usage-kwh").fill("987.654");
      await page.locator('button[type="submit"]').click();
      await expect(page.getByTestId("daily-average")).toHaveText("32.92");
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
        await page.locator("#bill-days").fill("30"); await page.locator("#bill-kwh").fill("987.654"); await page.locator("#bill-totalNzd").fill("120");
      } else {
        await page.locator("#usage-days").fill("30"); await page.locator("#usage-kwh").fill("987.654");
      }
      const requests: string[] = []; page.on("request", (request) => requests.push(request.url()));
      const blocked = page.waitForEvent("console", (message) => message.text().includes("form-action"));
      await page.locator('button[type="submit"]').click({ noWaitAfter: true }); await blocked;
      // A CSP-denied navigation never commits; do not wait for it as a successful load.
      expect(page.url()).toBe(url); expect(requests).toEqual([]); await page.close();
    }
  } finally { await context.close(); }
});
