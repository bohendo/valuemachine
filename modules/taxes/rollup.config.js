import Typescript from "@rollup/plugin-typescript";
import TypeDeclarations from "rollup-plugin-dts";

import pkg from "./package.json";

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
    plugins: [
      Typescript({
        outputToFilesystem: true,
        tsconfig: "./tsconfig.json",
      }),
    ],
  },
  {
    input: "./dist/.ts.cache/index.d.ts",
    output: [{ file: pkg.types, format: "es" }],
    plugins: [TypeDeclarations()],
  }
];
