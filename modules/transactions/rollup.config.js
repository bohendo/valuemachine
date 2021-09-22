import NodeResolve from "@rollup/plugin-node-resolve";
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
      NodeResolve(),
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
    onwarn: (warning, warn) => {
      if (warning.code === "UNUSED_EXTERNAL_IMPORT" && warning.source === "@valuemachine/types") {
        return; // idk where this warning is coming from but it doesn't seem important..
      }
      warn(warning);
    },
  }
];
