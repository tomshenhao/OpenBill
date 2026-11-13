import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/eiep14a.json";
import request from "./fixtures/eiep14a-request.json";
import { parseEiep14a, readProductJson } from "../tools/electricity/adapters/eiep14a.ts";
import { prepareEiepImport } from "../tools/electricity/eiep14a-import.ts";
import { sha256 } from "../tools/electricity/files.ts";

describe("EIEP14A normative JSON subset (synthetic files only)", () => {
  it("preserves rates, units, inherited conditions and network restrictions", () => {
    const data = parseEiep14a(fixture); const retailer = data.retailers[0];
    expect(retailer.customergroups[0].plans[0].tariffs[1].rate).toBe(0.123456);
    expect(retailer.tarifftypes[1].unit).toBe("kWh");
    expect(retailer.tariffregions[0].networks[0].distributorpricecategory).toEqual(["SYNTHETIC"]);
    expect(retailer.customergroups[0].plans[0].attributeids).toEqual(["TEST_CONDITION"]);
  });
  it("accepts case-insensitive field names but rejects ambiguous duplicate keys", () => {
    expect(() => parseEiep14a({ ...fixture, filetype: "PRCSCHD" })).toThrow("Conflicting");
    const lower = Object.fromEntries(Object.entries(fixture).map(([k, v]) => [k.toLowerCase(), v]));
    expect(parseEiep14a(lower).filetype).toBe("PRCSCHD");
    expect(() => readProductJson('{"a":1,"a":2}')).toThrow("Duplicate");
    expect(() => readProductJson('{"A":1,"a":2}')).toThrow("Duplicate");
  });
  it("does not promote a schema-valid product to a verified or publishable tariff", () => {
    const bytes = readFileSync(request.sourceFile), candidate = prepareEiepImport(bytes, request, new Date("2026-11-13T00:00:00Z"));
    expect(candidate.status).toBe("pending-verification"); expect(candidate.comparisonEligible).toBe(false);
    expect(candidate.gst).toBe("exclusive"); expect(candidate.rights.redistribution).toBe("local-only");
    expect(candidate.provenance.sourceContentSha256).toBe(sha256(bytes)); expect(candidate.provenance.screenshotSha256).toBeNull();
    expect(candidate.outstanding.length).toBeGreaterThan(5);
  });
  it.each(["reference", "negative", "duplicate", "date", "count", "private", "gas", "incremental", "alias"])("rejects %s data", (scenario) => {
    const copy = structuredClone(fixture); const retailer = copy.Retailers[0], plan = retailer.CustomerGroups[0].Plans[0];
    if (scenario === "reference") plan.Tariffs[0].TariffTypeId = "MISSING";
    if (scenario === "negative") plan.Tariffs[0].Rate = -1;
    if (scenario === "duplicate") retailer.TariffTypes.push(retailer.TariffTypes[0]);
    if (scenario === "date") plan.StartDate = "2026-04-31";
    if (scenario === "count") copy.RecordCount = 3;
    if (scenario === "private") Object.assign(copy, { ICP: "SYNTHETIC-IDENTIFIER-MUST-BE-REJECTED" });
    if (scenario === "gas") copy.UtilType = "G";
    if (scenario === "incremental") copy.FileStatus = "R";
    if (scenario === "alias") Object.assign(plan, { Plan: plan.PlanId });
    expect(() => parseEiep14a(copy)).toThrow();
  });
  it("rejects future receipt times and unconfirmed nonpersonal files", () => {
    const bytes = readFileSync(request.sourceFile);
    expect(() => prepareEiepImport(bytes, { ...request, publicNonPersonalProductFileConfirmed: false })).toThrow();
    expect(() => prepareEiepImport(bytes, { ...request, collectedAt: "2099-01-01T00:00:00.000Z" })).toThrow();
  });
});
