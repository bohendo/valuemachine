import { getPrices } from "@finances/core";
import { getLogger } from "@finances/utils";
import express from "express";

import { env } from "./env";
import { chainData } from "./chaindata";
import {
  getLogAndSend,
  globalStore,
  STATUS_MY_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({ module: "Prices" });
export const prices = getPrices({ store: globalStore, logger: log });
let syncing = false;

export const pricesRouter = express.Router();

pricesRouter.get("/", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  if (syncing) {
    return logAndSend(`Price data is already syncing, please wait`);
  }
  syncing = true;
  Promise.race([
    new Promise((res, rej) => setTimeout(() => rej("TimeOut"), 10000)),
    // eslint-disable-next-line no-async-promise-executor
    new Promise(async (res, rej) => {
      try {
        for (const tx of chainData.json.transactions) {
          // TODO: check to address & maybe get price of token too
          await prices.getPrice(tx.timestamp, "ETH");
        }
        syncing = false;
        res(true);
      } catch (e) {
        syncing = false;
        log.warn(`Failed to sync prices: ${e.stack}`);
        rej(e);
      }
    }),
  ]).then(
    (didSync: boolean) => {
      if (didSync) {
        return logAndSend(`Price data is done syncing`);
      }
    },
    (error: any) => {
      if (error === "TimeOut") {
        return logAndSend(`Price data has started syncing, please wait`);
      }
      else {
        return logAndSend(`Price data failed to sync ${error}`, STATUS_MY_BAD);
      }
    },
  ).catch((e) => {
    log.warn(`Encountered an error while syncing prices: ${e.message}`);
    syncing = false;
  });
});
