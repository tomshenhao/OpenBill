import { expect, test } from "@playwright/test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { basename, resolve, sep } from "node:path";
import { tmpdir } from "node:os";
import { capturePermittedPage } from "../../tools/electricity/capture.ts";
import { sha256 } from "../../tools/electricity/files.ts";
import { isPng } from "../../tools/electricity/evidence.ts";
import { testPolicy } from "../fixtures/electricity.ts";

test("captures permitted SYNTHETIC official-page evidence with real Chromium and no external network", async ({ browser }) => {
  const root = await mkdtemp(resolve(tmpdir(), "openbill-v02-"));
  const html = "<!doctype html><html lang='en'><title>SYNTHETIC ONLY</title><body><h1>SYNTHETIC TEST SOURCE</h1><p>Not an actual retailer or tariff.</p></body></html>";
  let robotsPolicy = "User-agent: *\nAllow: /\n";
  let sourceVisits = 0;
  // The real browser traverses the capture policy; only the HTTPS source transport
  // is fulfilled locally. No real retailer is scraped and no household data exists.
  const routedBrowser = new Proxy(browser, {
    get(target, property, receiver) {
      if (property === "newContext") return async (options: Parameters<typeof browser.newContext>[0]) => {
        const context = await target.newContext(options);
        await context.route("https://retailer.example/**", async (route) => {
          const robots = route.request().url().endsWith("/robots.txt");
          if (!robots) sourceVisits += 1;
          await route.fulfill({ status: 200, contentType: robots ? "text/plain" : "text/html", body: robots ? robotsPolicy : html });
        });
        return context;
      };
      return Reflect.get(target, property, receiver);
    },
  });
  try {
    const now = new Date();
    const request = { retailerId: "synthetic", plan: "SYNTHETIC ONLY", sourceUrl: "https://retailer.example/tariffs", termsReviewedAt: now.toISOString(), reviewerId: "synthetic-reviewer", automationPermissionReference: "SYNTHETIC PERMISSION", termsPermitAutomationAndLocalCapture: true };
    const output = resolve(root, "capture");
    await capturePermittedPage(request, testPolicy, output, resolve(root, "limits"), routedBrowser, now);
    const metadata = JSON.parse(await readFile(resolve(output, "capture.json"), "utf8"));
    const source = await readFile(resolve(output, "source.html")); const screenshot = await readFile(resolve(output, "source.png"));
    expect(source.toString()).toBe(html); expect(metadata.sourceContentSha256).toBe(sha256(source));
    expect(metadata.screenshotSha256).toBe(sha256(screenshot)); expect(isPng(screenshot)).toBe(true);
    expect(metadata.verificationStatus).toBe("pending-verification"); expect(metadata.screenshotStatus).toBe("captured");
    await expect(capturePermittedPage(request, testPolicy, resolve(root, "second"), resolve(root, "limits"), routedBrowser, now)).rejects.toThrow("rate limit");
    robotsPolicy = "User-agent: *\nDisallow: /\n";
    await expect(capturePermittedPage(request, testPolicy, resolve(root, "restricted"), resolve(root, "restricted-limits"), routedBrowser, now)).rejects.toThrow("Robots policy");
    expect(sourceVisits).toBe(1);
  } finally {
    if (!root.startsWith(`${resolve(tmpdir())}${sep}`) || !basename(root).startsWith("openbill-v02-")) throw new Error("Unsafe test cleanup target");
    await rm(root, { recursive: true, force: true });
  }
});
