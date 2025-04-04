import js from '@eslint/js';
import typescriptParser from '@typescript-eslint/parser';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import nextPlugin from '@next/eslint-plugin-next';
import nextOnPagesPlugin from 'eslint-plugin-next-on-pages';
import prettierConfig from 'eslint-config-prettier'; // Import prettier config

export default [
  // Base recommended configurations
  js.configs.recommended,
  // Apply TypeScript recommended rules AFTER js.recommended
  {
    plugins: { '@typescript-eslint': typescriptEslint },
    languageOptions: {
      parser: typescriptParser,
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: '.',
      },
    },
    rules: {
      ...typescriptEslint.configs['recommended-type-checked'].rules, // Use type-checked rules
      ...typescriptEslint.configs.stylistic.rules, // Add stylistic rules
      // Override core rules that conflict with TypeScript versions
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      // Allow 'any' for now, but keep as warning
      '@typescript-eslint/no-explicit-any': 'warn',
      // Downgrade unsafe rules to warnings temporarily
      '@typescript-eslint/no-unsafe-assignment': 'warn',
      '@typescript-eslint/no-unsafe-member-access': 'warn',
      '@typescript-eslint/no-unsafe-call': 'warn',
      '@typescript-eslint/no-unsafe-return': 'warn',
      '@typescript-eslint/no-unsafe-argument': 'warn',
      // Relax explicit return types for functions/modules
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      // Allow unused vars prefixed with _
      '@typescript-eslint/no-unsafe-declaration-merging': 'off', // Keep this off if needed
    },
  },
  // Disable specific rules for CalendarDay due to linting inconsistencies
  {
    files: ['components/calendar/CalendarDay.tsx'],
    rules: {
      '@typescript-eslint/no-misused-promises': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  // React specific configurations
  {
    files: ['**/*.{ts,tsx,js,jsx}'], // Apply to all relevant files
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      '@next/next': nextPlugin,
      'next-on-pages': nextOnPagesPlugin,
    },
    languageOptions: {
      globals: {
        // Define globals needed for React/Next/Browser
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
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules, // Include core web vitals rules
      // Specific overrides
      'react/react-in-jsx-scope': 'off', // Not needed with Next.js 17+
      'react/prop-types': 'off', // Use TypeScript for prop types
      '@next/next/no-img-element': 'off', // Keep off if using standard img
      // Keep console warnings
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Cloudflare Pages rules (keep if deploying there)
      'next-on-pages/no-unsupported-configs': 'error',
      // 'next-on-pages/no-unsupported-edge-api': 'error', // Keep commented if causing issues
      // 'next-on-pages/no-node-apis': 'error', // Keep commented if causing issues
    },
  },
  // Disable specific rules for generated Supabase types
  {
    files: ['types/supabase.ts'],
    rules: {
      '@typescript-eslint/no-redundant-type-constituents': 'off',
    },
  },
  // Global ignores
  {
    ignores: [
      'node_modules/**',
      '.next/**',
      'out/**',
      '.vercel/output/**', // Ignore Vercel build output
      'public/**', // Often contains static assets not meant for linting
      'dist/**',
      '**/*.d.ts', // TypeScript definition files
      '.wrangler/**', // Cloudflare wrangler output
      '*.config.js', // Config files like eslint, postcss, tailwind
      '*.cjs', // Config files like prettierrc
      '*.mjs', // Config files like next.config, postcss.config
    ],
  },
  // Prettier config MUST be last to override other formatting rules
  prettierConfig,
];
