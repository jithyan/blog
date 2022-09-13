/**
 * @type {import('next').NextConfig}
 */

const debug = process.env.NODE_ENV !== "production";

const nextConfig = {
  /* config options here */
  assetPrefix: "/blog",
  publicRuntimeConfig: {
    basePath: "/blog",
  },
  basePath: "/blog",
};

console.log("Next config", nextConfig);

module.exports = nextConfig;
