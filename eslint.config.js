module.exports = [
  {
    ignores: [
      "node_modules/",
      ".next/",
      "dist/",
      "build/",
      "coverage/",
      "public/",
    ],
  },
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        URLSearchParams: "readonly",
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        // Common globals to avoid no-undef across client/server code
        console: "readonly",
        process: "readonly",
        require: "readonly",
        module: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        setTimeout: "readonly",
        URL: "readonly",
        FormData: "readonly",
      },
    },
    settings: { react: { version: "detect" } },
    plugins: {},
    rules: {
      // Only warn for unused variables/functions/imports
      // Note: unused imports are flagged by this rule as unused variables
      "no-unused-vars": [
        "warn",
        { args: "after-used", argsIgnorePattern: "^_", varsIgnorePattern: "^(React|_)" }
      ],
    },
  },
];
