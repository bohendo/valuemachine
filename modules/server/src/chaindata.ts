import { getAddressBook, getChainData, getLogger } from "@valuemachine/core";
import express from "express";

import { env } from "./env";
import {
  getLogAndSend,
  globalStore,
  isValidAddress,
  STATUS_MY_BAD,
  STATUS_YOUR_BAD,
} from "./utils";

const log = getLogger(env.logLevel).child({ module: "ChainData" });

const syncing = [];
export const chainData = getChainData({
  etherscanKey: env.etherscanKey,
  logger: log,
  store: globalStore,
});

const addressBook = getAddressBook([], log);
chainData.syncTokenData(addressBook.addresses.filter(addressBook.isToken));

export const chainDataRouter = express.Router();

chainDataRouter.get("/:address", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const address = req.params.address;
  if (address === "tokens") {
    res.json(chainData.json.tokens);
    return;
  }
  if (!isValidAddress(address)) {
    return logAndSend(`A valid address must be provided, got ${address}`, STATUS_YOUR_BAD);
  }
  if (syncing.includes(address)) {
    return logAndSend(`Chain data for ${address} is already syncing, please wait`);
  }
  syncing.push(address);
  Promise.race([
    new Promise((res, rej) => setTimeout(() => rej("TimeOut"), 10000)),
    new Promise((res, rej) => chainData.syncAddresses([address], env.etherscanKey)
      .then(() => {
        const index = syncing.indexOf(address);
        if (index > -1) {
          syncing.splice(index, 1);
        }
        res(true);
      })
      .catch((e) => {
        log.warn(`Failed to sync history for ${address}: ${e.stack}`);
        const index = syncing.indexOf(address);
        if (index > -1) {
          syncing.splice(index, 1);
        }
        rej(e);
      }),
    ),
  ]).then(
    (didSync: boolean) => {
      if (didSync) {
        log.info(`Chain data is synced, returning address history`);
        res.json(chainData.getAddressHistory(address).json);
        return;
      }
    },
    (error: any) => {
      if (error === "TimeOut") {
        return logAndSend(`Chain data for ${address} has started syncing, please wait`);
      }
      else {
        return logAndSend(`Chain data for ${address} failed to sync ${error}`, STATUS_MY_BAD);
      }
    },
  ).catch((e) => {
    log.warn(`Encountered an error while syncing history for ${address}: ${e.message}`);
    const index = syncing.indexOf(address);
    if (index > -1) {
      syncing.splice(index, 1);
    }
  });
});
