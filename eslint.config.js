import js from '@eslint/js';
import react from 'eslint-plugin-react';

export default [
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        console: 'readonly',
        window: 'readonly',
        document: 'readonly',
        fetch: 'readonly',
        navigator: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    plugins: {
      react,
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'warn',
      'no-console': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
    },
  },
];
