import type { NextConfig } from "next";

const config: NextConfig = {
  transpilePackages: ["@ward/core"],
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
