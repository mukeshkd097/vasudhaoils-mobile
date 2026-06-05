const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Force singleton packages to always resolve from this app's node_modules.
// pnpm symlinks otherwise give Metro two separate React copies, breaking
// React Compiler's useMemoCache and causing "Invalid hook call" errors.
config.resolver.extraNodeModules = {
  react: path.resolve(__dirname, "node_modules/react"),
  "react-dom": path.resolve(__dirname, "node_modules/react-dom"),
  "react-native": path.resolve(__dirname, "node_modules/react-native"),
  "@tanstack/react-query": path.resolve(__dirname, "node_modules/@tanstack/react-query"),
};

module.exports = config;
