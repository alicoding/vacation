import js from '@eslint/js';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import typescriptParser from '@typescript-eslint/parser';
import nextPlugin from '@next/eslint-plugin-next';
import nextOnPagesPlugin from 'eslint-plugin-next-on-pages';

export default [
  js.configs.recommended,
  {
    // Global ignores and settings
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      'public/**',
      'dist/**',
      '**/*.d.ts',
    ],
  },
  // TypeScript and React files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parser: typescriptParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
        project: './tsconfig.json',  // Point to your TypeScript config
        tsconfigRootDir: '.',
      },
      globals: {
        React: 'readonly',
        JSX: 'readonly',
        process: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URLSearchParams: 'readonly',
        RequestInit: 'readonly',
        Headers: 'readonly',
        Response: 'readonly',
        HeadersInit: 'readonly',
        URL: 'readonly',
        // Add browser globals
        window: 'readonly',
        document: 'readonly',
        localStorage: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        AbortController: 'readonly',
        HTMLElement: 'readonly',
        HTMLDivElement: 'readonly',
        SVGSVGElement: 'readonly',
      },
    },
    plugins: {
      react: reactPlugin,
      '@typescript-eslint': typescriptEslint,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
      'next-on-pages': nextOnPagesPlugin,
    },
    rules: {
      // TypeScript specific rules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true, 
      }],
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      
      // React specific rules
      'react/react-in-jsx-scope': 'off', 
      'react/prop-types': 'off',
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      
      // General code style
      'quotes': ['error', 'single'],
      'semi': ['error', 'always'],
      'indent': ['error', 2],
      'comma-dangle': ['error', 'always-multiline'],
      'arrow-parens': ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      
      // Next.js specific
      '@next/next/no-img-element': 'off',
      
      // Cloudflare Pages & Next.js compatibility rules
      'next-on-pages/no-unsupported-configs': 'error',
      
      // Remove the problematic rules
      // 'next-on-pages/no-unsupported-edge-api': 'error',
      // 'next-on-pages/no-node-apis': 'error',
      
      // Override core rules that conflict with TypeScript
      'no-unused-vars': 'off', // Use TypeScript's version instead
      'no-undef': 'off', // TypeScript handles this for us
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
];