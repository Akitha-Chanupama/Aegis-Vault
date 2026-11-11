/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@aegis/shared", "@aegis/crypto", "@aegis/database"],
  webpack: (config) => {
    config.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self';",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' 'wasm-unsafe-eval';",
              "style-src 'self' 'unsafe-inline';",
              "img-src 'self' blob: data:;",
              "connect-src 'self' blob: http://localhost:* ws://localhost:*;",
              "font-src 'self' data:;",
              "frame-ancestors 'none';",
              "object-src 'none';",
              "base-uri 'self';",
            ].join(" "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
