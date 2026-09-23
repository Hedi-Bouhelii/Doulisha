// ESLint preset for apps/mobile, built on Expo's official flat config.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import prettier from 'eslint-config-prettier/flat';
import expoConfig from 'eslint-config-expo/flat.js';
import { globalIgnores } from 'eslint/config';

import { doulishaRules, ignores, typeAwareRules, typescriptRules } from './base.js';

export default [
  ...expoConfig,
  comments.recommended,
  doulishaRules,
  typescriptRules,
  typeAwareRules,
  ignores,
  globalIgnores(['.expo/**', 'dist/**', 'android/**', 'ios/**', 'expo-env.d.ts']),
  prettier,
];
