import { StoreKeys } from "@finances/types";
import express from "express";

import { getStore } from "./store";
import { getLogAndSend, STATUS_YOUR_BAD } from "./utils";

export const profileRouter = express.Router();

profileRouter.post("/", (req, res) => {
  const logAndSend = getLogAndSend(res);
  const profile = req.body;
  if (!profile) {
    return logAndSend(`A profile must be provided`, STATUS_YOUR_BAD);
  }
  const userStore = getStore(profile.username);
  const oldProfile  = userStore.load(StoreKeys.Profile);
  userStore.save(StoreKeys.Profile, { ...oldProfile, ...profile });
  return logAndSend(`Profile updated for ${profile.username}`);
});
