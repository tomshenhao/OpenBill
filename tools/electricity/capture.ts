import { chromium, type Browser } from "@playwright/test";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { z } from "zod";
import { idSchema, officialUrlSchema, utcSchema } from "../../src/domain/electricity/tariff.ts";
import type { DataPolicy } from "../../src/domain/electricity/validation.ts";
import { assertOfficialSource } from "./evidence.ts";
import { sha256 } from "./files.ts";

export const captureRequestSchema = z.strictObject({
  retailerId: idSchema, plan: z.string().min(1).max(2000), sourceUrl: officialUrlSchema,
  termsReviewedAt: utcSchema, reviewerId: idSchema,
  automationPermissionReference: z.string().min(1),
  termsPermitAutomationAndLocalCapture: z.literal(true),
});

// Deliberately conservative: any restriction or unfamiliar directive needs manual review.
// This does not claim to implement the complete robots standard.
export function unrestrictedRobots(text: string): boolean {
  let hasWildcard = false;
  for (const original of text.split(/\r?\n/)) {
    const line = original.replace(/#.*/, "").trim();
    if (!line) continue;
    const match = /^([a-z-]+)\s*:\s*(.*)$/i.exec(line);
    if (!match) return false;
    const [, rawKey, value] = match;
    const key = rawKey.toLowerCase();
    if (key === "user-agent") { if (value !== "*") return false; hasWildcard = true; }
    else if (key === "disallow") { if (value) return false; }
    else if (key === "allow") { if (value !== "/") return false; }
    else if (key !== "sitemap") return false;
  }
  return hasWildcard;
}

export async function capturePermittedPage(input: unknown, policy: DataPolicy, outputDirectory: string, stateDirectory: string, suppliedBrowser?: Browser, now = new Date()) {
  const request = captureRequestSchema.parse(input);
  assertOfficialSource(request.retailerId, request.sourceUrl, policy);
  if (policy.retailers.find((retailer) => retailer.id === request.retailerId)?.automation !== "permitted") throw new Error("Automated capture is not permitted for this retailer; use a permitted manual workflow");
  if (new Date(request.termsReviewedAt) > now || now.getTime() - new Date(request.termsReviewedAt).getTime() > 30 * 86_400_000) throw new Error("A current terms review is required");
  await mkdir(stateDirectory, { recursive: true });
  const state = resolve(stateDirectory, `${request.retailerId}.txt`);
  let previous: string | null = null;
  try { previous = await readFile(state, "utf8"); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  if (previous !== null && (!Number.isFinite(Number(previous)) || now.getTime() - Number(previous) < 10_000)) throw new Error("Collection rate limit: wait at least 10 seconds");
  // Exclusive lock also prevents concurrent collectors from defeating the rate limit.
  const lock = resolve(stateDirectory, `${request.retailerId}.lock`);
  await writeFile(lock, String(now.getTime()), { flag: "wx" });
  let browser: Browser | undefined;
  try {
    await writeFile(state, String(now.getTime()));
    browser = suppliedBrowser ?? await chromium.launch({ headless: true });
    const context = await browser.newContext({ serviceWorkers: "block", acceptDownloads: false, userAgent: "OpenBillEvidence/0.2 (public-source research; no personal inputs)" });
    try {
      const page = await context.newPage();
      const source = new URL(request.sourceUrl);
      const robotsUrl = `${source.origin}/robots.txt`;
      let requests = 0;
      let redirect = false;
      await context.route("**/*", async (route) => {
        const req = route.request();
        const url = new URL(req.url());
        const allowedDocument = url.href === request.sourceUrl || url.href === robotsUrl;
        const allowedAsset = url.origin === source.origin && !url.search && /\.(css|png|jpg|jpeg|svg|woff2?)$/i.test(url.pathname);
        if (req.redirectedFrom()) redirect = true;
        if (req.method() !== "GET" || req.redirectedFrom() || ++requests > 50 || (!allowedDocument && !allowedAsset) || url.username || url.password) await route.abort();
        else await route.fallback();
      });
      const robots = await page.goto(robotsUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
      const robotsText = await page.locator("body").innerText();
      if (!robots?.ok() || !unrestrictedRobots(robotsText) || redirect) throw new Error("Robots policy is restricted, unavailable or requires manual review");
      const response = await page.goto(request.sourceUrl, { waitUntil: "load", timeout: 15_000 });
      const body = await page.locator("body").innerText();
      if (!response?.ok() || redirect || page.url() !== request.sourceUrl || /captcha|verify you are human|access denied|just a moment/i.test(body)) throw new Error("Source is unavailable or protected; do not retry or bypass");
      await mkdir(outputDirectory, { recursive: false });
      const sourceBytes = await response.body();
      if (!sourceBytes.length || sourceBytes.length > 25_000_000) throw new Error("Empty or oversized source document");
      await writeFile(resolve(outputDirectory, "source.html"), sourceBytes, { flag: "wx" });
      await writeFile(resolve(outputDirectory, "robots.txt"), robotsText, { flag: "wx" });
      let screenshotSha256: string | null = null;
      try {
        const screenshot = await page.screenshot({ path: resolve(outputDirectory, "source.png"), fullPage: true, timeout: 15_000 });
        screenshotSha256 = sha256(screenshot);
      } catch { /* Retain the source and an explicit pending status for manual follow-up. */ }
      await writeFile(resolve(outputDirectory, "capture.json"), JSON.stringify({ ...request, collectedAt: new Date().toISOString(), sourceContentSha256: sha256(sourceBytes), responseContentType: response.headers()["content-type"] ?? null, sourceRevision: response.headers().etag ?? response.headers()["last-modified"] ?? `sha256:${sha256(sourceBytes)}`, screenshotSha256, screenshotStatus: screenshotSha256 ? "captured" : "unavailable", screenshotUnavailableReason: screenshotSha256 ? null : "Playwright screenshot failed; manual verification required", collectionStatus: "collected", verificationStatus: "pending-verification" }, null, 2), { flag: "wx" });
      return outputDirectory;
    } finally { await context.close(); }
  } finally {
    if (browser && !suppliedBrowser) await browser.close();
    // Only this known, nonrecursive lock file is removed. Evidence is never deleted.
    await unlink(lock);
  }
}
