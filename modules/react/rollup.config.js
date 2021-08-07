import CommonJs from "@rollup/plugin-commonjs";
import Json from "@rollup/plugin-json";
import NodeResolve from "@rollup/plugin-node-resolve";
import Typescript from "@rollup/plugin-typescript";

import pkg from "./package.json";

export default {
  input: "./src/index.ts",
  output: [{
    file: pkg.main,
    format: "cjs",
  }],
  onwarn: (warning, warn) => {
    // Ignore known warnings
    const fromPkg = (pkgName) => warning.id.startsWith(`/root/node_modules/${pkgName}`);
    if (warning.code === "THIS_IS_UNDEFINED" && fromPkg("@ethersproject")) return;
    if (warning.code === "EVAL" && fromPkg("depd")) return;
    warn(warning);
  },
  plugins: [
    NodeResolve({
      exportConditions: ["node"],
      preferBuiltins: true,
    }),
    Typescript({
      noEmitOnError: true,
      outputToFilesystem: true,
      sourceMap: false,
    }),
    Json({
      compact: true,
    }),
    CommonJs({
      include: ["./src/index.ts", /node_modules/],
    }),
  ],
};
