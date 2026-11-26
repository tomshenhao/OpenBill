export function getPublicSiteUrl(): URL | undefined {
  const value = process.env.OPENBILL_SITE_URL?.trim();
  if (!value) return undefined;

  const url = URL.parse(value);
  if (!url || !["http:", "https:"].includes(url.protocol) || url.href !== `${url.origin}/`) {
    throw new Error("OPENBILL_SITE_URL must be an absolute HTTP or HTTPS origin without a path, query, fragment or credentials.");
  }
  return url;
}
