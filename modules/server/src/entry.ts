import { getAddressBook, getChainData } from "@finances/core";
import { StoreKeys } from "@finances/types";
import { getLogger } from "@finances/utils";
import express from "express";
import { utils } from "ethers";

import { authRouter } from "./auth";
import { getStore } from "./store";
import { env } from "./env";

const STATUS_SUCCESS = 200;
const STATUS_NOT_FOUND = 404;
const STATUS_ERR = 500;

const { hexDataLength, isHexString } = utils;

const globalStore = getStore();
const log = getLogger(env.logLevel).child({ module: "Entry" });
const chainData = getChainData({
  etherscanKey: env.etherscanKey,
  logger: log,
  store: globalStore,
});
const addressBook = getAddressBook([], log);

log.info(`Starting server in env: ${JSON.stringify(env, null, 2)}`);

chainData.syncTokenData(addressBook.addresses.filter(addressBook.isToken));

////////////////////////////////////////
// Helper Functions

const getLogAndSend = (res) => (message, code = STATUS_SUCCESS): void => {
  if (code === STATUS_SUCCESS) {
    log.info(`Success: ${message}`);
  } else {
    log.warn(`Error ${code}: ${message}`);
  }
  res.status(code).send(message);
  return;
};

const isValidAddress = (value: any): boolean => {
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

const syncing = [];

////////////////////////////////////////
// First, authenticate

const app = express();

app.use(authRouter);
app.get("/auth", (req, res) => { res.send("Success"); });

app.use(express.json());

////////////////////////////////////////
// Second, take requested action

app.post("/profile", (req, res) => {
  const logAndSend = getLogAndSend(res);
  const profile = req.body;
  if (!profile) {
    return logAndSend(`A profile must be provided`, STATUS_ERR);
  }
  const userStore = getStore(profile.username);
  const oldProfile  = userStore.load(StoreKeys.Profile);
  userStore.save(StoreKeys.Profile, { ...oldProfile, ...profile });
  return logAndSend(`Profile updated for ${profile.username}`);
});

app.post("/chaindata", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const address = req.body.address;
  if (!isValidAddress(address)) {
    return logAndSend(`A valid address must be provided, got ${address}`, STATUS_ERR);
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
        return logAndSend(`Chain data for ${address} failed to sync ${error}`, STATUS_ERR);
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

////////////////////////////////////////
// End of pipeline

app.use((req, res) => {
  return getLogAndSend(res)(`not found`, STATUS_NOT_FOUND);
});

app.listen(env.port, () => {
  log.info(`Server is listening on port ${env.port}`);
});
