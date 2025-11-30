import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';

export default [
  // Base ESLint config
  eslint.configs.recommended,

  // TypeScript ESLint config
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: true,
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