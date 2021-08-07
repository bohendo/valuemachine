import CommonJs from "@rollup/plugin-commonjs";
import Json from "@rollup/plugin-json";
import NodeResolve from "@rollup/plugin-node-resolve";
import Typescript from "@rollup/plugin-typescript";

import pkg from "./package.json";

export default {
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
  external: Object.keys(pkg.dependencies),
  plugins: [
    NodeResolve(),
    Json({
      compact: true,
    }),
    Typescript({
      noEmitOnError: true,
      outputToFilesystem: true,
      sourceMap: false,
    }),
    CommonJs(),
  ],
};
