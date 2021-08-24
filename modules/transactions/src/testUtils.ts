import { getLogger } from "@valuemachine/utils";
import { use } from "chai";
import promised from "chai-as-promised";

use(promised);

export { expect } from "chai";

export const env = {
  covalentKey: process.env.COVALENT_KEY || "",
  etherscanKey: process.env.ETHERSCAN_KEY || "",
  logLevel: process.env.LOG_LEVEL || "error",
};

export const testLogger = getLogger(env.logLevel).child({ module: "TestUtils" });

testLogger.info(env, "starting tx tests in env");
