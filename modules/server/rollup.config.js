import CommonJs from "@rollup/plugin-commonjs";
import Replace from "@rollup/plugin-replace";
import Json from "@rollup/plugin-json";
import NodeResolve from "@rollup/plugin-node-resolve";
import Typescript from "@rollup/plugin-typescript";

import pkg from "./package.json";

// NOTE: this config includes a hacky fix to handle the circular dependencies of readable-stream
// for more info see: https://github.com/rollup/rollup/issues/1507#issuecomment-340550539

export default {
  input: "./src/entry.ts",
  output: [{
    file: pkg.main,
    format: "cjs",
    sourcemap: true,
  }],
  onwarn: (warning, warn) => {
    // Ignore known warnings
    const fromPkg = (pkgName) => warning.id?.startsWith(`/root/node_modules/${pkgName}`);
    if (warning.code === "THIS_IS_UNDEFINED" && fromPkg("@ethersproject")) return;
    if (warning.code === "EVAL" && fromPkg("depd")) return;
    warn(warning);
  },
  external: ["readable-stream", "readable-stream/transform"],
  plugins: [
    NodeResolve({
      exportConditions: ["node"],
      preferBuiltins: true,
    }),
    Replace({
      delimiters: ["", ""],
      preventAssignment: true,
      values: {
        "require('readable-stream/transform')": "require('stream').Transform",
        'require("readable-stream/transform")': 'require("stream").Transform',
        "readable-stream": "stream"
      }
    }),
    Json({ compact: true }),
    Typescript({
      outputToFilesystem: true,
      tsconfig: "./tsconfig.json",
    }),
    CommonJs({
      include: ["./src/entry.ts", /node_modules/],
      transformMixedEsModules: true,
    }),
  ],
};
