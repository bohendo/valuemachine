import { hexDataLength, isHexString } from "@ethersproject/bytes";
import { getLogger } from "@valuemachine/core";

import { env } from "./env";
import { getStore } from "./store";

const log = getLogger(env.logLevel).child({ module: "Utils" });

export const STATUS_SUCCESS = 200;
export const STATUS_NOT_FOUND = 404;
export const STATUS_YOUR_BAD = 400;
export const STATUS_MY_BAD = 500;

export const globalStore = getStore();

export const getLogAndSend = (res) => (message, code = STATUS_SUCCESS): void => {
  if (code === STATUS_SUCCESS) {
    log.child({ module: "Send" }).info(`Success: ${
      typeof message === "string" ? message : JSON.stringify(message, null, 2)
    }`);
  } else {
    log.child({ module: "Send" }).warn(`Error ${code}: ${message}`);
  }
  res.status(code).send(message);
  return;
};

export const isValidAddress = (value: any): boolean => {
  if (typeof value !== "string") {
    log.info(`value ${value} is not a string`);
    return false;
  } else if (!isHexString(value)) {
    log.info(`value ${value} is not a hex string`);
    return false;
  } else if (hexDataLength(value) !== 20) {
    log.info(`value ${value} is not 20 bytes long`);
    return false;
  }
  return true;
};
