import type { NextConfig } from "next";

// Explicit hostnames only: never trust an entire LAN, wildcard or arbitrary origin.
const devOrigins = process.env.NODE_ENV === "development"
  ? ["127.0.0.1", ...(process.env.OPENBILL_DEV_ORIGINS ?? "").split(",").map((host) => host.trim().toLowerCase()).filter(Boolean)]
  : undefined;
for (const host of devOrigins ?? []) {
  let valid = false;
  try {
    const url = new URL(`http://${host}`);
    valid = url.hostname === host && url.host === host && !host.includes("*") && !["0.0.0.0", "[::]"].includes(host);
  } catch { /* Reject malformed hostnames without printing configuration values. */ }
  if (!valid) throw new Error("OPENBILL_DEV_ORIGINS must contain explicit hostnames/IPs without schemes, ports, paths or wildcards.");
}

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  poweredByHeader: false,
  allowedDevOrigins: devOrigins ? [...new Set(devOrigins)] : undefined,
};

export default nextConfig;
