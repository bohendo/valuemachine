/* global process */
import { Env, Modes } from "./types";

export const env = {
  etherscanKey: process.env.ETHERSCAN_KEY,
  logLevel: parseInt(process.env.LOG_LEVEL || "3", 10),
  mode: process.env.NODE_ENV || Modes.example,
  outputFolder: process.env.OUTPUT_FOLDER || process.cwd(),
  taxYear: process.env.TAX_YEAR || (new Date().getUTCFullYear() - 1).toString(),
} as Env;

export const setEnv = (newEnv: Partial<Env>): void =>
  Object.keys(newEnv).forEach(key => env[key] = newEnv[key]);
