/** @type {import('next').NextConfig} */
const proxyTarget = process.env.API_PROXY_TARGET?.replace(/\/$/, "");

const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "api.dicebear.com" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
  env: {
    // When proxying, the browser calls same-origin /api/* (avoids build-time URL issues).
    NEXT_PUBLIC_API_URL:
      process.env.NEXT_PUBLIC_API_URL || (proxyTarget ? "/api" : ""),
  },
  async rewrites() {
    if (!proxyTarget) return [];
    return [
      {
        source: "/api/:path*",
        destination: `${proxyTarget}/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
