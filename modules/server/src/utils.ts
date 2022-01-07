import fs from "fs";

import {
  getFileStore,
  getLogger,
} from "valuemachine";

import { env } from "./env";

export const log = getLogger(env.logLevel).child({ name: "Utils" });

export const STATUS_SUCCESS = 200;
export const STATUS_NOT_FOUND = 404;
export const STATUS_YOUR_BAD = 400;
export const STATUS_MY_BAD = 500;

export const store = getFileStore("/data", fs);

export const getLogAndSend = (res) => (message, code = STATUS_SUCCESS): void => {
  if (code === STATUS_SUCCESS) {
    log.child({ name: "Send" }).info(`Success: ${
      typeof message === "string" ? message : JSON.stringify(message, null, 2)
    }`);
  } else {
    log.child({ name: "Send" }).warn(`Error ${code}: ${message}`);
  }
  res.status(code).send(message);
  return;
};
