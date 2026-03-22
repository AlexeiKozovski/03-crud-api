import eslint from '@eslint/js';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import zodX from 'eslint-plugin-zod-x';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      'zod-x': zodX,
    },
    rules: {
      ...zodX.configs.recommended.rules,
    },
  },
  {
    languageOptions: {
      globals: { ...globals.node },
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'prettier.config.js'],
  },
  eslintConfigPrettier,
);
