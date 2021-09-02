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
      },
      {
        file: pkg.module,
        format: "esm",
      },
    ],
    external: [/node_modules/, ...Object.keys(pkg.dependencies)],
    plugins: [
      Typescript({
        noEmitOnError: true,
        outputToFilesystem: true,
        sourceMap: false,
        tsconfig: "./tsconfig.json"
      }),
    ],
  },
  {
    input: "./dist/.ts.cache/index.d.ts",
    output: [{ file: pkg.types, format: "es" }],
    plugins: [TypeDeclarations()],
  }
];
