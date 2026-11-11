import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@ward/core"],
  allowedDevOrigins: ["192.168.1.195", "localhost:3000"],
  webpack(webpackConfig) {
    webpackConfig.resolve = webpackConfig.resolve || {};
    webpackConfig.resolve.extensionAlias = {
      ".js": [".ts", ".tsx", ".js"],
      ".mjs": [".mts", ".mjs"],
    };
    return webpackConfig;
  },
};

export default config;
