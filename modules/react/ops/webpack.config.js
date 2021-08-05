const path = require("path");

const webpack = require("webpack");
const nodeExternals = require("webpack-node-externals");

const ENVIRONMENT = process.env.NODE_ENV;
const PRODUCTION = ENVIRONMENT === "production";
const SOURCEMAP = !PRODUCTION || process.env.SOURCEMAP;

const library = "valuemachine-react";
const filename = PRODUCTION ? `${library}.min.js` : `${library}.js`;

const plugins = [];

if (PRODUCTION) {
  plugins.push(
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": JSON.stringify(ENVIRONMENT),
    }),
    new webpack.optimize.ModuleConcatenationPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      minimize: true,
      output: { comments: false, semicolons: false },
      sourceMap: SOURCEMAP,
    })
  );
}

module.exports = {
  mode: "development",
  devtool: SOURCEMAP ? "source-map" : "none",
  target: "web",

  entry: path.resolve(__dirname, "../src/index.ts"),

  output: {
    filename,
    library,
    libraryTarget: "umd",
    path: path.resolve(__dirname, "../dist"),
    umdNamedDefine: true,
  },

  resolve: {
    mainFields: ["main", "module"],
    extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
    symlinks: false,
  },

  externals: ["react", "react-dom", nodeExternals()],

  module: {
    rules: [
      { test: /\.css$/, use: "css-loader", exclude: "/node_modules/" },
      { test: /\.tsx?$/, use: "ts-loader", exclude: "/node_modules/" },
    ],
  },

  plugins,

};
