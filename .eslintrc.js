// .eslintrc.js
module.exports = {
  extends: ['expo', 'plugin:@typescript-eslint/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  rules: {
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-empty-function': 'off',
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'react-native/no-inline-styles': 'off',
  },
  ignorePatterns: [
    'node_modules/',
    'babel.config.js',
    'metro.config.js',
    'app.config.ts',
    'supabase/migrations/',
    'src/types/database.types.ts',
    'data/',              // ← ДОБАВИТЬ
    'free-exercise-db*', // ← ДОБАВИТЬ (на всякий случай)
    'coverage/',
    '.expo/',
    'dist/',
    'android/',
    'ios/',
  ],
  settings: {
    react: { version: 'detect' },
  },
};