export type TipId = "reading" | "heat" | "hotWater" | "timing" | "led" | "appliances";
export type TipContext = { estimatedReading: boolean; heating: "unknown" | "heat-pump" | "electric" | "other"; hotWater: "unknown" | "electric" | "other"; timeOfUse: boolean; flexible: boolean; olderBulbs: boolean };
export const tipSources: Record<TipId, string> = {
  reading: "https://www.ea.govt.nz/documents/10251/Improving_electricity_billing_-_Retailer_guidance_version_3.0.pdf",
  heat: "https://www.ea.govt.nz/your-power/ways-to-save-energy/",
  hotWater: "https://www.eeca.govt.nz/for-homes/energy-saving-technology/water-heating/heat-water-efficiently/",
  timing: "https://www.ea.govt.nz/your-power/ways-to-save-energy/how-to-get-cheaper-power-bills-with-a-time-of-use-plan/",
  led: "https://www.ea.govt.nz/your-power/ways-to-save-energy/",
  appliances: "https://www.ea.govt.nz/your-power/ways-to-save-energy/",
};
export function recommendTips(context: TipContext, rating: "green" | "yellow" | "red" | "unknown" = "unknown"): TipId[] {
  if (rating === "yellow" || rating === "red") {
    const investigate: TipId[] = [];
    if (context.estimatedReading) investigate.push("reading");
    if (context.heating !== "other") investigate.push("heat");
    if (context.hotWater !== "other") investigate.push("hotWater");
    investigate.push("appliances");
    return investigate.slice(0, 3);
  }
  if (rating === "green") return [context.olderBulbs ? "led" : "appliances", ...(context.estimatedReading ? ["reading" as const] : [])];
  const tips: TipId[] = [];
  if (context.estimatedReading) tips.push("reading");
  if (context.heating === "electric" || context.heating === "heat-pump") tips.push("heat");
  if (context.hotWater === "electric") tips.push("hotWater");
  if (context.timeOfUse && context.flexible) tips.push("timing");
  if (context.olderBulbs) tips.push("led");
  if (!tips.length) tips.push("reading", "heat");
  return tips.slice(0, 3);
}
