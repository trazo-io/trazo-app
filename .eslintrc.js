module.exports = {
  env: {
    browser: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:prettier/recommended',
    'prettier'
  ],
  overrides: [
    {
      env: {
        node: true
      },
      files: ['.eslintrc.{js,cjs}'],
      parserOptions: {
        sourceType: 'script'
      }
    },
    {
      // Until 2026-08-12 there was no TypeScript parser here at all, so every .ts/.tsx file
      // — 458 of the 521 source files — failed with "Parsing error: The keyword 'interface'
      // is reserved" and got ZERO rule coverage. It went unnoticed because `eslint .` on
      // ESLint 8 defaults to .js only: the script linted 18 files and exited 0, and CI read
      // that as "frontend lint clean".
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      plugins: ['@typescript-eslint'],
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      rules: {
        // The base rule cannot see type-only references and reports every imported type as
        // unused. The TS-aware version is the one that tells the truth here.
        'no-unused-vars': 'off',
        '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
        // TS enums / declare / namespace legitimately trip these two.
        'no-undef': 'off',
        'no-redeclare': 'off'
      }
    }
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: ['react', 'prettier'],
  rules: {
    'prettier/prettier': ['error', {}, { usePrettierrc: true }],
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off'
  },
  settings: {
    react: {
      version: 'detect'
    }
  }
};
