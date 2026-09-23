// Shared ESLint rules for every TypeScript package in the monorepo.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/**
 * House rules for every file, added on top of each framework preset.
 * Every eslint-disable comment must explain why (see CLAUDE.md).
 * @type {import('eslint').Linter.Config}
 */
export const doulishaRules = {
  name: 'doulisha/rules',
  linterOptions: {
    reportUnusedDisableDirectives: 'error',
  },
  rules: {
    '@eslint-community/eslint-comments/require-description': ['error', { ignore: [] }],
    '@eslint-community/eslint-comments/no-unlimited-disable': 'error',
    eqeqeq: ['error', 'smart'],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
};

/**
 * House rules for TypeScript files. Scoped to TS because some presets
 * (eslint-config-expo) register the typescript-eslint plugin for TS files only.
 * `any` is forbidden unless the disable comment explains why.
 * @type {import('eslint').Linter.Config}
 */
export const typescriptRules = {
  name: 'doulisha/typescript',
  files: ['**/*.{ts,tsx,mts,cts}'],
  rules: {
    '@typescript-eslint/no-explicit-any': 'error',
    '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
  },
};

/** Type-aware rules that catch async bugs (unhandled promises matter for payments). */
export const typeAwareRules = {
  name: 'doulisha/type-aware',
  files: ['**/*.{ts,tsx,mts,cts}'],
  languageOptions: {
    parserOptions: {
      projectService: true,
    },
  },
  rules: {
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': 'error',
    '@typescript-eslint/await-thenable': 'error',
  },
};

export const ignores = {
  name: 'doulisha/ignores',
  ignores: ['**/node_modules/**', '**/dist/**', '**/coverage/**', '**/.turbo/**'],
};

/** Preset for framework-free packages (packages/*). */
export default defineConfig(
  ignores,
  js.configs.recommended,
  tseslint.configs.recommended,
  comments.recommended,
  doulishaRules,
  typescriptRules,
  typeAwareRules,
  { files: ['**/*.{js,mjs,cjs}'], extends: [tseslint.configs.disableTypeChecked] },
  prettier,
);
