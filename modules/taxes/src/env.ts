import { Env, Modes } from "./types";

export const env = {
  etherscanKey: process.env.ETHERSCAN_KEY,
  logLevel: parseInt(process.env.LOG_LEVEL || "3", 10),
  mode: process.env.NODE_ENV || Modes.example,
  username: process.env.USERNAME || "default",
} as Env;

export const setEnv = (newEnv: Partial<Env>): void =>
  Object.keys(newEnv).forEach(key => env[key] = newEnv[key]);
