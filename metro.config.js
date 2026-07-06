const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Добавляем алиасы для Metro
config.resolver.alias = {
  '@': path.resolve(__dirname, 'src'),
  '@components': path.resolve(__dirname, 'src/components'),
  '@services': path.resolve(__dirname, 'src/services'),
  '@lib': path.resolve(__dirname, 'src/lib'),
  '@hooks': path.resolve(__dirname, 'src/hooks'),
  '@constants': path.resolve(__dirname, 'src/constants'),
  '@store': path.resolve(__dirname, 'src/store'),
  '@types': path.resolve(__dirname, 'src/types'),
};

module.exports = config;