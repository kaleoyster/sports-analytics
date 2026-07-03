/** @type {import('next').NextConfig} */

function normalizeProxyTarget(raw) {
  if (!raw) return "";
  let url = raw.trim().replace(/\/$/, "");
  if (!url) return "";

  // Vercel requires destination to start with http:// or https://
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }

  try {
    new URL(url);
    return url;
  } catch {
    console.warn(
      `Invalid API_PROXY_TARGET "${raw}" — proxy disabled. Use https://your-app.up.railway.app`
    );
    return "";
  }
}

const proxyTarget = normalizeProxyTarget(process.env.API_PROXY_TARGET);

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
