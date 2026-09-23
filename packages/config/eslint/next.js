// ESLint preset for apps/web. eslint-config-next already registers the
// typescript-eslint, react and react-hooks plugins, so we only add rules.
import comments from '@eslint-community/eslint-plugin-eslint-comments/configs';
import prettier from 'eslint-config-prettier/flat';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import { globalIgnores } from 'eslint/config';

import { doulishaRules, ignores, typeAwareRules, typescriptRules } from './base.js';

export default [
  ...nextVitals,
  ...nextTs,
  comments.recommended,
  doulishaRules,
  typescriptRules,
  typeAwareRules,
  ignores,
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
  prettier,
];
