import { tariffSchema, type ElectricityTariff, type UsageBand } from "./tariff.ts";
import { nzdToMicros } from "./money.ts";

export type Issue = { code: string; path: string };
export type Retailer = { id: string; officialHosts: string[]; sourceUrls: string[]; automation: string; termsUrl?: string | null };
export type Network = { id: string; regionCodes: string[]; sourceUrl: string };
export type DataPolicy = { retailers: Retailer[]; networks: Network[] };

export function scopeKey(record: ElectricityTariff): string {
  return JSON.stringify([record.retailerId, record.plan.id, [...record.coverage.regionCodes].sort(), [...record.coverage.networkIds].sort(), record.metering.configuration, [...record.metering.registers].sort(), record.eligibility]);
}

function scheduleIssues(bands: UsageBand[]): Issue[] {
  const issues: Issue[] = [];
  const minute = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
  for (const register of new Set(bands.map((band) => band.register))) {
    const group = bands.filter((band) => band.register === register);
    const path = `charges.usage.${register}`;
    const kinds = new Set(group.map((band) => band.kind));
    if (kinds.size !== 1 || (kinds.has("flat") && group.length !== 1)) {
      issues.push({ code: "conflicting-rate-structures", path });
      continue;
    }
    if (kinds.has("time-of-use")) {
      const occupied = new Uint8Array(7 * 1440);
      for (const band of group) {
        if (band.kind !== "time-of-use") continue;
        if (new Set(band.days).size !== band.days.length) issues.push({ code: "duplicate-weekdays", path });
        const start = minute(band.start);
        let end = minute(band.end);
        if (end === start) { issues.push({ code: "empty-period", path }); continue; }
        if (end < start) end += 1440;
        let overlap = false;
        for (const day of band.days) {
          for (let offset = start; offset < end; offset += 1) {
            const index = ((day - 1) * 1440 + offset) % occupied.length;
            if (occupied[index]) overlap = true;
            occupied[index] = 1;
          }
        }
        if (overlap) issues.push({ code: "overlapping-periods", path });
      }
      if (occupied.includes(0)) issues.push({ code: "uncovered-periods", path });
    }
    if (kinds.has("tiered")) {
      const tiers = group.filter((band) => band.kind === "tiered").sort((a, b) => nzdToMicros(a.fromKwh) < nzdToMicros(b.fromKwh) ? -1 : 1);
      let boundary: bigint | null = 0n;
      for (const band of tiers) {
        const lower = nzdToMicros(band.fromKwh);
        const upper = band.toKwh === null ? null : nzdToMicros(band.toKwh);
        if (boundary === null || lower !== boundary || (upper !== null && upper <= lower)) issues.push({ code: "conflicting-tiers", path });
        boundary = upper;
      }
      if (boundary !== null || new Set(tiers.map((band) => band.reset)).size !== 1) issues.push({ code: "incomplete-tier-structure", path });
    }
  }
  return issues;
}

