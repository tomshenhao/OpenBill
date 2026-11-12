import type { EvidenceManifest } from "../../../src/domain/electricity/tariff.ts";

export interface ManualCollectionAdapter {
  retailerId: string;
  validate(manifest: EvidenceManifest): void;
}

// A manual adapter, not a scraper. Mercury's website terms prohibit scraping.
// Input is an operator's permitted, nonpersonal official source capture.
export const mercuryManualAdapter: ManualCollectionAdapter = {
  retailerId: "mercury",
  validate(manifest) {
    if (manifest.retailerId !== "mercury" || manifest.captureMethod !== "manual") throw new Error("Mercury accepts manual source imports only");
    if (manifest.screenshot && (manifest.rights.redistribution !== "permission-granted" || !manifest.rights.permissionReference)) throw new Error("Mercury images require a written permission reference before import");
  },
};
