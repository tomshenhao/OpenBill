import type { ElectricityTariff } from "@/domain/electricity/tariff";
import published from "../../../data/electricity/published.json";

// Intentionally empty. Never populate this with illustrative or inferred supplier prices.
// See docs/data-policy.md for the evidence and review gate before adding real records.
export const electricityTariffs: readonly ElectricityTariff[] = published;
