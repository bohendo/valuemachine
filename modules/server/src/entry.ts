import { getAddressBook, getChainData } from "@finances/core";
import { StoreKeys } from "@finances/types";
import { getLogger } from "@finances/utils";
import express from "express";
import { utils } from "ethers";

import { getStore } from "./store";
import { env } from "./env";

const STATUS_SUCCESS = 200;
const STATUS_NOT_FOUND = 404;
const STATUS_ERR = 500;

const { getAddress, hexDataLength, isHexString, verifyMessage } = utils;

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
// First, verify payload signature

const app = express();
app.use(express.json());

app.use((req, res, next) => {
  log.info(`${req.path} ${JSON.stringify(req.body.payload)}`);
  const logAndSend = getLogAndSend(res);
  const { payload, sig } = req.body;

  if (!payload || !isValidAddress(payload.signerAddress)) {
    return logAndSend("A payload with signerAddress must be provided", STATUS_ERR);
  }
  if (!sig) {
    return logAndSend("A signature of the api key must be provided", STATUS_ERR);
  }
  try {
    const signer = verifyMessage(JSON.stringify(payload), sig);
    if (getAddress(signer) !== getAddress(payload.signerAddress)) {
      throw new Error(`Expected signer address ${payload.signerAddress} but recovered ${signer}`);
    }
  } catch (e) {
    return logAndSend(`Bad signature provided: ${e.message}`, STATUS_ERR);
  }

  return next();
});

////////////////////////////////////////
// Second, take requested action

app.post("/profile", (req, res) => {
  const logAndSend = getLogAndSend(res);
  const payload = req.body.payload;
  if (!payload.profile) {
    return logAndSend(`A profile must be provided`, STATUS_ERR);
  }
  // Let the admin token act an etherscan key
  if (payload.profile.etherscanKey === env.adminToken) {
    log.info(`Admin token detected, using the server's api key`);
    payload.profile.etherscanKey = env.etherscanKey;
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
    return logAndSend(`A valid address must be provided, got ${payload.address}`, STATUS_ERR);
  }
  if (syncing.includes(payload.address)) {
    return logAndSend(`Chain data for ${payload.address} is already syncing, please wait`);
  }
  const userStore = getStore(payload.signerAddress);
  const profile = userStore.load(StoreKeys.Profile);
  if (!profile || !profile.etherscanKey) {
    return logAndSend(`A profile with an etherscan API key must be registered first`, STATUS_ERR);
  }
  log.info(`Profile ${payload.address} has api key ${profile.etherscanKey}`);
  syncing.push(payload.address);
  Promise.race([
    new Promise((res, rej) => setTimeout(() => rej("TimeOut"), 10000)),
    new Promise((res, rej) => chainData.syncAddresses([payload.address], profile.etherscanKey)
      .then(() => {
        const index = syncing.indexOf(payload.address);
        if (index > -1) {
          syncing.splice(index, 1);
        }
        res(true);
      })
      .catch((e) => {
        log.warn(`Failed to sync history for ${payload.address}: ${e.stack}`);
        const index = syncing.indexOf(payload.address);
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
        res.json(chainData.getAddressHistory(payload.address).json);
        return;
      }
    },
    (error: any) => {
      if (error === "TimeOut") {
        return logAndSend(`Chain data for ${payload.address} has started syncing, please wait`);
      }
      else {
        return logAndSend(`Chain data for ${payload.address} failed to sync ${error}`, STATUS_ERR);
      }
    },
  ).catch((e) => {
    log.warn(`Encountered an error while syncing history for ${payload.address}: ${e.message}`);
    const index = syncing.indexOf(payload.address);
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
