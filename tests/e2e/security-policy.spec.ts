import { expect, test } from "@playwright/test";

test("production keeps strict connection/form policies, including before JavaScript initialises", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    for (const path of ["/", "/zh/", "/electricity/", "/zh/electricity/"]) {
      const page = await context.newPage(), url = `${baseURL}${path}`;
      const response = await page.goto(url); await page.waitForLoadState("networkidle");
      const header = response!.headers()["content-security-policy"], meta = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
      for (const csp of [header, meta]) {
        expect(csp).toContain("connect-src 'none'"); expect(csp).toContain("form-action 'none'");
        expect(csp).not.toMatch(/unsafe-eval|ws:|wss:|\*/);
      }
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
