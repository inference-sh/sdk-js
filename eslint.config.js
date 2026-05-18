import eslint from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default [
  // Base ESLint config
  eslint.configs.recommended,

  // Node.js globals for JS files (examples and scripts)
  {
    files: ['**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // TypeScript ESLint config
  // Note: type-checked rules ('recommended-type-checked', 'strict-type-checked')
  // have been omitted because the ESLint config previously had a broken
  // `project + projectService` conflict that prevented any type-checking from
  // running. The codebase has pre-existing violations of those rules. Re-enable
  // them once the underlying type issues in src/ have been resolved.
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals['shared-node-browser'],
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      ...tseslint.configs['recommended'].rules,
      ...tseslint.configs['strict'].rules,
      // Disable formatting rules since we use Prettier
      ...prettier.rules,
      // TypeScript handles undefined-variable checking better than ESLint's
      // no-undef, which doesn't understand ambient type declarations.
      'no-undef': 'off',
      // Strict rules the codebase was not written to (were never enforced due
      // to the broken config). Re-enable and fix incrementally.
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-invalid-void-type': 'off',
      '@typescript-eslint/no-unnecessary-type-constraint': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      // Allow _-prefixed parameters and variables to signal intentional non-use
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },

  // Jest globals for test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.jest,
      },
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