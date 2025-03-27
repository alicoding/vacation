module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks', '@next/next'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'next', // Use just 'next' instead of 'next/core-web-vitals'
  ],
  env: {
    browser: true,
    node: true,
    es2022: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
    next: {
      rootDir: '.',
    },
  },
  rules: {
    'indent': ['error', 2],
    'linebreak-style': ['error', 'unix'],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': 'off',
    'no-console': 'off',
    'react/react-in-jsx-scope': 'off',
    'react/prop-types': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    'react-hooks/exhaustive-deps': 'off', // Turn off the exhaustive-deps rule to avoid the ESLint error
    'react/no-unescaped-entities': 'off'
  },
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: {
          jsx: true
        },
        project: null, // Don't require tsconfig.json
      },
      rules: {
        'no-undef': 'off',
      }
    }
  ],
  ignorePatterns: [
    '.next/**',
    'out/**',
    'dist/**',
    'build/**',
    'node_modules/**',
    '.turbo/**',
    '.vercel/**',
    '.cloudflare/**',
    '.wrangler/**',
    'postcss.config.js',
    'next.config.js',
    'tailwind.config.js',
    'jest.config.js',
    '*.config.js',
    '*.config.cjs',
    '*.config.mjs'
  ]
};
