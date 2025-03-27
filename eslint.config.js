import { fileURLToPath } from 'node:url';
import js from '@eslint/js';
import { FlatCompat } from '@eslint/eslintrc';
import nextPlugin from '@next/eslint-plugin-next';

// Determine directories
const __filename = fileURLToPath(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Create the compatibility layer
const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all
});

export default [
  // Global ignores
  {
    ignores: [
      '.next/**',
      'out/**',
      'dist/**',
      'build/**',
      'node_modules/**',
      '.turbo/**',
      '.vercel/**',
      '.cloudflare/**',
      '.wrangler/**',
      'coverage/**',
      'cypress/**',
      'tests/**',
      'next.config.js',
      'postcss.config.js',
      'tailwind.config.js',
      'jest.config.js',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs'
    ]
  },

  // Next.js plugin config
  {
    plugins: {
      '@next/next': nextPlugin
    },
    settings: {
      next: {
        rootDir: __dirname,
      },
    },
    rules: {
      '@next/next/no-html-link-for-pages': 'error',
    },
  },

  // Import the legacy configuration - it's more robust for your needs
  ...compat.extends('.eslintrc.cjs'),
  
  // Override some rules for development
  {
    rules: {
      // Allow console statements in development
      'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
      
      // Prefix unused variables with underscore
      '@typescript-eslint/no-unused-vars': ['warn', { 
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }],
      
      // Allow 'any' with a warning rather than error
      '@typescript-eslint/no-explicit-any': 'warn',
      
      // Handle React JSX escaping
      'react/no-unescaped-entities': ['error', {
        forbid: [
          {
            char: '>',
            alternatives: ['&gt;']
          },
          {
            char: '}',
            alternatives: ['&#125;']
          }
        ]
      }]
    }
  }
];
