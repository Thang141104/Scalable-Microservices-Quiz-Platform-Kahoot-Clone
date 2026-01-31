module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Error Prevention
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'no-undef': 'error',
    'no-var': 'error',
    'prefer-const': 'error',
    
    // Code Quality
    'eqeqeq': ['error', 'always'],
    'curly': ['error', 'all'],
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-return-await': 'error',
    'require-await': 'error',
    
    // Best Practices
    'consistent-return': 'error',
    'default-case': 'error',
    'no-fallthrough': 'error',
    'no-param-reassign': 'warn',
    'no-throw-literal': 'error',
    
    // Style (helps with logic clarity)
    'max-len': ['warn', { code: 120, ignoreComments: true }],
    'max-lines-per-function': ['warn', { max: 50, skipBlankLines: true }],
    'complexity': ['warn', 10],
    'max-depth': ['warn', 4]
  }
};
