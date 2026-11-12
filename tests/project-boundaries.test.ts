import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { electricityTariffs } from "@/data/electricity/tariffs";
import { localeFromPath, messages } from "@/i18n";

function textKeys(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, entry]) => {
    const path = `${prefix}${key}`;
    return typeof entry === "object" ? textKeys(entry, `${path}.`) : [path];
  }).sort();
}

describe("project boundaries", () => {
  it("keeps the supplier catalogue empty until real evidence is reviewed", () => {
    expect(electricityTariffs).toEqual([]);
  });

  it("has equivalent English and Simplified Chinese copy keys", () => {
    expect(textKeys(messages.zh)).toEqual(textKeys(messages.en));
  });

  it("recognises only the supported page paths", () => {
    expect(localeFromPath(undefined)).toBe("en");
    expect(localeFromPath([])).toBe("en");
    expect(localeFromPath(["zh"])).toBe("zh");
    expect(localeFromPath(["fr"])).toBeNull();
    expect(localeFromPath(["zh", "unexpected"])).toBeNull();
  });

  it("keeps application code free of input transport and persistence APIs", () => {
    // A regression tripwire, complemented by real browser network/storage assertions.
    const files = readdirSync(resolve("src"), { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name));
    for (const file of files) {
      const source = readFileSync(resolve(file.parentPath, file.name), "utf8");
      expect(source, file.name).not.toMatch(/\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|indexedDB)\b|document\.cookie|console\.|["']use server["']/);
      expect(source, file.name).not.toMatch(/from\s+["'][^"']*(?:tools\/|node:|\.local-data|electricity\/records|electricity\/reviews)/);
    }
  });
});
