import type { MetadataRoute } from "next";
import { localizedRoutes } from "@/config/routes";
import { getPublicSiteUrl } from "@/config/site-url";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getPublicSiteUrl();
  if (!siteUrl) return [];

  return localizedRoutes.flatMap(({ en, zh }) => [en, zh].map((path) => ({
    url: new URL(path, siteUrl).href,
  })));
}
