import { z } from "zod";
import { dateSchema } from "../../../src/domain/electricity/tariff.ts";

// Deliberately limited to the normative JSON field tables in EIEP14A v1.1.
// This validates product-file structure; it never verifies or publishes a price.
const code = z.string().regex(/^[A-Za-z0-9_]{1,30}$/);
const text = (length: number) => z.string().min(1).max(length);
const nullableList = <T extends z.ZodType>(schema: T) => z.array(schema).nullable().optional().transform((v) => v ?? []);
const refs = nullableList(code);
const nullableDate = dateSchema.nullable().optional().transform((v) => v ?? null);
const attribute = z.strictObject({ attributeid: code, attribute: text(50).nullable().optional(), datevalue: nullableDate, numvalue: z.number().finite().nullable().optional(), textvalue: text(50).nullable().optional(), description: text(1000).nullable().optional() });
const schedule = z.strictObject({
  scheduleid: code, daylightsavings: z.enum(["1", "2"]).nullable().optional(),
  starttime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).nullable().optional(),
  endtime: z.string().regex(/^(([01]\d|2[0-3]):[0-5]\d|24:00)$/).nullable().optional(),
  daytype: text(50).nullable(), month: text(50).nullable(),
}).superRefine((s, c) => {
  if ((s.starttime || s.endtime) && (!s.starttime || !s.endtime || !s.daylightsavings || s.endtime <= s.starttime)) c.addIssue({ code: "custom", message: "Timed schedules need explicit daylight-savings treatment and must not span midnight" });
  if (s.month && s.month !== "ANY" && s.month.split(" ").some((m) => !"JAN FEB MAR APR MAY JUN JUL AUG SEP OCT NOV DEC".split(" ").includes(m))) c.addIssue({ code: "custom", message: "Invalid month selector" });
  if (s.daytype && !["ANY", "BD", "NBD", "WD", "WE", "LBD", "LNBD", "SBD", "SPNBD"].includes(s.daytype) && s.daytype.split(" ").some((d) => !"MON TUE WED THU FRI SAT SUN".split(" ").includes(d))) c.addIssue({ code: "custom", message: "Invalid day selector" });
});
const tariffType = z.strictObject({ tarifftypeid: code, description: text(50), fixedvariable: z.enum(["F", "V"]), unit: text(25).nullable().optional(), flowdirection: z.enum(["X", "I", "B"]).nullable().optional(), "rcc-poa": nullableList(z.tuple([text(20), z.number().int().min(0).max(24)])), scheduleids: refs, attributeids: refs });
const network = z.strictObject({ network: text(4).length(4).nullable().optional(), nsp: nullableList(text(100)), distributorpricecategory: nullableList(text(100)), distributorlosscategory: nullableList(text(100)) });
const tariffRegion = z.strictObject({ tariffregionid: code, description: text(50).nullable().optional(), networks: nullableList(network) });
const tariff = z.strictObject({ tariff: text(50).nullable().optional(), tariffregionid: code.nullable().optional(), tarifftypeid: code, rate: z.number().finite().nonnegative().max(999999.999999).refine((n) => Math.abs(n * 1e6 - Math.round(n * 1e6)) < 0.001, "At most six decimal places"), attributeids: refs });
const plan = z.strictObject({ planid: text(32), description: text(50), startdate: nullableDate, enddate: nullableDate, closedate: nullableDate, lowfixedcharge: z.enum(["Y", "N"]), attributeids: refs, tariffs: z.array(tariff).min(1) }).superRefine((p, c) => {
  if (p.startdate && p.enddate && p.enddate < p.startdate) c.addIssue({ code: "custom", message: "Plan dates reversed" });
});
const retailer = z.strictObject({ traderid: text(4).length(4).nullable(), retailerid: text(4).length(4).nullable(), retailerbrandname: text(50), attributes: nullableList(attribute), schedules: nullableList(schedule), tarifftypes: z.array(tariffType).min(1), tariffregions: nullableList(tariffRegion), customergroups: z.array(z.strictObject({ customergroup: text(1000).nullable(), attributeids: refs, plans: z.array(plan).min(1) })).min(1) });
export const eiep14aSchema = z.strictObject({
  filetype: z.literal("PRCSCHD"), version: z.literal(1.1), sender: text(20).optional(), sentonbehalfof: text(4).length(4).nullable().optional(), recipient: z.string().max(4).optional(),
  rundatetime: z.iso.datetime({ offset: true }), extractdatetime: z.iso.datetime({ offset: true }).nullable().optional(), uniquifier: z.uuid().optional(), recordcount: z.number().int().nonnegative().optional(),
  utiltype: z.literal("E"), filestatus: z.literal("I"), retailers: z.array(retailer).min(1),
}).superRefine((data, context) => {
  const issue = (message: string) => context.addIssue({ code: "custom", message });
  const unique = (values: string[], what: string) => { if (new Set(values.map((v) => v.toUpperCase())).size !== values.length) issue(`Duplicate ${what}`); };
  const key = (v: string) => v.toUpperCase();
  unique(data.retailers.map((r) => r.retailerbrandname), "retailer");
  let count = 0;
  for (const r of data.retailers) {
    unique(r.attributes.map((a) => a.attributeid), "attribute"); unique(r.schedules.map((a) => a.scheduleid), "schedule"); unique(r.tarifftypes.map((a) => a.tarifftypeid), "tariff type"); unique(r.tariffregions.map((a) => a.tariffregionid), "tariff region");
    unique(r.customergroups.flatMap((g) => g.plans.map((p) => p.planid)), "plan");
    const attrs = new Set(r.attributes.map((a) => key(a.attributeid))), schedules = new Set(r.schedules.map((a) => key(a.scheduleid))), types = new Set(r.tarifftypes.map((a) => key(a.tarifftypeid))), regions = new Set(r.tariffregions.map((a) => key(a.tariffregionid)));
    const checkAttrs = (ids: string[]) => { unique(ids, "attribute reference"); for (const id of ids) if (!attrs.has(key(id))) issue("Unknown attribute reference"); };
    for (const t of r.tarifftypes) { checkAttrs(t.attributeids); unique(t.scheduleids, "schedule reference"); for (const id of t.scheduleids) if (!schedules.has(key(id))) issue("Unknown schedule reference"); }
    for (const g of r.customergroups) {
      checkAttrs(g.attributeids);
      for (const p of g.plans) {
        checkAttrs(p.attributeids);
        const signatures = p.tariffs.map((t) => JSON.stringify([t.tariffregionid?.toUpperCase(), t.tarifftypeid.toUpperCase(), [...t.attributeids].map(key).sort()]));
        unique(signatures, "tariff scope");
        for (const t of p.tariffs) { count++; checkAttrs(t.attributeids); if (!types.has(key(t.tarifftypeid))) issue("Unknown tariff type reference"); if (t.tariffregionid && !regions.has(key(t.tariffregionid))) issue("Unknown tariff region reference"); }
      }
    }
  }
  if (data.recordcount !== undefined && count !== data.recordcount) issue("RecordCount does not match tariff count");
});

function foldKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(foldKeys);
  if (value && typeof value === "object") {
    const result: Record<string, unknown> = Object.create(null);
    for (const [key, item] of Object.entries(value)) {
      const folded = key.toLowerCase();
      if (Object.hasOwn(result, folded)) throw new Error("Conflicting JSON field names");
      result[folded] = foldKeys(item);
    }
    return result;
  }
  return value;
}
// Detect duplicate keys before JSON.parse can discard their earlier values.
export function readProductJson(text: string): unknown {
  const value: unknown = JSON.parse(text);
  const tokens = text.match(/"(?:[^"\\]|\\.)*"|[{}[\]:,]|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null/g) ?? [];
  let position = 0;
  function walk(depth: number) {
    if (depth > 60) throw new Error("Product file nesting limit");
    const token = tokens[position++];
    if (token === "{") {
      const seen = new Set<string>();
      while (tokens[position] !== "}") {
        const key = (JSON.parse(tokens[position++]) as string).toLowerCase();
        if (seen.has(key)) throw new Error("Duplicate JSON field");
        seen.add(key); position++; walk(depth + 1);
        if (tokens[position] !== ",") break;
        position++;
      }
      position++;
    } else if (token === "[") {
      while (tokens[position] !== "]") { walk(depth + 1); if (tokens[position] !== ",") break; position++; }
      position++;
    }
  }
  walk(0);
  return value;
}
export function parseEiep14a(input: unknown) { return eiep14aSchema.parse(foldKeys(input)); }
