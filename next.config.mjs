/** @type {import('next').NextConfig} */
import createNextIntlPlugin from "next-intl/plugin";
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "picsum.photos",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
      },
      {
        protocol: "https",
        hostname: "xnyaonbulqqqerinkwei.supabase.co",
      },
    ],
  },
  i18n: null, // Disable Next.js i18n to avoid conflicts
  productionBrowserSourceMaps: false,
  outputFileTracingRoot: process.cwd(),

  webpack: (config) => {
    config.ignoreWarnings = [
      { module: /node_modules\/next-intl/ },
      { message: /Build dependencies behind this expression are ignored/ },
    ];
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });

    // Reduce large-string serialization by emitting assets as files
    // 1) SVGs as files (avoid asset/inline or raw strings)
    config.module.rules.push({
      test: /\.svg$/i,
      type: "asset/resource",
    });

    // 2) Large text assets as files (txt, md)
    config.module.rules.push({
      test: /\.(txt|md)$/i,
      type: "asset/resource",
    });

    return config;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
