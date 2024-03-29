import CommonJs from "@rollup/plugin-commonjs";
import NodeResolve from "@rollup/plugin-node-resolve";
import Typescript from "@rollup/plugin-typescript";
import TypeDeclarations from "rollup-plugin-dts";

import pkg from "./package.json";

const plugins = [
  NodeResolve(),
  Typescript({
    outputToFilesystem: true,
    tsconfig: "./tsconfig.json",
  }),
  CommonJs({ extensions: [".js", ".ts"] }),
];

export default [
  {
    input: "./src/index.ts",
    output: [
      {
        file: pkg.main,
        format: "cjs",
        sourcemap: true,
      },
      {
        file: pkg.module,
        format: "esm",
        sourcemap: true,
      },
    ],
    external: [/node_modules/, ...Object.keys(pkg.dependencies)],
    plugins,
  },
  {
    input: "./src/example.ts",
    output: {
      file: "./dist/example.js",
      format: "cjs",
      sourcemap: true,
    },
    external: [/node_modules/, ...Object.keys(pkg.dependencies)],
    plugins,
  },
  {
    input: "./dist/.ts.cache/index.d.ts",
    output: [{ file: pkg.types, format: "es" }],
    plugins: [TypeDeclarations()],
  }
];
