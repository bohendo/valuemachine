import { StoreKeys } from "@finances/types";
import { getChainData } from "@finances/core";
import express from "express";
import { getAddress, verifyMessage } from "ethers/utils";

import { getStore } from "./store";
import { env } from "./env";

const globalStore = getStore();
const chainData = getChainData({ store: globalStore, logger: console });

const getLogAndSend = (res) => (message): void => {
  console.log(`Sent: ${message}`);
  res.send(message);
  return;
};

const app = express();
app.use(express.json());

////////////////////////////////////////
// First, verify payload signature

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.path} ${JSON.stringify(req.body)}`);
  const logAndSend = getLogAndSend(res);
  const { payload, sig } = req.body;

  if (!payload || !payload.signerAddress) {
    return logAndSend("A payload with signerAddress must be provided");
  }
  if (!sig) {
    return logAndSend("A signature of the api key must be provided");
  }
  let signer;
  try {
    signer = verifyMessage(JSON.stringify(payload), sig);
    if (getAddress(signer) !== getAddress(payload.signerAddress)) {
      throw new Error(`Expected signer address ${payload.signerAddress} but recovered ${signer}`);
    }
  } catch (e) {
    return logAndSend(`Bad signature provided: ${e.message}`);
  }

  return next();
});

app.post("/profile", (req, res) => {
  const logAndSend = getLogAndSend(res);
  const profile = req.body.payload.profile;
  if (!profile) {
    logAndSend(`A profile must be provided`);
  }
  const userStore = getStore(profile.signer);
  const oldProfile  = userStore.load(StoreKeys.Profile);
  userStore.save(StoreKeys.Profile, { ...oldProfile, ...profile });
  return logAndSend(`Profile updated for ${profile.signerAddress}`);
});

app.get("/chaindata", (req, res) => {
  const logAndSend = getLogAndSend(res);
  const address = req.body.payload.address;
  chainData.syncAddressHistory(address);
  logAndSend(`Started syncing history for ${address}`);
});

app.use((req, res) => {
  const code = 404;
  console.log(`${code} not found`);
  return res.sendStatus(code);
});

app.listen(env.port, () => {
  console.log(`Server is listening on port ${env.port}`);
});
