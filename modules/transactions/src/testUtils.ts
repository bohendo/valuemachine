import { getLogger } from "@valuemachine/utils";
import { use } from "chai";
import promised from "chai-as-promised";

use(promised);

export { expect } from "chai";

export const env = {
  logLevel: process.env.LOG_LEVEL || "error",
  etherscanKey: process.env.ETHERSCAN_KEY || "",
  covalentKey: process.env.COVALENT_KEY || "",
};

export const testLogger = getLogger(env.logLevel).child({ module: "TestUtils" });

testLogger.info(env, "starting tx tests in env");
