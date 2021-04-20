module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-console': 'off',
    'no-param-reassign': 'off',
    'prefer-destructuring': 'off',
    'array-callback-return': 'off',
    'consistent-return': 'off',
    'no-use-before-define': 'off',
    'no-restricted-syntax': 'off',
    'no-plusplus': 'off',
    'global-require': 'off',
  },
  ignorePatterns: ['node_modules/'],
};
