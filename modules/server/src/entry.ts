import { StoreKeys } from "@finances/types";
import { getAddressBook, getChainData } from "@finances/core";
import { ContextLogger, LevelLogger } from "@finances/utils";
import express from "express";
import { utils } from "ethers";

import { getStore } from "./store";
import { env } from "./env";

const { getAddress, hexDataLength, isHexString, verifyMessage } = utils;

const globalStore = getStore();
const logger = new LevelLogger(env.logLevel);
const log = new ContextLogger("Index", logger);
const chainData = getChainData({ store: globalStore, logger, etherscanKey: env.etherscanKey  });
const addressBook = getAddressBook([], logger);

log.info(`Starting server in env: ${JSON.stringify(env, null, 2)}`);

chainData.syncTokenData(addressBook.addresses.filter(addressBook.isToken));

////////////////////////////////////////
// Helper Functions

const getLogAndSend = (res) => (message): void => {
  log.info(`Sent: ${message}`);
  res.send(message);
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
// First, verify payload signature

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  log.info(`${req.path} ${JSON.stringify(req.body.payload)}`);
  const logAndSend = getLogAndSend(res);
  const { payload, sig } = req.body;

  if (!payload || !isValidAddress(payload.signerAddress)) {
    return logAndSend("A payload with signerAddress must be provided");
  }
  if (!sig) {
    return logAndSend("A signature of the api key must be provided");
  }
  try {
    const signer = verifyMessage(JSON.stringify(payload), sig);
    if (getAddress(signer) !== getAddress(payload.signerAddress)) {
      throw new Error(`Expected signer address ${payload.signerAddress} but recovered ${signer}`);
    }
  } catch (e) {
    return logAndSend(`Bad signature provided: ${e.message}`);
  }

  return next();
});

////////////////////////////////////////
// Second, take requested action

app.post("/profile", (req, res) => {
  const logAndSend = getLogAndSend(res);
  const payload = req.body.payload;
  if (!payload.profile) {
    return logAndSend(`A profile must be provided`);
  }
  const userStore = getStore(payload.signerAddress);
  const oldProfile  = userStore.load(StoreKeys.Profile);
  userStore.save(StoreKeys.Profile, { ...oldProfile, ...payload.profile });
  return logAndSend(`Profile updated for ${payload.signerAddress}`);
});

app.post("/chaindata", async (req, res) => {
  const logAndSend = getLogAndSend(res);
  const payload = req.body.payload;
  if (!isValidAddress(payload.address)) {
    return logAndSend(`A valid address must be provided, got ${payload.address}`);
  }
  if (syncing.includes(payload.address)) {
    return logAndSend(`Chain data for ${payload.address} is already syncing, please wait`);
  }
  const userStore = getStore(payload.signerAddress);
  const profile = userStore.load(StoreKeys.Profile);
  if (!profile) {
    return logAndSend(`A profile must be registered first`);
  }
  if (!profile.etherscanKey) {
    return logAndSend(`A profile must be registered first`);
  }
  syncing.push(payload.address);
  Promise.race([
    new Promise(res =>
      setTimeout(() => res(false), 1000),
    ),
    new Promise((res, rej) =>
      chainData.syncAddressHistory([payload.address], profile.etherscanKey).then(() => {
        const index = syncing.indexOf(payload.address);
        if (index > -1) {
          syncing.splice(index, 1);
        }
        res(true);
      }).catch((e) => {
        log.warn(`Failed to sync history for ${payload.address}: ${e.stack}`);
        const index = syncing.indexOf(payload.address);
        if (index > -1) {
          syncing.splice(index, 1);
        }
        rej(e);
      }),
    ),
  ]).then((didSync: boolean) => {
    if (didSync) {
      log.info(`Chain data is synced, returning address history`);
      res.json(chainData.getAddressHistory(payload.address).json);
      return;
    }
    return logAndSend(`Chain data for ${payload.address} has started syncing, please wait`);
  }).catch(() => {
    log.warn(`Encountered an error while syncing history for ${payload.address}, try again.`);
    const index = syncing.indexOf(payload.address);
    if (index > -1) {
      syncing.splice(index, 1);
    }

  });
});

////////////////////////////////////////
// End of pipeline

app.use((req, res) => {
  const code = 404;
  log.warn(`${code} not found`);
  return res.sendStatus(code);
});

app.listen(env.port, () => {
  log.info(`Server is listening on port ${env.port}`);
});
