import ts from "@rollup/plugin-typescript";
import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import json from "@rollup/plugin-json";

import pkg from "./package.json";

export default {
  input: "./src/entry.ts",
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "esm",
    },
    {
      file: pkg.iife,
      format: "iife",
      name: "window.types",
    },
  ],
  plugins: [
    ts(),
    resolve(),
    json(),
    commonjs({
      include: ["./src/entry.ts", /node_modules/],
    })
  ],
};
