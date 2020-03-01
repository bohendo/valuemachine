/* global process */
import { CapitalGainsMethod, CapitalGainsMethods, Env } from "./types";

export let env: Env = {
  capitalGainsMethod: (
    Object.keys(CapitalGainsMethods).includes(process.env.CAPITAL_GAINS_METHOD)
      ? process.env.CAPITAL_GAINS_METHOD
      : "FIFO"
  ) as CapitalGainsMethod,
  etherscanKey: process.env.ETHERSCAN_KEY,
  logLevel: parseInt(process.env.LOG_LEVEL || "3", 10),
  mode: process.env.NODE_ENV || "development",
  outputFolder: process.env.OUTPUT_FOLDER || process.cwd(),
  taxYear: process.env.TAX_YEAR || (new Date().getUTCFullYear() - 1).toString(),
};

export const setEnv = (newEnv: Partial<Env>): void => {
  env = { ...env, ...newEnv };
};
