const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Explicitly add 'bin' and 'wasm' to bundle TensorFlow ML model weights
config.resolver.assetExts.push('bin', 'wasm', 'txt');

module.exports = config;
