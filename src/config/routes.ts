import type { Locale } from "../i18n/index.ts";
import { coreCategories } from "./categories.ts";
import { insuranceModules } from "./insurance.ts";

export const homeRoutes = { en: "/", zh: "/zh/" } as const;

export const localizedRoutes = [
  homeRoutes,
  ...coreCategories.flatMap(({ route }) => route ? [route] : []),
  ...insuranceModules.map(({ route }) => route),
];

export function resolvePage(segments: string[] = []) {
  const locale: Locale = segments[0] === "zh" ? "zh" : "en";
  const [section, module, ...rest] = locale === "zh" ? segments.slice(1) : segments;

  if (section === undefined) return { kind: "home", locale } as const;
  if (module === undefined) {
    const category = coreCategories.find(({ id }) => id === section);
    return category?.status === "available" ? { kind: "tool", locale, category } as const : null;
  }
  if (section !== "insurance" || rest.length > 0) return null;
  const guide = insuranceModules.find(({ id }) => id === module);
  return guide ? { kind: "insurance-guide", locale, guide } as const : null;
}
