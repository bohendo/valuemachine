import { Env, Modes } from "./types";

export const env = {
  etherscanKey: process.env.ETHERSCAN_KEY,
  logLevel: process.env.LOG_LEVEL || "info",
  mode: process.env.NODE_ENV || Modes.example,
  username: process.env.USERNAME || "default",
} as Env;

export const setEnv = (newEnv: Partial<Env>): void =>
  Object.keys(newEnv).forEach(key => env[key] = newEnv[key]);
