const ignore = "^_";

module.exports = {
  root: true,
  env: {
    browser: true,
    es6: true,
    mocha: true,
    node: true,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:import/errors",
    "plugin:import/typescript",
    "plugin:import/warnings",
    "plugin:react/recommended",
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
    "mocha",
    "react",
    "unused-imports",
  ],
  rules: {
    "@typescript-eslint/no-unused-vars": ["warn", {
      varsIgnorePattern: ignore,
      argsIgnorePattern: ignore,
    }],
    "@typescript-eslint/no-redeclare": "off",
    "comma-dangle": ["warn", "only-multiline"],
    "import/no-anonymous-default-export": "off",
    "import/order": [
      1,
      {
        groups: ["builtin", "external", "internal", "parent", "sibling", "index"],
        "newlines-between": "always",
      },
    ],
    "indent": ["warn", 2, { flatTernaryExpressions: true }],
    "max-len": ["warn", 100, { ignoreStrings: true, ignoreTemplateLiterals: true }],
    "no-async-promise-executor": ["warn"],
    "no-constant-condition": ["warn"],
    "no-control-regex": ["off"],
    "no-loop-func": ["off"],
    "no-undef": ["warn"],
    "no-useless-computed-key": ["off"],
    "no-unused-vars": ["off"],
    "no-var": ["warn"],
    "prefer-const": ["warn"],
    "object-curly-spacing": ["warn", "always"],
    "quotes": ["warn", "double", { allowTemplateLiterals: true, avoidEscape: true }],
    "semi": ["warn", "always"],
    "unused-imports/no-unused-imports-ts": "warn",
    "unused-imports/no-unused-vars-ts": ["warn", {
      "vars": "all",
      "varsIgnorePattern": ignore,
      "args": "after-used",
      "argsIgnorePattern": ignore,
    }],
  },
  settings: {
    react: {
      version: "detect",
    },
  },
};
