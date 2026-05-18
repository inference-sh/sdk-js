import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Base ESLint config
  eslint.configs.recommended,

  // Node.js globals for JS example files
  {
    files: ['examples/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript ESLint config
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      ...tseslint.configs['recommended-type-checked'].rules,
      ...tseslint.configs['strict'].rules,
      ...tseslint.configs['strict-type-checked'].rules,
      // Disable formatting rules since we use Prettier
      ...prettier.rules,
    },
  },

  // Override specific rules
  {
    ignores: ['dist/**/*'],
    rules: {
      // Add any custom rule overrides here
    },
  },
]; 