export function validateTariff(input: unknown, policy: DataPolicy, now = new Date()): { record: ElectricityTariff | null; issues: Issue[] } {
  const parsed = tariffSchema.safeParse(input);
  if (!parsed.success) return { record: null, issues: parsed.error.issues.map((issue) => ({ code: "schema", path: issue.path.join(".") })) };
  const record = parsed.data;
  const issues: Issue[] = [];
  const add = (code: string, path: string) => issues.push({ code, path });
  const retailer = policy.retailers.find((entry) => entry.id === record.retailerId);
  const source = new URL(record.provenance.sourceUrl);
  if (!retailer || !retailer.officialHosts.includes(source.hostname) || !retailer.sourceUrls.includes(source.href)) add("unapproved-official-source", "provenance.sourceUrl");
  if (record.effectiveTo !== null && record.effectiveTo <= record.effectiveFrom) add("invalid-effective-window", "effectiveTo");
  if (new Date(record.provenance.collectedAt) > now) add("future-collection", "provenance.collectedAt");
  for (const networkId of record.coverage.networkIds) {
    const network = policy.networks.find((entry) => entry.id === networkId);
    if (!network || !record.coverage.regionCodes.every((region) => network.regionCodes.includes(region))) add("unsupported-network-region", "coverage");
  }
  for (const region of record.coverage.regionCodes) {
    if (!policy.networks.some((network) => record.coverage.networkIds.includes(network.id) && network.regionCodes.includes(region))) add("unsupported-region-network", "coverage");
  }
  for (const values of [record.coverage.regionCodes, record.coverage.networkIds, record.metering.registers]) {
    if (new Set(values).size !== values.length) add("duplicate-scope-values", "coverage-or-metering");
  }
  const chargeIds = [...record.charges.daily, ...record.charges.usage].map((charge) => charge.id);
  if (new Set(chargeIds).size !== chargeIds.length) add("duplicate-charge-id", "charges");
  if (record.charges.usage.some((band) => !record.metering.registers.includes(band.register)) || record.metering.registers.some((register) => !record.charges.usage.some((band) => band.register === register))) add("register-mismatch", "metering.registers");
  if (record.gst.ratePercent !== null && nzdToMicros(record.gst.ratePercent) > 100_000_000n) add("invalid-gst-rate", "gst.ratePercent");
  if (record.gst.treatment === "exclusive" && record.gst.ratePercent === null) add("missing-gst-rate", "gst.ratePercent");
  const { minimumAnnualKwh: min, maximumAnnualKwh: max } = record.eligibility;
  if (min !== null && max !== null && nzdToMicros(min) > nzdToMicros(max)) add("invalid-eligibility-range", "eligibility");
  issues.push(...scheduleIssues(record.charges.usage));
  return { record, issues };
}

export function validateHistory(records: ElectricityTariff[]): Issue[] {
  const issues: Issue[] = [];
  const ids = new Set<string>();
  const revisions = new Set<string>();
  const byId = new Map(records.map((record) => [record.recordId, record]));
  for (const record of records) {
    if (ids.has(record.recordId)) issues.push({ code: "duplicate-record", path: record.recordId });
    ids.add(record.recordId);
    const revisionKey = `${scopeKey(record)}:${record.revision}`;
    if (revisions.has(revisionKey)) issues.push({ code: "duplicate-revision", path: record.recordId });
    revisions.add(revisionKey);
    if (record.supersedes) {
      const parent = byId.get(record.supersedes);
      if (!parent || parent.recordId === record.recordId || scopeKey(parent) !== scopeKey(record) || parent.effectiveFrom > record.effectiveFrom) issues.push({ code: "invalid-supersession", path: record.recordId });
    }
    const seen = new Set([record.recordId]);
    let parentId = record.supersedes;
    while (parentId) {
      if (seen.has(parentId)) { issues.push({ code: "history-cycle", path: record.recordId }); break; }
      seen.add(parentId);
      parentId = byId.get(parentId)?.supersedes ?? null;
    }
  }
  const ancestor = (child: ElectricityTariff, parentId: string) => {
    const seen = new Set<string>();
    let current = child.supersedes;
    while (current && !seen.has(current)) {
      if (current === parentId) return true;
      seen.add(current);
      current = byId.get(current)?.supersedes ?? null;
    }
    return false;
  };
  for (let i = 0; i < records.length; i += 1) {
    for (const other of records.slice(i + 1)) {
      const record = records[i];
      const scopeOverlaps = record.retailerId === other.retailerId && record.plan.id === other.plan.id && record.metering.configuration === other.metering.configuration && [...record.metering.registers].sort().join() === [...other.metering.registers].sort().join() && record.coverage.regionCodes.some((region) => other.coverage.regionCodes.includes(region)) && record.coverage.networkIds.some((network) => other.coverage.networkIds.includes(network)) && (record.eligibility.userCategory === other.eligibility.userCategory || record.eligibility.userCategory === "unrestricted" || other.eligibility.userCategory === "unrestricted");
      if (scopeOverlaps && record.effectiveFrom < (other.effectiveTo ?? "9999-12-31") && other.effectiveFrom < (record.effectiveTo ?? "9999-12-31") && !ancestor(record, other.recordId) && !ancestor(other, record.recordId)) issues.push({ code: "overlapping-revisions", path: record.recordId });
    }
  }
  return issues;
}
