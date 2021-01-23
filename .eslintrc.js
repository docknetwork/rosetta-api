module.exports = {
  env: {
    jest: true,
  },
  extends: [
    'google',
    'plugin:prettier/recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
  ],
  parser: 'babel-eslint',
  rules: {
    'prettier/prettier': ['error', { singleQuote: true }],
  },
};
