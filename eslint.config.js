import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'coverage']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
    },
  },
  // Node/Edge-function and test files that use process.env and other Node globals
  {
    files: ['api/**/*.js', 'playwright.config.js', 'vitest.config.js', 'tests/**/*.{js,jsx}'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  // Project-wide rule overrides
  {
    files: ['**/*.{js,jsx}'],
    rules: {
      // New react-hooks v7 rule; this codebase intentionally resets derived
      // state in effects (e.g. clearing cover results when title changes,
      // loading cached AI results on tab switch). Disable until refactored.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
