module.exports = {
  env: {
    browser: true,
    node: true,
    es6: true
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:import/errors",
    "plugin:import/typescript",
    "plugin:import/warnings",
    "plugin:react/recommended",
    "react-app",
  ],
  overrides: [
    {
      files: "*.test.ts",
      rules: {
        "@typescript-eslint/no-unused-expressions": "off"
      }
    }
  ],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaFeatures: {
      "jsx": true
    },
    ecmaVersion: 2018,
    sourceType: "module"
  },
  plugins: [
    "@typescript-eslint",
    "import",
    "react",
    "unused-imports",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": "off",
    "comma-dangle": ["error", "only-multiline"],
    "import/order": [
      1,
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
      },
    ],
    "indent": ["error", 2],
    "max-len": ["error", 100],
    "no-control-regex": ["off"],
    "no-loop-func": ["off"],
    "no-undef": ["error"],
    "no-var": ["error"],
    "object-curly-spacing": ["error", "always"],
    "quotes": ["warn", "double", { allowTemplateLiterals: true, avoidEscape: true }],
    "semi": ["error", "always"],
    "unused-imports/no-unused-imports-ts": "warn",
    "unused-imports/no-unused-vars-ts": [
      "warn",
      { "vars": "all", "varsIgnorePattern": "^_", "args": "after-used", "argsIgnorePattern": "^_" },
    ],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
