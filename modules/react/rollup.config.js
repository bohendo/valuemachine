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
    NodeResolve({
      preferBuiltins: true,
      browser: true,
    }),
    Json({
      compact: true,
    }),
    Typescript({
      noEmitOnError: true,
      outputToFilesystem: true,
      sourceMap: true,
    }),
    CommonJs(),
  ],
};
