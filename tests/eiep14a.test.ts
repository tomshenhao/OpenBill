import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import fixture from "./fixtures/eiep14a.json";
import request from "./fixtures/eiep14a-request.json";
import { parseEiep14a, readProductJson } from "../tools/electricity/adapters/eiep14a.ts";
import { prepareEiepImport, inspectEiepReceipt } from "../tools/electricity/eiep14a-import.ts";
import { sha256 } from "../tools/electricity/files.ts";

describe("EIEP14A normative JSON subset (synthetic files only)", () => {
  it("accepts an optional JSON header without inventing source timestamps or verification", () => {
    const { Retailers } = fixture;
    const bytes = Buffer.from(JSON.stringify({ Retailers }));
    const candidate = prepareEiepImport(bytes, request, new Date("2026-11-13T00:00:00Z"));
    expect(candidate.product.rundatetime).toBeUndefined();
    expect(candidate.provenance.sourceRevision).toBe(sha256(bytes));
    expect(candidate.comparisonEligible).toBe(false);
    expect(candidate.outstanding[0]).toContain("do not infer");
  });
  it("accepts BOM and case-insensitive code values without changing original evidence bytes", () => {
    const copy = structuredClone(fixture);
    copy.FileType = "prcschd"; copy.UtilType = "e"; copy.FileStatus = "i";
    copy.Retailers[0].TariffTypes[0].FixedVariable = "f";
    copy.Retailers[0].CustomerGroups[0].Plans[0].LowFixedCharge = "n";
    expect(parseEiep14a(readProductJson("\uFEFF" + JSON.stringify(copy))).filestatus).toBe("I");
  });
  it.each([0.1234567, 0.1234560001, 0.0000001])("rejects over-precision rate %s rather than rounding", (rate) => {
    const copy = structuredClone(fixture); copy.Retailers[0].CustomerGroups[0].Plans[0].Tariffs[0].Rate = rate;
    expect(() => parseEiep14a(copy)).toThrow();
  });
  it("reports missing fixed components as unresolved, not zero", () => {
    const copy = structuredClone(fixture); copy.RecordCount = 1;
    copy.Retailers[0].CustomerGroups[0].Plans[0].Tariffs.shift();
    const report = inspectEiepReceipt(Buffer.from(JSON.stringify(copy)), request, new Date("2026-11-13T00:00:00Z"));
    expect(report.plans[0].warnings.join()).toContain("never infer a zero");
    expect(report.comparisonEligible).toBe(false);
  });
  it("refuses malformed UTF-8 original files", () => {
    expect(() => prepareEiepImport(Buffer.from([0xff]), request)).toThrow();
  });
  it("checks original numeric precision before JSON floating-point rounding", () => {
    const original = JSON.stringify(fixture).replace('"Rate":0.123456', '"Rate":0.123456000000000001');
    expect(() => readProductJson(original)).toThrow("six decimal");
  });
  it("accepts the explicit hour-only ISO offset shown in the official field table", () => {
    expect(parseEiep14a({ ...fixture, RunDateTime: "2026-11-12T12:00:00+12" }).rundatetime).toBe("2026-11-12T12:00:00+12:00");
    expect(() => parseEiep14a({ ...fixture, RunDateTime: "2026-11-12T12:00:00" })).toThrow();
  });
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
