/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { browser: true, node: true, es2022: true },
  parserOptions: { ecmaVersion: "latest", sourceType: "module", ecmaFeatures: { jsx: true } },
  settings: {
    react: { version: "detect" },
  },
  // Keep config minimal so only unused items are reported
  extends: [],
  plugins: [],
  rules: {
    // Only warn for unused variables/functions/imports
    // Note: unused imports are caught via this rule as unused variables
    "no-unused-vars": [
      "warn",
      { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
    ],
  },
  ignorePatterns: [
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    "coverage/",
    "public/",
  ],
};

