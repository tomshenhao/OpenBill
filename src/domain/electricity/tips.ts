export type TipId = "reading" | "heat" | "hotWater" | "timing" | "led";
export type TipContext = { estimatedReading: boolean; heating: "unknown" | "heat-pump" | "electric" | "other"; hotWater: "unknown" | "electric" | "other"; timeOfUse: boolean; flexible: boolean; olderBulbs: boolean };
export const tipSources: Record<TipId, string> = {
  reading: "https://www.ea.govt.nz/documents/10251/Improving_electricity_billing_-_Retailer_guidance_version_3.0.pdf",
  heat: "https://www.ea.govt.nz/your-power/ways-to-save-energy/",
  hotWater: "https://www.eeca.govt.nz/for-homes/energy-saving-technology/water-heating/heat-water-efficiently/",
  timing: "https://www.ea.govt.nz/your-power/ways-to-save-energy/how-to-get-cheaper-power-bills-with-a-time-of-use-plan/",
  led: "https://www.ea.govt.nz/your-power/ways-to-save-energy/",
};
export function recommendTips(context: TipContext): TipId[] {
  const tips: TipId[] = [];
  if (context.estimatedReading) tips.push("reading");
  if (context.heating === "electric" || context.heating === "heat-pump") tips.push("heat");
  if (context.hotWater === "electric") tips.push("hotWater");
  if (context.timeOfUse && context.flexible) tips.push("timing");
  if (context.olderBulbs) tips.push("led");
  if (!tips.length) tips.push("reading", "heat");
  return tips.slice(0, 3);
}
