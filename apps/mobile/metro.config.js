const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch the mobile app and monorepo packages only
config.watchFolders = [
  projectRoot,
  path.resolve(monorepoRoot, 'packages'),
];

// 2. Resolve modules from mobile's node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
];

// 3. Limit worker concurrency to prevent Node 24 V8 Zone allocation crashes on Windows
config.maxWorkers = 2;

module.exports = withNativeWind(config, {
  input: path.resolve(projectRoot, 'global.css'),
  configPath: path.resolve(projectRoot, 'tailwind.config.js'),
});
