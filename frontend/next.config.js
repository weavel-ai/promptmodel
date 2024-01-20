/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  rewrites: async () => [
    {
      source: "/discord",
      destination: "https://discord.gg/2Y36M36tZf",
    },
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.clerk.com",
        port: "",
      },
    ],
  },
};

module.exports = nextConfig;
