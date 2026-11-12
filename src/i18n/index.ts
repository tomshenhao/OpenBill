import { en } from "./en";
import { zh } from "./zh";

export type Locale = "en" | "zh";
export type { Messages } from "./en";
export const messages = { en, zh };
export const languageTags = { en: "en-NZ", zh: "zh-Hans-NZ" } as const;

export function localeFromPath(segments: string[] | undefined): Locale | null {
  if (!segments || segments.length === 0) return "en";
  if (segments.length === 1 && segments[0] === "zh") return "zh";
  return null;
}
