/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/docs/:path*",
          destination: "https://promptmodel-docs.vercel.app/docs/:path*", // Proxy to Docs site
        },
      ],
    };
  },
};

module.exports = nextConfig;
