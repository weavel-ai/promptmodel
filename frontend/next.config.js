/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  rewrites: async () => [
    {
      source: "/discord",
      destination: "https://discord.gg/2Y36M36tZf",
    },
  ],
};

module.exports = nextConfig;
