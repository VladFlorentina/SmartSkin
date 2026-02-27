const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Exclude node_modules imbricate pentru a evita duplicate si a accelera bundling-ul
config.resolver = {
    ...config.resolver,
    blockList: [
        /node_modules\/.*\/node_modules\/react-native\/.*/,
    ],
};

module.exports = config;
