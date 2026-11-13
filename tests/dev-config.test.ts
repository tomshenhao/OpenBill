import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
async function loadConfig(mode: string, origins: string) {
  vi.stubEnv("NODE_ENV", mode); vi.stubEnv("OPENBILL_DEV_ORIGINS", origins); vi.resetModules();
  return (await import("../next.config.ts")).default;
}
describe("development origin configuration", () => {
  it("keeps default development loopback-only without a broad origin exception", async () => {
    expect((await loadConfig("development", "")).allowedDevOrigins).toEqual(["127.0.0.1"]);
  });
  it("allows only explicitly configured hosts and removes duplicates", async () => {
    expect((await loadConfig("development", "192.168.1.10, OpenBill.local,127.0.0.1")).allowedDevOrigins).toEqual(["127.0.0.1", "192.168.1.10", "openbill.local"]);
  });
  it.each(["*", "*.example.com", "0.0.0.0", "[::]", "http://example.com", "example.com:3000", "example.com/path", "user@example.com", "example.com?query", "example.com#fragment"])("rejects broad or malformed origin configuration %s", async (host) => {
    await expect(loadConfig("development", host)).rejects.toThrow("explicit hostnames/IPs");
  });
  it("does not apply development exceptions to production builds", async () => {
    const config = await loadConfig("production", "*");
    expect(config.allowedDevOrigins).toBeUndefined(); expect(config.output).toBe("export");
  });
});
