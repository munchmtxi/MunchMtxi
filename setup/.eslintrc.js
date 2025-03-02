module.exports = {
  env: {
    node: true,
    es2021: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended' // Integrates Prettier with ESLint
  ],
  parserOptions: {
    ecmaVersion: 2021, // Updated for clarity
    sourceType: 'module',
  },
  rules: {
    'no-console': 'warn',
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }], // Ignore unused vars prefixed with _
    'prettier/prettier': 'error',
    'consistent-return': 'warn',
    'no-param-reassign': ['error', { props: false }],
    'prefer-const': ['error', { destructuring: 'all' }],
    'arrow-body-style': ['error', 'as-needed'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
  },

  extends: [
    'eslint:recommended',
    'plugin:prettier/recommended',
    'plugin:security/recommended'
  ],
  plugins: ['security'],
  
};
