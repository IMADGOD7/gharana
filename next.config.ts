import type { NextConfig } from "next";

/**
 * Resolve the canonical site URL for every Vercel deployment environment:
 *   - Production:  NEXT_PUBLIC_SITE_URL  (set manually in Vercel → Settings → Env Vars)
 *   - Preview:     VERCEL_URL            (injected automatically by Vercel per-deployment)
 *   - Local dev:   http://localhost:3000
 *
 * VERCEL_URL does NOT include a protocol, so we add https:// manually.
 */
function getSiteUrl(): string {
  // NEXT_PUBLIC_SITE_URL takes priority (can be set in Vercel for production)
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL;
  }
  // NEXT_PUBLIC_APP_URL is the existing Vercel production env var
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  // VERCEL_URL is auto-injected by Vercel for every preview deployment
  // It does NOT include a protocol, so we add https:// manually.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // typedRoutes: true,  // Re-enable once all routes are defined (T1+)

  serverActions: {
    bodySizeLimit: 50 * 1024 * 1024, // 50 MB — needed for media uploads via Server Actions
  },

  env: {
    // Makes the resolved URL available as process.env.NEXT_PUBLIC_SITE_URL
    // in BOTH server and client bundles for every deployment.
    NEXT_PUBLIC_SITE_URL: getSiteUrl(),
  },
};

export default nextConfig;