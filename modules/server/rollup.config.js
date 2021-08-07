import CommonJs from "@rollup/plugin-commonjs";
import Json from "@rollup/plugin-json";
import NodeResolve from "@rollup/plugin-node-resolve";
import Typescript from "@rollup/plugin-typescript";
//import NodeBuiltins from "rollup-plugin-node-builtins";
//import NodeGlobals from "rollup-plugin-node-globals";
//import NodePolyfills from "rollup-plugin-node-polyfills";

import pkg from "./package.json";

export default {
  input: "./src/entry.ts",
  output: [{
    file: pkg.main,
    format: "cjs",
    sourcemap: true,
  }],
  plugins: [
    NodeResolve({
      browser: false,
      exportConditions: ["node"],
      mainFields: ["module", "main"],
      preferBuiltins: true,
    }),
    Typescript({
      outputToFilesystem: true,
      sourceMap: true,
      target: "es6",
    }),
    Json({
      compact: true,
      preferConst: false,
      namedExports: false,
    }),
    CommonJs({
      include: ["./src/entry.ts", /node_modules/],
      // ignore: ["os", "stream"],
      // ignoreDynamicRequires: true,
      // requireReturnsDefault: "namespace",
      // transformMixedEsModules: true,
    }),
    //NodeGlobals(),
    //NodeBuiltins(),
    //NodePolyfills(),
  ],
};
