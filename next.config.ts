import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * Security headers applied to every route.
 *
 * Note on Permissions-Policy: `microphone=(self)` is required — the STT encounter
 * workspace calls getUserMedia to record consultations. Denying it outright would
 * silently break recording.
 */
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=(self), interest-cohort=()' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
];

const nextConfig: NextConfig = {
  // Patient portraits are local assets under /public. Components render them with
  // `unoptimized` on purpose: the committed fallback is an .svg, and serving SVG
  // through the image optimizer would require `dangerouslyAllowSVG`, which we do
  // not want enabled. AVIF/WebP stay configured for any optimized image added later.
  images: { formats: ['image/avif', 'image/webp'] },
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1'],
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }];
  },
};

export default createNextIntlPlugin()(nextConfig);
