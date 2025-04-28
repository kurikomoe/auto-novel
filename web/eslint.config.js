import globals from 'globals';
import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import pluginVue from 'eslint-plugin-vue';
import compat from 'eslint-plugin-compat';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import {
  defineConfigWithVueTs,
  vueTsConfigs,
} from '@vue/eslint-config-typescript';

export default defineConfigWithVueTs(
  // { files: ["**/*.{js,mjs,cjs,ts,vue}"], plugins: { js }, extends: ["js/recommended"] },
  globalIgnores(['**/*.d.ts']),
  {
    files: ['**/*.{js,mjs,cjs,ts,vue}'],
    languageOptions: { globals: globals.browser },
  },
  tseslint.configs.recommended,
  pluginVue.configs['flat/recommended'],
  vueTsConfigs.recommended,
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  compat.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    rules: {
      'no-unused-vars': 'off',
      'prefer-const': 'warn',

      'vue/max-attributes-per-line': 'off',

      '@typescript-eslint/no-namespace': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
);
